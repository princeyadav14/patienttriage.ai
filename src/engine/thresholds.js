// ============================================================================
// thresholds.js
// Clinical thresholds for the triage scoring engine.
//
// SOURCE OF TRUTH:
//   Adult vitals scoring follows NEWS2 (National Early Warning Score 2),
//   Royal College of Physicians (2017). This is an internationally recognised
//   standard used across the NHS and widely in ED research.
//
//   Pediatric adjustments are simplified, illustrative bands inspired by PEWS
//   (Paediatric Early Warning Score) principles: children have HIGHER normal
//   heart/respiratory rates, so adult thresholds would wrongly flag them or
//   wrongly miss them. These numbers are DELIBERATELY SIMPLIFIED for a
//   prototype and would be replaced by validated age-specific charts in
//   production. DO NOT treat these as clinically validated.
//
// WHY THIS MATTERS (the "silent safety risk" the brief calls out):
//   A single adult-calibrated model applied to a 3-year-old is unsafe. We
//   band by age so the SAME vital is interpreted correctly for that patient.
// ============================================================================

// Age bands
const AGE_BANDS = {
  PEDIATRIC: "pediatric", // under 12
  ADULT: "adult",         // 12 - 64
  GERIATRIC: "geriatric", // 65+
};

function getAgeBand(age) {
  if (age < 12) return AGE_BANDS.PEDIATRIC;
  if (age >= 65) return AGE_BANDS.GERIATRIC;
  return AGE_BANDS.ADULT;
}

// ----------------------------------------------------------------------------
// ADULT thresholds — direct from the NEWS2 table.
// Each vital maps a measured value to a sub-score of 0,1,2,3.
// Higher sub-score = more physiologically abnormal.
// ----------------------------------------------------------------------------
// Respiratory rate (breaths/min): 3:<=8 | 1:9-11 | 0:12-20 | 2:21-24 | 3:>=25
function scoreRespRateAdult(rr) {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3; // >=25
}
// SpO2 Scale 1 (%): 3:<=91 | 2:92-93 | 1:94-95 | 0:>=96
function scoreSpo2Adult(spo2) {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}
// Systolic BP (mmHg): 3:<=90 | 2:91-100 | 1:101-110 | 0:111-219 | 3:>=220
function scoreSbpAdult(sbp) {
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3; // >=220
}
// Pulse/HR (bpm): 3:<=40 | 1:41-50 | 0:51-90 | 1:91-110 | 2:111-130 | 3:>=131
function scoreHeartRateAdult(hr) {
  if (hr <= 40) return 3;
  if (hr <= 50) return 1;
  if (hr <= 90) return 0;
  if (hr <= 110) return 1;
  if (hr <= 130) return 2;
  return 3; // >=131
}
// Temperature (C): 3:<=35.0 | 1:35.1-36.0 | 0:36.1-38.0 | 1:38.1-39.0 | 2:>=39.1
function scoreTempAdult(t) {
  if (t <= 35.0) return 3;
  if (t <= 36.0) return 1;
  if (t <= 38.0) return 0;
  if (t <= 39.0) return 1;
  return 2; // >=39.1
}

// ----------------------------------------------------------------------------
// PEDIATRIC thresholds (SIMPLIFIED, illustrative).
// Children run faster HR and RR normally, so the "normal" window shifts up.
// These are intentionally coarse for the prototype.
// ----------------------------------------------------------------------------
// Pediatric respiratory rate normal is higher (roughly 20-30 for young kids).
function scoreRespRatePediatric(rr) {
  if (rr <= 14) return 2;   // too low for a child
  if (rr <= 34) return 0;   // broadly normal child range
  if (rr <= 40) return 2;
  return 3;                 // >40 markedly tachypneic
}
// Pediatric HR normal is higher (roughly 80-130 for young kids).
function scoreHeartRatePediatric(hr) {
  if (hr <= 60) return 3;   // bradycardia in a child is serious
  if (hr <= 79) return 1;
  if (hr <= 140) return 0;  // broadly normal child range
  if (hr <= 160) return 2;
  return 3;                 // >160 markedly tachycardic
}
// Pediatric systolic BP: young children run LOWER normal BP than adults, so the
// adult "<=110 scores a point" rule wrongly flags a healthy child. Simplified
// pediatric band: roughly 85-115 is acceptable for a young child. (Illustrative;
// production would use precise per-age centile charts.)
function scoreSbpPediatric(sbp) {
  if (sbp <= 70) return 3;   // genuinely low for a child
  if (sbp <= 84) return 1;
  if (sbp <= 120) return 0;  // normal-ish child range (100 correctly scores 0)
  return 1;                  // high
}
// SpO2: use the adult SpO2 (oxygen physiology similar).
// Temperature: fever is interpreted with more caution in young children.
function scoreTempPediatric(t) {
  if (t <= 35.0) return 3;
  if (t <= 36.0) return 1;
  if (t <= 37.9) return 0;
  if (t < 39.0) return 1;   // fever
  return 2;                 // high fever – note: in infants this would be escalated harder in production
}

// ----------------------------------------------------------------------------
// GERIATRIC: uses the adult NEWS2 table (NEWS2 is validated for adults incl.
// elderly), but we add a small vulnerability weighting in the engine, because
// a "mild" abnormality carries more risk in a frail older patient.
// ----------------------------------------------------------------------------

// Consciousness (AVPU/ACVPU): Alert = 0; anything else (new Confusion, Voice,
// Pain, Unresponsive) = 3. Same across all ages.
function scoreConsciousness(level) {
  return level === "alert" ? 0 : 3;
}

// ----------------------------------------------------------------------------
// Dispatch: return the right sub-score functions for a given age band.
// ----------------------------------------------------------------------------
function getScorers(band) {
  if (band === AGE_BANDS.PEDIATRIC) {
    return {
      respRate: scoreRespRatePediatric,
      spo2: scoreSpo2Adult,           // reuse adult SpO2 (oxygen physiology similar)
      sbp: scoreSbpPediatric,         // pediatric-specific BP band
      heartRate: scoreHeartRatePediatric,
      temp: scoreTempPediatric,
      consciousness: scoreConsciousness,
    };
  }
  // adult and geriatric both use the NEWS2 adult table
  return {
    respRate: scoreRespRateAdult,
    spo2: scoreSpo2Adult,
    sbp: scoreSbpAdult,
    heartRate: scoreHeartRateAdult,
    temp: scoreTempAdult,
    consciousness: scoreConsciousness,
  };
}

// Geriatric vulnerability multiplier: applied to the aggregate score, not the
// hard rules. Small, deliberate bias so borderline elderly cases lean up.
const GERIATRIC_VULNERABILITY_FACTOR = 1.15;

// Human-readable labels for each vital, used in the "drivers" explanation.
const VITAL_LABELS = {
  respRate: "respiratory rate",
  spo2: "oxygen saturation",
  sbp: "blood pressure",
  heartRate: "heart rate",
  temp: "temperature",
  consciousness: "consciousness level",
};

export {
  AGE_BANDS,
  getAgeBand,
  getScorers,
  scoreConsciousness,
  GERIATRIC_VULNERABILITY_FACTOR,
  VITAL_LABELS,
};
