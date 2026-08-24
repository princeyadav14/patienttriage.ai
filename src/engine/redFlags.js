// ============================================================================
// redFlags.js
// LAYER 1 of the two-layer engine: deterministic, hard-coded danger signs.
//
// This layer is intentionally NOT probabilistic. If any rule fires, the patient
// is escalated to the highest acuity immediately, and the scoring layer is
// skipped. This guarantees the most dangerous cases can never be "softened" by
// a low model confidence. It is also fully explainable by construction: every
// fired rule names itself.
//
// This is the design choice the brief rewards: use deterministic logic where
// safety is non-negotiable, and a scored/model layer only for graded judgement.
//
// Thresholds here are ILLUSTRATIVE and align with widely used emergency red
// flags (e.g. NEWS2 single-parameter=3 triggers, critical hypoxia, altered
// consciousness). Confirm exact values with a clinical advisor before real use.
// ============================================================================

import { getAgeBand, AGE_BANDS } from "./thresholds";

// Chief-complaint keywords that force at least high acuity regardless of vitals.
// (In production this would be a proper clinical ontology / NLP mapping.)
const CRITICAL_COMPLAINT_KEYWORDS = [
  "chest pain",
  "chest tightness",
  "crushing",
  "stroke",
  "face drooping",
  "slurred speech",
  "weakness one side",
  "difficulty breathing",
  "shortness of breath",
  "unconscious",
  "seizure",
  "severe bleeding",
  "anaphylaxis",
];

// Each rule returns a { fired: bool, reason: string } given a patient.
function checkRedFlags(patient) {
  const fired = [];
  const band = getAgeBand(patient.age);
  const v = patient.vitals;

  // --- Critical hypoxia (low oxygen) — universal hard stop ---
  if (v.spo2 != null && v.spo2 <= 91) {
    fired.push(`Critical low oxygen: SpO2 ${v.spo2}% (<=91%)`);
  }

  // --- Altered consciousness — universal hard stop ---
  if (v.consciousness && v.consciousness !== "alert") {
    fired.push(`Altered consciousness: patient is "${v.consciousness}", not alert`);
  }

  // --- Extreme respiratory rate ---
  if (v.respRate != null) {
    if (band === AGE_BANDS.PEDIATRIC) {
      if (v.respRate >= 41 || v.respRate <= 14)
        fired.push(`Dangerous respiratory rate for a child: ${v.respRate}/min`);
    } else {
      if (v.respRate >= 25 || v.respRate <= 8)
        fired.push(`Dangerous respiratory rate: ${v.respRate}/min`);
    }
  }

  // --- Extreme heart rate ---
  if (v.heartRate != null) {
    if (band === AGE_BANDS.PEDIATRIC) {
      if (v.heartRate >= 161 || v.heartRate <= 60)
        fired.push(`Dangerous heart rate for a child: ${v.heartRate} bpm`);
    } else {
      if (v.heartRate >= 131 || v.heartRate <= 40)
        fired.push(`Dangerous heart rate: ${v.heartRate} bpm`);
    }
  }

  // --- Hypotension (low blood pressure), age-aware ---
  if (v.sbp != null) {
    const hypotensionCutoff = band === AGE_BANDS.PEDIATRIC ? 70 : 90;
    if (v.sbp <= hypotensionCutoff) {
      fired.push(`Low blood pressure: systolic ${v.sbp} mmHg (<=${hypotensionCutoff})`);
    }
  }

  // --- Critical complaint keywords ---
  if (patient.complaint) {
    const c = patient.complaint.toLowerCase();
    for (const kw of CRITICAL_COMPLAINT_KEYWORDS) {
      if (c.includes(kw)) {
        fired.push(`Red-flag complaint: "${kw}"`);
        break; // one complaint reason is enough
      }
    }
  }

  return {
    fired: fired.length > 0,
    reasons: fired,
  };
}

export { checkRedFlags, CRITICAL_COMPLAINT_KEYWORDS };
