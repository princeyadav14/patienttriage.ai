// triageEngine - the core scoring pipeline.
// Two layers behind a single contract (patient in, {acuity, drivers,
// confidence, safety} out):
//   Layer 1 (redFlags.js): deterministic hard stops -> highest acuity.
//   Layer 2 (here): age-banded weighted score mapped to a 1-5 acuity level.
// Also computes confidence, applies safety ceilings (severe pain, sick
// appearance), a geriatric vulnerability weighting, and a bias-to-escalation
// rule that rounds toward the more urgent level under low confidence.

import SITE from "../config/site";
import {
  AGE_BANDS,
  BAND_META,
  getAgeBand,
  getScorers,
  isPaediatric,
  scoreOxygenSupport,
  GERIATRIC_VULNERABILITY_FACTOR,
  NORMAL_RANGES,
  VITAL_LABELS,
  VITAL_UNITS,
  SCORED_VITALS,
} from "./thresholds";
import { checkRedFlags } from "./redFlags";
import { deriveAmbiguity } from "./ambiguity";

// NEWS2 risk bands translated to the 5-level ESI-style scale used in EDs.
//
// CALIBRATION NOTE: this mapping was wrong in the first cut and the fix
// matters. Mapping NEWS2 "high risk" (7+) straight onto Level 1 put nine of
// twenty-one test patients into resus, including a breathless 78-year-old with
// a chest infection. Level 1 in ESI does not mean "very unwell"; it means
// "needs a life-saving intervention right now": intubation, CPR, immediate
// haemodynamic rescue: and it should be 1-3% of arrivals, not 40%.
//
// So Level 1 is now almost entirely the DETERMINISTIC layer's to give. A score
// alone has to be extreme (9+) to declare a resuscitation. That is the design
// claim stated as arithmetic: Level 1 is a determination, not a score.
function aggregateToAcuity(aggregate, anySingleThree) {
  if (aggregate >= 9) return 1;
  if (aggregate >= 5 || anySingleThree) return 2;
  if (aggregate >= 3) return 3;
  if (aggregate >= 1) return 4;
  return 5;
}

// The acuity boundaries in aggregate space: 1 → L4, 3 → L3, 5 → L2, 9 → L1.
const ACUITY_EDGES = [1, 3, 5, 9];

/**
 * How close is this score to tipping into the next higher acuity level?
 * Measured one-directionally (points from the next level up) and widened when
 * vitals are missing, since an unrecorded vital could only have added points.
 * A small distance means the case is near a boundary, which lowers confidence.
 */
function boundaryProximity(aggregate, missingVitals) {
  // A completely normal patient is not "borderline". Aggregate 0 sits one point
  // below Level 4 purely because that is where the scale starts, and treating
  // that as uncertainty made every healthy patient Medium confidence.
  if (aggregate === 0 && missingVitals === 0) return { distance: 1, near: false };

  const nextEdge = ACUITY_EDGES.find((e) => e > aggregate);
  if (nextEdge == null) return { distance: Infinity, near: false }; // already Level 1
  const distance = nextEdge - aggregate;
  return { distance, near: distance <= 1 + missingVitals };
}

/**
 * Confidence model. Confidence falls as information gets thinner or noisier.
 * Returns { level, score, reasons } where score is 1..3 for the meter.
 */
function computeConfidence({ ambiguity, history, missingVitals, nearBoundary, vitalsStale }) {
  const reasons = [];
  let penalty = 0;

  if (ambiguity.score >= 2) {
    penalty += 2;
    reasons.push(`presentation is hard to place (${ambiguity.signals.length} signals)`);
  } else if (ambiguity.score === 1) {
    penalty += 1;
    reasons.push(ambiguity.signals[0]?.detail || "presentation is hard to place");
  }

  if (history === "first-time") {
    penalty += 1;
    reasons.push("first attendance, no prior record on file");
  }

  if (missingVitals >= 2) {
    penalty += 2;
    reasons.push(`${missingVitals} vitals not recorded`);
  } else if (missingVitals === 1) {
    penalty += 1;
    reasons.push("1 vital not recorded");
  }

  if (nearBoundary) {
    penalty += 1;
    reasons.push("score sits on a level boundary");
  }

  if (vitalsStale) {
    penalty += 1;
    reasons.push(`vitals older than ${SITE.safety.staleVitalsMinutes} minutes`);
  }

  const level = penalty >= 2 ? "Low" : penalty === 1 ? "Medium" : "High";
  const score = level === "High" ? 3 : level === "Medium" ? 2 : 1;

  if (reasons.length === 0) reasons.push("complete data, clear signal");
  return { level, score, reasons, penalty };
}

// band. This is what prevents "slow heart rate" at 98 bpm, and what lets the UI
// say a pulse of 138 is normal for a three-year-old.
function describe(vital, value, band) {
  const range = (NORMAL_RANGES[band] || NORMAL_RANGES.adult)[vital];
  const low = range ? value < range[0] : false;
  switch (vital) {
    case "spo2":      return "Low oxygen";
    case "respRate":  return low ? "Slow breathing" : "Fast breathing";
    case "heartRate": return low ? "Slow heart rate" : "Fast heart rate";
    case "sbp":       return low ? "Low blood pressure" : "High blood pressure";
    case "temp":      return low ? "Low temperature" : "Fever";
    default:          return `Abnormal ${VITAL_LABELS[vital] || vital}`;
  }
}

const driver = (kind, text, detail, weight = null, severity = 0) => ({
  kind, text, detail, weight, severity,
});

/**
 * Assess one patient.
 * @param {object} patient
 * @param {object} [opts]
 * @param {number} [opts.vitalsAgeMinutes] how old the vitals reading is
 */
export function triage(patient, opts = {}) {
  const { vitalsAgeMinutes = 0 } = opts;
  const band = getAgeBand(patient.age);
  const bandLabel = BAND_META[band]?.label || band;
  const v = patient.vitals || {};
  const vitalsStale = vitalsAgeMinutes > SITE.safety.staleVitalsMinutes;

  const base = {
    patientId: patient.id,
    mrn: patient.mrn || null,
    name: patient.name,
    age: patient.age,
    ageBand: band,
    bandLabel,
    computedAt: Date.now(),
  };

  // ---- data completeness (drives confidence, and is shown to the nurse) ----
  const expected = SCORED_VITALS.length + 1; // + consciousness
  const missing = SCORED_VITALS.filter((k) => v[k] == null).map((k) => VITAL_LABELS[k]);
  if (v.consciousness == null) missing.push(VITAL_LABELS.consciousness);
  const present = expected - missing.length;
  const dataCompleteness = {
    present,
    expected,
    pct: Math.round((present / expected) * 100),
    missing,
    hasRecord: patient.history !== "first-time",
  };

    const rf = checkRedFlags(patient);
  if (rf.fired) {
    return {
      ...base,
      acuity: 1,
      acuityBeforeSafety: 1,
      decidedBy: "rule-layer",
      pathway: rf.pathway,
      drivers: rf.reasons.slice(0, 4).map((r, i) => driver("redflag", r, null, null, 3 - Math.min(i, 1))),
      // Rule-layer decisions are high confidence BY CONSTRUCTION: they are
      // deterministic hard stops, not probabilistic estimates.
      confidence: {
        level: "High",
        score: 3,
        reasons: ["deterministic red-flag rule, independent of the model"],
        penalty: 0,
      },
      ambiguity: { score: 0, ambiguous: false, signals: [] },
      aggregateScore: null,
      contributions: [],
      dataCompleteness,
      redFlags: rf.rules,
      safety: { escalated: false, ceilingApplied: false, reasons: [] },
    };
  }

    const scorers = getScorers(band);
  const contributions = [];
  let anySingleThree = false;

  for (const key of SCORED_VITALS) {
    const val = v[key];
    if (val == null) continue; // missing -> skipped here, penalised in confidence
    const subscore = scorers[key](val);
    if (subscore === 3) anySingleThree = true;
    if (subscore > 0) {
      contributions.push({
        vital: key,
        label: VITAL_LABELS[key],
        unit: VITAL_UNITS[key],
        value: val,
        subscore,
        normal: (NORMAL_RANGES[band] || NORMAL_RANGES.adult)[key],
      });
    }
  }

  // Supplemental oxygen: NEWS2 weights this at 2 points.
  if (v.onOxygen) {
    contributions.push({
      vital: "onOxygen",
      label: VITAL_LABELS.onOxygen,
      unit: "",
      value: "yes",
      subscore: scoreOxygenSupport(true),
      normal: null,
    });
  }

  let aggregate = contributions.reduce((s, c) => s + c.subscore, 0);
  const rawAggregate = aggregate;

  // Geriatric vulnerability: mild abnormalities carry more risk in a frail
  // older patient. Applied to the aggregate only: never to the hard rules,
  // and it can only ever push UP.
  let geriatricUplift = false;
  if (band === AGE_BANDS.GERIATRIC && aggregate > 0) {
    const lifted = Math.round(aggregate * GERIATRIC_VULNERABILITY_FACTOR);
    if (lifted > aggregate) {
      aggregate = lifted;
      geriatricUplift = true;
    }
  }

  let acuity = aggregateToAcuity(aggregate, anySingleThree);
  const acuityFromScore = acuity;

  const { near: nearBoundary, distance: boundaryDistance } = boundaryProximity(
    aggregate,
    missing.length
  );

  const ambiguity = deriveAmbiguity(patient, {
    missingVitals: missing.length,
    aggregate,
  });

  const confidence = computeConfidence({
    ambiguity,
    history: patient.history,
    missingVitals: missing.length,
    nearBoundary,
    vitalsStale,
  });

    const safetyReasons = [];
  let ceilingApplied = false;
  let escalated = false;

  // (a) ESI decision point B: severe pain is an ESI-2 criterion on its own.
  if (patient.pain != null && patient.pain >= SITE.safety.severePainScore) {
    const ceiling = SITE.safety.severePainCeilingAcuity;
    if (acuity > ceiling) {
      acuity = ceiling;
      ceilingApplied = true;
      safetyReasons.push(
        `Severe pain reported (${patient.pain}/10): capped at Level ${ceiling} under ESI decision point B, regardless of vitals`
      );
    }
  }

  // (b) The nurse's eyes outrank the numbers. "Looks sick" is the finding that
  // catches the well-appearing ill, and no monitor produces it.
  if (patient.appearance === "sick") {
    const ceiling = SITE.safety.sickAppearanceCeilingAcuity;
    if (acuity > ceiling) {
      acuity = ceiling;
      ceilingApplied = true;
      safetyReasons.push(
        `Nurse recorded the patient as sick-looking: capped at Level ${ceiling}. Clinical appearance outranks the score.`
      );
    }
  }

  // (c) Escalate under uncertainty: the asymmetric cost of under-triage,
  //
  // Two triggers, both one-directional:
  //   · Low confidence, full stop. If we cannot trust the score, we do not get
  //     to keep the comfortable answer.
  //   · Medium confidence in a vulnerable band (paediatric or geriatric) when
  //     the score is within reach of the next level. Children and frail older
  //     patients deteriorate faster and hide it better, so they get the benefit
  //     of the doubt sooner.
  //
  // AND ONE HARD LIMIT: uncertainty can never produce a Level 1. Level 1 means
  // "needs a life-saving intervention now": that is a determination, and a
  // determination cannot be reached by hedging. Only the deterministic rule
  // layer, or an extreme score, gets to declare a resuscitation.
  const vulnerable = band === AGE_BANDS.GERIATRIC || isPaediatric(band);
  const escalateForUncertainty =
    confidence.level === "Low" ||
    (confidence.level === "Medium" && vulnerable && nearBoundary);

  if (escalateForUncertainty && acuity > 2) {
    const from = acuity;
    acuity -= 1;
    escalated = true;
    safetyReasons.push(
      confidence.level === "Low"
        ? `Escalated ${from} → ${acuity}: confidence is low, so the benefit of the doubt goes to the patient. This system moves up under uncertainty, never down.`
        : `Escalated ${from} → ${acuity}: ${bandLabel.toLowerCase()} patient, ${boundaryDistance} point from the next level, and confidence is only moderate.`
    );
  }

  // ---- build drivers, heaviest first --------------------------------------
  contributions.sort((a, b) => b.subscore - a.subscore);
  const drivers = contributions.slice(0, 4).map((c) => {
    if (c.vital === "onOxygen") {
      return driver("vital", "On supplemental oxygen", "NEWS2 weights any oxygen requirement at 2 points", c.subscore, c.subscore);
    }
    const normalText = c.normal ? `normal ${c.normal[0]}–${c.normal[1]} for ${bandLabel.toLowerCase()}` : null;
    return driver(
      "vital",
      `${describe(c.vital, c.value, band)}: ${c.value}${c.unit ? " " + c.unit : ""}`,
      normalText,
      c.subscore,
      c.subscore
    );
  });

  if (geriatricUplift) {
    drivers.push(
      driver(
        "weighting",
        `Age weighting applied: aggregate ${rawAggregate} to ${aggregate}`,
        `Mild abnormalities carry more risk at ${patient.age}. Without this the level would be ${aggregateToAcuity(rawAggregate, anySingleThree)}.`
      )
    );
  }

  for (const r of safetyReasons) drivers.push(driver("safety", r, null));

  if (drivers.length === 0) {
    drivers.push(driver("normal", `All vitals normal for ${bandLabel.toLowerCase()}`, "nothing to flag"));
  }

  return {
    ...base,
    acuity,
    acuityBeforeSafety: acuityFromScore,
    decidedBy: "scoring-layer",
    pathway: null,
    drivers,
    confidence,
    ambiguity,
    aggregateScore: aggregate,
    rawAggregate,
    geriatricUplift,
    nearBoundary,
    boundaryDistance,
    contributions,
    dataCompleteness,
    redFlags: [],
    safety: { escalated, ceilingApplied, reasons: safetyReasons },
  };
}

export { aggregateToAcuity };
export default triage;
