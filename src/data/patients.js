// ============================================================================
// patients.js
// ~20 synthetic patient records for the prototype demo.
//
// These are HAND-CRAFTED, not real. Vitals are calibrated to be realistic for
// each age band. The set deliberately includes every case type the brief
// requires, each tagged with `demoTag` so we can point to it live:
//   - ambiguous presentation
//   - pediatric case
//   - geriatric case
//   - zero-history (first-time) patient
//   - clear red-flag (rule-layer) cases
//   - routine low-acuity cases
//
// consciousness values: "alert" | "voice" | "pain" | "unresponsive"
// history: "known" | "first-time"
// ambiguous: true when the presentation is genuinely vague (drives confidence)
// ============================================================================

const patients = [
  // ---- CLEAR RED-FLAG CASES (Layer 1 should fire -> Level 1) ----
  {
    id: "P01", name: "Ravi Kumar", age: 54, sex: "M",
    complaint: "Crushing chest pain radiating to left arm",
    pain: 9, history: "known", ambiguous: false,
    vitals: { respRate: 24, spo2: 93, sbp: 128, heartRate: 112, temp: 37.2, consciousness: "alert" },
    demoTag: "red-flag: cardiac complaint",
  },
  {
    id: "P02", name: "Unknown Male", age: 40, sex: "M",
    complaint: "Found unconscious, brought by ambulance",
    pain: null, history: "first-time", ambiguous: false,
    vitals: { respRate: 10, spo2: 89, sbp: 96, heartRate: 120, temp: 36.4, consciousness: "pain" },
    demoTag: "red-flag: altered consciousness + low O2 + zero history",
  },
  {
    id: "P03", name: "Sunita Devi", age: 68, sex: "F",
    complaint: "Sudden face drooping and slurred speech",
    pain: 2, history: "known", ambiguous: false,
    vitals: { respRate: 18, spo2: 96, sbp: 158, heartRate: 88, temp: 36.9, consciousness: "alert" },
    demoTag: "red-flag: stroke complaint",
  },

  // ---- PEDIATRIC CASE (age band changes interpretation) ----
  {
    id: "P04", name: "Aarav (child)", age: 3, sex: "M",
    complaint: "Fever and fast breathing for 1 day",
    pain: 3, history: "known", ambiguous: false,
    // HR 138 and RR 30 are NORMAL-ish for a 3yo; an adult model would over-flag.
    // Temp 38.6 is a fever handled with pediatric caution.
    vitals: { respRate: 30, spo2: 97, sbp: 100, heartRate: 138, temp: 38.6, consciousness: "alert" },
    demoTag: "pediatric: shows age-banding (adult model would mis-score this)",
  },
  {
    id: "P05", name: "Diya (child)", age: 6, sex: "F",
    complaint: "Very fast breathing, looks distressed",
    pain: 4, history: "known", ambiguous: false,
    // RR 44 trips the pediatric red-flag rule.
    vitals: { respRate: 44, spo2: 94, sbp: 98, heartRate: 150, temp: 38.0, consciousness: "alert" },
    demoTag: "pediatric red-flag: dangerous resp rate for a child",
  },

  // ---- GERIATRIC CASE (vulnerability weighting nudges up) ----
  {
    id: "P06", name: "Mohan Lal", age: 78, sex: "M",
    complaint: "Feeling weak and slightly breathless",
    pain: 2, history: "known", ambiguous: false,
    // Mildly abnormal vitals that matter more in a frail elderly patient.
    vitals: { respRate: 22, spo2: 94, sbp: 108, heartRate: 96, temp: 37.6, consciousness: "alert" },
    demoTag: "geriatric: mild abnormalities weighted up for frailty",
  },

  // ---- AMBIGUOUS PRESENTATION (low confidence expected) ----
  {
    id: "P07", name: "Priya Nair", age: 34, sex: "F",
    complaint: "Vague abdominal discomfort, hard to localise",
    pain: 5, history: "known", ambiguous: true,
    // Borderline vitals -> sits near a boundary -> low confidence.
    vitals: { respRate: 20, spo2: 96, sbp: 112, heartRate: 98, temp: 37.9, consciousness: "alert" },
    demoTag: "ambiguous: vague symptoms, borderline vitals -> low confidence",
  },

  // ---- ZERO-HISTORY FIRST-TIME PATIENT (low confidence expected) ----
  {
    id: "P08", name: "Unknown Female", age: 29, sex: "F",
    complaint: "Dizziness, no records available",
    pain: 3, history: "first-time", ambiguous: false,
    // Some vitals missing (no BP taken yet) -> confidence should drop.
    vitals: { respRate: 19, spo2: 97, sbp: null, heartRate: 104, temp: 37.1, consciousness: "alert" },
    demoTag: "zero-history + missing vital -> low confidence",
  },

  // ---- ROUTINE / LOWER-ACUITY CASES (system should stay calm) ----
  {
    id: "P09", name: "Anil Gupta", age: 45, sex: "M",
    complaint: "Sprained ankle, twisted while walking",
    pain: 4, history: "known", ambiguous: false,
    vitals: { respRate: 16, spo2: 99, sbp: 124, heartRate: 76, temp: 36.8, consciousness: "alert" },
    demoTag: "routine: minor injury",
  },
  {
    id: "P10", name: "Meena Rao", age: 38, sex: "F",
    complaint: "Sore throat and mild cough for 3 days",
    pain: 2, history: "known", ambiguous: false,
    vitals: { respRate: 15, spo2: 98, sbp: 118, heartRate: 72, temp: 37.4, consciousness: "alert" },
    demoTag: "routine: minor illness",
  },
  {
    id: "P11", name: "Karan Singh", age: 25, sex: "M",
    complaint: "Small cut on hand, needs dressing",
    pain: 2, history: "known", ambiguous: false,
    vitals: { respRate: 14, spo2: 99, sbp: 122, heartRate: 68, temp: 36.6, consciousness: "alert" },
    demoTag: "routine: very minor",
  },
  {
    id: "P12", name: "Lakshmi Iyer", age: 52, sex: "F",
    complaint: "Mild headache, wants a check",
    pain: 3, history: "known", ambiguous: false,
    vitals: { respRate: 16, spo2: 98, sbp: 130, heartRate: 78, temp: 36.9, consciousness: "alert" },
    demoTag: "routine",
  },

  // ---- MID-ACUITY CASES (scoring layer produces 2-3) ----
  {
    id: "P13", name: "Arjun Mehta", age: 60, sex: "M",
    complaint: "Breathless on exertion, worsening",
    pain: 3, history: "known", ambiguous: false,
    vitals: { respRate: 23, spo2: 94, sbp: 106, heartRate: 108, temp: 37.0, consciousness: "alert" },
    demoTag: "mid-acuity: multiple mild-moderate abnormalities",
  },
  {
    id: "P14", name: "Fatima Sheikh", age: 47, sex: "F",
    complaint: "Fever and body ache, feeling faint",
    pain: 4, history: "known", ambiguous: false,
    vitals: { respRate: 21, spo2: 96, sbp: 102, heartRate: 106, temp: 39.2, consciousness: "alert" },
    demoTag: "mid-acuity: fever + tachycardia (possible sepsis pattern)",
  },
  {
    id: "P15", name: "Unknown Elderly", age: 82, sex: "F",
    complaint: "Confusion reported by family",
    pain: null, history: "first-time", ambiguous: true,
    // Confusion = not alert -> should trip red flag (altered consciousness).
    vitals: { respRate: 20, spo2: 95, sbp: 118, heartRate: 90, temp: 37.3, consciousness: "voice" },
    demoTag: "geriatric red-flag: new confusion + first-time + ambiguous",
  },
  {
    id: "P16", name: "Rahul Verma", age: 31, sex: "M",
    complaint: "Migraine, sensitive to light",
    pain: 6, history: "known", ambiguous: false,
    vitals: { respRate: 17, spo2: 98, sbp: 126, heartRate: 82, temp: 36.7, consciousness: "alert" },
    demoTag: "routine-mid: painful but stable",
  },
  {
    id: "P17", name: "Geeta Patel", age: 55, sex: "F",
    complaint: "Palpitations, feeling anxious",
    pain: 2, history: "known", ambiguous: true,
    vitals: { respRate: 19, spo2: 97, sbp: 114, heartRate: 118, temp: 36.9, consciousness: "alert" },
    demoTag: "ambiguous mid: tachycardia with unclear cause",
  },
  {
    id: "P18", name: "Suresh Yadav", age: 66, sex: "M",
    complaint: "Cough with fever, short of breath",
    pain: 3, history: "known", ambiguous: false,
    vitals: { respRate: 24, spo2: 93, sbp: 110, heartRate: 102, temp: 38.4, consciousness: "alert" },
    demoTag: "geriatric mid-high: respiratory infection pattern",
  },
  {
    id: "P19", name: "Neha Joshi", age: 28, sex: "F",
    complaint: "Nausea and mild stomach pain",
    pain: 3, history: "first-time", ambiguous: false,
    vitals: { respRate: 16, spo2: 99, sbp: 116, heartRate: 80, temp: 37.0, consciousness: "alert" },
    demoTag: "routine + first-time",
  },
  {
    id: "P20", name: "Vikram Reddy", age: 71, sex: "M",
    complaint: "General weakness after fall, no head injury",
    pain: 4, history: "known", ambiguous: true,
    vitals: { respRate: 20, spo2: 95, sbp: 104, heartRate: 94, temp: 37.2, consciousness: "alert" },
    demoTag: "geriatric ambiguous: post-fall, borderline",
  },
];

export { patients };
