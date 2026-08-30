// redFlags - Layer 1, deterministic safety rules.
// A fixed list of hard danger signs (critical hypoxia, altered consciousness,
// age-banded extreme vitals, hypotension, hard-stop fever, red-flag
// complaints). If any fires, the patient is escalated immediately and the
// scoring layer is skipped. Every fired rule names itself for explainability.

import { getAgeBand, DANGER_ZONE, CRITICAL_SPO2, BAND_META } from "./thresholds";

// Chief-complaint phrases that force Level 1 regardless of vitals.
// In production this becomes a proper clinical ontology (SNOMED CT / ICPC-2)
// with negation handling; a keyword list is honest scaffolding for a prototype.
export const CRITICAL_COMPLAINT_KEYWORDS = [
  { term: "chest pain",           pathway: "Cardiac" },
  { term: "chest tightness",      pathway: "Cardiac" },
  { term: "crushing",             pathway: "Cardiac" },
  { term: "face drooping",        pathway: "Stroke" },
  { term: "slurred speech",       pathway: "Stroke" },
  { term: "weakness one side",    pathway: "Stroke" },
  { term: "stroke",               pathway: "Stroke" },
  { term: "difficulty breathing", pathway: "Respiratory" },
  { term: "shortness of breath",  pathway: "Respiratory" },
  { term: "short of breath",      pathway: "Respiratory" },
  { term: "unconscious",          pathway: "Resuscitation" },
  { term: "unresponsive",         pathway: "Resuscitation" },
  { term: "seizure",              pathway: "Neurological" },
  { term: "fitting",              pathway: "Neurological" },
  { term: "severe bleeding",      pathway: "Haemorrhage" },
  { term: "anaphylaxis",          pathway: "Anaphylaxis" },
  { term: "overdose",             pathway: "Toxicology" },
];

/**
 * Evaluate every Layer 1 rule against a patient.
 * @returns {{ fired: boolean, reasons: string[], pathway: string|null, rules: string[] }}
 */
export function checkRedFlags(patient) {
  const reasons = [];
  const rules = [];
  let pathway = null;

  const band = getAgeBand(patient.age);
  const dz = DANGER_ZONE[band] || DANGER_ZONE.adult;
  const bandLabel = (BAND_META[band]?.label || band).toLowerCase();
  // "a infant" reads as a bug even when the logic is right.
  const aBand = `${/^[aeiou]/.test(bandLabel) ? "an" : "a"} ${bandLabel}`;
  const v = patient.vitals || {};

  const fire = (rule, reason) => {
    rules.push(rule);
    reasons.push(reason);
  };

  // --- Critical hypoxia: universal hard stop ---
  if (v.spo2 != null && v.spo2 <= CRITICAL_SPO2) {
    fire("RF-SPO2", `Critical low oxygen: SpO2 ${v.spo2}% (at or below ${CRITICAL_SPO2}%)`);
    pathway = pathway || "Respiratory";
  }

  // --- Altered consciousness: universal hard stop ---
  if (v.consciousness && v.consciousness !== "alert") {
    const map = {
      confusion: "new confusion",
      voice: "responds to voice only",
      pain: "responds to pain only",
      unresponsive: "unresponsive",
    };
    fire("RF-ACVPU", `Altered consciousness: ${map[v.consciousness] || v.consciousness}, not alert`);
    pathway = pathway || "Resuscitation";
  }

  // --- Respiratory rate outside the danger zone for this age band ---
  if (v.respRate != null) {
    if (v.respRate >= dz.rrHigh) {
      fire("RF-RR-HIGH", `Dangerously fast breathing for ${aBand}: ${v.respRate}/min (danger zone ${dz.rrHigh}+)`);
      pathway = pathway || "Respiratory";
    } else if (v.respRate <= dz.rrLow) {
      fire("RF-RR-LOW", `Dangerously slow breathing for ${aBand}: ${v.respRate}/min (danger zone ${dz.rrLow} or below)`);
      pathway = pathway || "Respiratory";
    }
  }

  // --- Heart rate outside the danger zone for this age band ---
  if (v.heartRate != null) {
    if (v.heartRate >= dz.hrHigh) {
      fire("RF-HR-HIGH", `Dangerously fast heart rate for ${aBand}: ${v.heartRate} bpm (danger zone ${dz.hrHigh}+)`);
    } else if (v.heartRate <= dz.hrLow) {
      fire("RF-HR-LOW", `Dangerously slow heart rate for ${aBand}: ${v.heartRate} bpm (danger zone ${dz.hrLow} or below)`);
    }
  }

  // --- Hypotension, age-aware ---
  if (v.sbp != null && v.sbp <= dz.sbpLow) {
    fire("RF-BP-LOW", `Low blood pressure: systolic ${v.sbp} mmHg (at or below ${dz.sbpLow} for ${aBand})`);
    pathway = pathway || "Shock";
  }

  // --- Fever hard stop, paediatric only ---
  // A temperature that is a graded finding in an adult is a hard stop in an
  // infant. dz.tempHigh is null for adults, so this rule simply never applies.
  if (dz.tempHigh != null && v.temp != null && v.temp >= dz.tempHigh) {
    fire("RF-TEMP", `Fever at a hard-stop threshold for ${aBand}: ${v.temp} °C (${dz.tempHigh} °C or above)`);
    pathway = pathway || "Sepsis";
  }

  // --- Critical complaint phrases ---
  if (patient.complaint) {
    const c = String(patient.complaint).toLowerCase();
    const hit = CRITICAL_COMPLAINT_KEYWORDS.find((k) => c.includes(k.term));
    if (hit) {
      fire("RF-COMPLAINT", `Red-flag complaint: "${hit.term}"`);
      pathway = hit.pathway;
    }
  }

  return { fired: reasons.length > 0, reasons, rules, pathway };
}
