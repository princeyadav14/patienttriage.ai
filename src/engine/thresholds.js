// thresholds - clinical reference values.
// Age bands and their normal ranges, per-vital NEWS2-based sub-score functions,
// danger zones used by the rule layer, and the critical SpO2 hard stop.
// Adult values follow NEWS2; paediatric bands are simplified and illustrative.

import SITE from "../config/site";

export const AGE_BANDS = {
  INFANT: "infant",
  TODDLER: "toddler",
  CHILD: "child",
  ADULT: "adult",
  GERIATRIC: "geriatric",
};

export const BAND_META = {
  infant:    { label: "Infant",    range: "under 1", paediatric: true },
  toddler:   { label: "Toddler",   range: "1 – 4",   paediatric: true },
  child:     { label: "Child",     range: "5 – 11",  paediatric: true },
  adult:     { label: "Adult",     range: "12 – 64", paediatric: false },
  geriatric: { label: "Geriatric", range: "65+",     paediatric: false },
};

export function getAgeBand(age) {
  if (age == null || Number.isNaN(age)) return AGE_BANDS.ADULT;
  if (age < 1) return AGE_BANDS.INFANT;
  if (age <= 4) return AGE_BANDS.TODDLER;
  if (age <= 11) return AGE_BANDS.CHILD;
  if (age <= 64) return AGE_BANDS.ADULT;
  return AGE_BANDS.GERIATRIC;
}

export const isPaediatric = (band) => !!BAND_META[band]?.paediatric;

// ---------------------------------------------------------------------------
// Normal reference ranges per band. The UI uses these to say
// the tool is not applying an adult model to a child.
// ---------------------------------------------------------------------------
export const NORMAL_RANGES = {
  infant:    { respRate: [30, 55], heartRate: [100, 160], sbp: [70, 100],  temp: [36.1, 37.9], spo2: [96, 100] },
  toddler:   { respRate: [22, 40], heartRate: [90, 140],  sbp: [80, 110],  temp: [36.1, 37.9], spo2: [96, 100] },
  child:     { respRate: [18, 30], heartRate: [70, 120],  sbp: [85, 120],  temp: [36.1, 37.9], spo2: [96, 100] },
  adult:     { respRate: [12, 20], heartRate: [51, 90],   sbp: [111, 219], temp: [36.1, 38.0], spo2: [96, 100] },
  geriatric: { respRate: [12, 20], heartRate: [51, 90],   sbp: [111, 219], temp: [36.1, 38.0], spo2: [96, 100] },
};

// ---------------------------------------------------------------------------
// DANGER ZONE: deterministic red-flag cut-offs, per band.
// Held as DATA, not if-statements, so a site can re-sign them without touching
// any logic. Consumed by redFlags.js.
// ---------------------------------------------------------------------------
export const DANGER_ZONE = {
  infant:    { rrHigh: 56, rrLow: 24, hrHigh: 181, hrLow: 80, sbpLow: 60, tempHigh: 38.0 },
  toddler:   { rrHigh: 41, rrLow: 19, hrHigh: 161, hrLow: 70, sbpLow: 65, tempHigh: 40.0 },
  child:     { rrHigh: 41, rrLow: 14, hrHigh: 141, hrLow: 55, sbpLow: 75, tempHigh: 40.5 },
  adult:     { rrHigh: 25, rrLow: 8,  hrHigh: 131, hrLow: 40, sbpLow: 90, tempHigh: null },
  geriatric: { rrHigh: 25, rrLow: 8,  hrHigh: 131, hrLow: 40, sbpLow: 90, tempHigh: null },
};

// Universal hard stop at any age.
export const CRITICAL_SPO2 = 91;

// ---------------------------------------------------------------------------
// Sub-score tables: measured value -> 0 / 1 / 2 / 3.
// Higher = more physiologically abnormal.
// ---------------------------------------------------------------------------

// ---- ADULT / GERIATRIC: straight from the NEWS2 chart ----
const adult = {
  respRate:  (v) => (v <= 8 ? 3 : v <= 11 ? 1 : v <= 20 ? 0 : v <= 24 ? 2 : 3),
  heartRate: (v) => (v <= 40 ? 3 : v <= 50 ? 1 : v <= 90 ? 0 : v <= 110 ? 1 : v <= 130 ? 2 : 3),
  sbp:       (v) => (v <= 90 ? 3 : v <= 100 ? 2 : v <= 110 ? 1 : v <= 219 ? 0 : 3),
  temp:      (v) => (v <= 35.0 ? 3 : v <= 36.0 ? 1 : v <= 38.0 ? 0 : v <= 39.0 ? 1 : 2),
};

// ---- INFANT (< 1 year) ----
// ESI puts any temperature above 38.0 in an infant under 90 days at ESI-2 as a
// minimum, so infant fever scores hard rather than gently.
const infant = {
  respRate:  (v) => (v <= 24 ? 3 : v <= 29 ? 2 : v <= 55 ? 0 : v <= 65 ? 2 : 3),
  heartRate: (v) => (v <= 80 ? 3 : v <= 99 ? 2 : v <= 160 ? 0 : v <= 180 ? 2 : 3),
  sbp:       (v) => (v <= 60 ? 3 : v <= 69 ? 2 : v <= 100 ? 0 : 1),
  temp:      (v) => (v <= 35.0 ? 3 : v <= 36.0 ? 2 : v < 38.0 ? 0 : 3),
};

// ---- TODDLER (1 - 4) ----
const toddler = {
  respRate:  (v) => (v <= 19 ? 3 : v <= 21 ? 1 : v <= 40 ? 0 : v <= 50 ? 2 : 3),
  heartRate: (v) => (v <= 70 ? 3 : v <= 89 ? 1 : v <= 140 ? 0 : v <= 160 ? 2 : 3),
  sbp:       (v) => (v <= 65 ? 3 : v <= 79 ? 1 : v <= 110 ? 0 : 1),
  temp:      (v) => (v <= 35.0 ? 3 : v <= 36.0 ? 1 : v <= 37.9 ? 0 : v <= 38.9 ? 1 : v <= 39.9 ? 2 : 3),
};

// ---- CHILD (5 - 11) ----
const child = {
  respRate:  (v) => (v <= 14 ? 3 : v <= 17 ? 1 : v <= 30 ? 0 : v <= 40 ? 2 : 3),
  heartRate: (v) => (v <= 55 ? 3 : v <= 69 ? 1 : v <= 120 ? 0 : v <= 140 ? 2 : 3),
  sbp:       (v) => (v <= 75 ? 3 : v <= 84 ? 1 : v <= 120 ? 0 : 1),
  temp:      (v) => (v <= 35.0 ? 3 : v <= 36.0 ? 1 : v <= 37.9 ? 0 : v <= 38.9 ? 1 : v <= 39.9 ? 2 : 3),
};

// SpO2: NEWS2 scale 1. Oxygen physiology is comparable across ages.
export const scoreSpo2 = (v) => (v <= 91 ? 3 : v <= 93 ? 2 : v <= 95 ? 1 : 0);

// Supplemental oxygen: NEWS2 adds 2 points for any patient receiving oxygen.
export const scoreOxygenSupport = (onOxygen) => (onOxygen ? 2 : 0);

// Consciousness (ACVPU): Alert = 0, anything else = 3, at every age.
export const scoreConsciousness = (level) => (level === "alert" ? 0 : 3);

const TABLES = { infant, toddler, child, adult, geriatric: adult };

export function getScorers(band) {
  const t = TABLES[band] || adult;
  return { ...t, spo2: scoreSpo2, consciousness: scoreConsciousness };
}

export const GERIATRIC_VULNERABILITY_FACTOR = SITE.safety.geriatricVulnerabilityFactor;

export const VITAL_LABELS = {
  respRate: "respiratory rate",
  spo2: "oxygen saturation",
  sbp: "blood pressure",
  heartRate: "heart rate",
  temp: "temperature",
  consciousness: "consciousness level",
  onOxygen: "supplemental oxygen",
};

export const VITAL_UNITS = {
  respRate: "/min",
  spo2: "%",
  sbp: "mmHg",
  heartRate: "bpm",
  temp: "°C",
};

export const VITAL_SHORT = {
  respRate: "Resp",
  spo2: "SpO2",
  sbp: "Syst BP",
  heartRate: "Pulse",
  temp: "Temp",
};

// Vitals that feed the aggregate score, in NEWS2 display order.
export const SCORED_VITALS = ["respRate", "spo2", "sbp", "heartRate", "temp"];
