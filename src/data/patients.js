// patients - synthetic patient scenarios for the demo.
// Each record carries demographics, vitals, and observations, plus a demoTag
// naming what it illustrates (red flag, paediatric, ambiguous, zero-history,
// etc.). Not real patient data.

const patients = [
  // ---------- DETERMINISTIC RED FLAGS (Layer 1 fires -> Level 1) ----------
  {
    id: "P01", mrn: "MRN-1102", name: "Ravi Kumar", age: 54, sex: "M",
    complaint: "Crushing chest pain radiating to left arm",
    pain: 9, history: "known", appearance: "unwell",
    arrivedAt: 4, arrivalMode: "walk-in",
    comorbidities: ["Hypertension", "Type 2 diabetes"],
    vitals: { respRate: 24, spo2: 93, sbp: 128, heartRate: 112, temp: 37.2, consciousness: "alert", onOxygen: false },
    demoTag: "red flag: cardiac complaint",
    v1Ambiguous: false,
  },
  {
    id: "P02", mrn: null, name: "Unknown male", age: 40, sex: "M",
    complaint: "Found unconscious, brought by ambulance",
    pain: null, history: "first-time", appearance: "sick",
    arrivedAt: 2, arrivalMode: "ambulance",
    comorbidities: [],
    vitals: { respRate: 10, spo2: 89, sbp: 96, heartRate: 120, temp: 36.4, consciousness: "pain", onOxygen: true },
    demoTag: "red flag: altered consciousness + hypoxia + no record",
    v1Ambiguous: false,
  },
  {
    id: "P03", mrn: "MRN-2288", name: "Sunita Devi", age: 68, sex: "F",
    complaint: "Sudden face drooping and slurred speech",
    pain: 2, history: "known", appearance: "unwell",
    arrivedAt: 7, arrivalMode: "ambulance",
    comorbidities: ["Atrial fibrillation", "On anticoagulant"],
    vitals: { respRate: 18, spo2: 96, sbp: 158, heartRate: 88, temp: 36.9, consciousness: "alert", onOxygen: false },
    demoTag: "red flag: stroke pathway",
    v1Ambiguous: false,
  },

  // ---------- PAEDIATRIC: three separate bands ----------
  {
    id: "P04", mrn: "MRN-8830", name: "Aarav Sharma", age: 3, sex: "M",
    complaint: "Fever and fast breathing for 1 day",
    pain: 3, history: "known", appearance: "well",
    arrivedAt: 33, arrivalMode: "walk-in",
    comorbidities: [],
    // Pulse 138 and resp 30 are NORMAL for a toddler. An adult-calibrated
    // model scores both as abnormal and lands this child at Level 2.
    vitals: { respRate: 30, spo2: 97, sbp: 100, heartRate: 138, temp: 38.6, consciousness: "alert", onOxygen: false },
    demoTag: "toddler: age banding prevents a two-level over-triage",
    v1Ambiguous: false,
  },
  {
    id: "P05", mrn: "MRN-9014", name: "Diya Menon", age: 6, sex: "F",
    complaint: "Very fast breathing, looks distressed",
    pain: 4, history: "known", appearance: "sick",
    arrivedAt: 6, arrivalMode: "walk-in",
    comorbidities: ["Asthma"],
    // Resp 44 crosses the CHILD danger zone (41). It would not have crossed
    // the toddler one, which is the point of banding.
    vitals: { respRate: 44, spo2: 94, sbp: 98, heartRate: 150, temp: 38.0, consciousness: "alert", onOxygen: false },
    demoTag: "child red flag: resp rate dangerous for 5–11",
    v1Ambiguous: false,
  },
  {
    id: "P21", mrn: "MRN-9931", name: "Baby Iyer", age: 0.5, sex: "F",
    complaint: "Fever since this morning, feeding less",
    pain: null, history: "known", appearance: "unwell",
    arrivedAt: 12, arrivalMode: "walk-in",
    comorbidities: [],
    // 38.4 in an infant is a hard stop. The same temperature in an adult is
    // a single point on the NEWS2 chart. This is why one paediatric band
    // was not enough.
    vitals: { respRate: 44, spo2: 97, sbp: 82, heartRate: 152, temp: 38.4, consciousness: "alert", onOxygen: false },
    demoTag: "infant red flag: fever threshold is age-specific",
    v1Ambiguous: false,
  },

  // ---------- GERIATRIC ----------
  {
    id: "P06", mrn: "MRN-4417", name: "Mohan Lal", age: 78, sex: "M",
    complaint: "Feeling breathless on climbing stairs",
    pain: 2, history: "known", appearance: "unwell",
    arrivedAt: 11, arrivalMode: "walk-in",
    comorbidities: ["COPD", "On anticoagulant"],
    vitals: { respRate: 22, spo2: 94, sbp: 108, heartRate: 96, temp: 37.6, consciousness: "alert", onOxygen: false },
    demoTag: "geriatric: mild abnormalities weighted up for frailty",
    v1Ambiguous: false,
  },

  // ---------- AMBIGUOUS PRESENTATIONS (derived, not declared) ----------
  {
    id: "P07", mrn: "MRN-7710", name: "Priya Nair", age: 34, sex: "F",
    complaint: "Vague abdominal discomfort, hard to localise",
    pain: 5, history: "known", appearance: "unwell",
    arrivedAt: 52, arrivalMode: "walk-in",
    comorbidities: [],
    vitals: { respRate: 20, spo2: 96, sbp: 112, heartRate: 98, temp: 37.9, consciousness: "alert", onOxygen: false },
    demoTag: "ambiguous: vague wording, no protocol match",
    v1Ambiguous: true,
  },
  {
    id: "P20", mrn: "MRN-3390", name: "Vikram Reddy", age: 71, sex: "M",
    complaint: "General weakness after a fall, no head injury",
    pain: 4, history: "known", appearance: "unwell",
    arrivedAt: 18, arrivalMode: "walk-in",
    comorbidities: ["Parkinson's disease", "Recurrent falls"],
    vitals: { respRate: 20, spo2: 95, sbp: 104, heartRate: 94, temp: 37.2, consciousness: "alert", onOxygen: false },
    demoTag: "geriatric + ambiguous: borderline post-fall",
    v1Ambiguous: true,
  },

  // ---------- ZERO HISTORY ----------
  {
    id: "P08", mrn: null, name: "Unknown female", age: 29, sex: "F",
    complaint: "Dizziness, no records available",
    pain: 3, history: "first-time", appearance: "unwell",
    arrivedAt: 26, arrivalMode: "walk-in",
    comorbidities: [],
    // No BP taken yet: the aggregate is a floor, not a measurement.
    vitals: { respRate: 19, spo2: 97, sbp: null, heartRate: 104, temp: 37.1, consciousness: "alert", onOxygen: false },
    demoTag: "zero history + missing vital: confidence should fall",
    v1Ambiguous: false,
  },

  // ---------- ROUTINE: the tool should stay silent ----------
  {
    id: "P09", mrn: "MRN-9902", name: "Anil Gupta", age: 45, sex: "M",
    complaint: "Sprained ankle, twisted while walking",
    pain: 4, history: "known", appearance: "well",
    arrivedAt: 71, arrivalMode: "walk-in",
    comorbidities: [],
    vitals: { respRate: 16, spo2: 99, sbp: 124, heartRate: 76, temp: 36.8, consciousness: "alert", onOxygen: false },
    demoTag: "routine: minor injury",
    v1Ambiguous: false,
  },
  {
    id: "P10", mrn: "MRN-5540", name: "Meena Rao", age: 38, sex: "F",
    complaint: "Sore throat and mild cough for 3 days",
    pain: 2, history: "known", appearance: "well",
    arrivedAt: 44, arrivalMode: "walk-in",
    comorbidities: [],
    vitals: { respRate: 15, spo2: 98, sbp: 118, heartRate: 72, temp: 37.4, consciousness: "alert", onOxygen: false },
    demoTag: "routine: minor illness",
    v1Ambiguous: false,
  },
  {
    id: "P11", mrn: "MRN-6108", name: "Karan Singh", age: 25, sex: "M",
    complaint: "Small cut on hand, needs a dressing",
    pain: 2, history: "known", appearance: "well",
    arrivedAt: 63, arrivalMode: "walk-in",
    comorbidities: [],
    vitals: { respRate: 14, spo2: 99, sbp: 122, heartRate: 68, temp: 36.6, consciousness: "alert", onOxygen: false },
    demoTag: "routine: very minor",
    v1Ambiguous: false,
  },
  {
    id: "P12", mrn: "MRN-2214", name: "Lakshmi Iyer", age: 52, sex: "F",
    complaint: "Headache, wants a check",
    pain: 3, history: "known", appearance: "well",
    arrivedAt: 38, arrivalMode: "walk-in",
    comorbidities: ["Migraine"],
    vitals: { respRate: 16, spo2: 98, sbp: 130, heartRate: 78, temp: 36.9, consciousness: "alert", onOxygen: false },
    demoTag: "routine",
    v1Ambiguous: false,
  },
  {
    id: "P16", mrn: "MRN-4402", name: "Rahul Verma", age: 31, sex: "M",
    complaint: "Migraine, sensitive to light",
    pain: 8, history: "known", appearance: "unwell",
    arrivedAt: 29, arrivalMode: "walk-in",
    comorbidities: ["Migraine"],
    // collected and then ignored. ESI decision point B says otherwise.
    vitals: { respRate: 17, spo2: 98, sbp: 126, heartRate: 82, temp: 36.7, consciousness: "alert", onOxygen: false },
    demoTag: "severe pain with normal vitals: the field v1 threw away",
    v1Ambiguous: false,
  },
  {
    id: "P19", mrn: null, name: "Neha Joshi", age: 28, sex: "F",
    complaint: "Nausea and mild stomach pain",
    pain: 3, history: "first-time", appearance: "well",
    arrivedAt: 47, arrivalMode: "walk-in",
    comorbidities: [],
    vitals: { respRate: 16, spo2: 99, sbp: 116, heartRate: 80, temp: 37.0, consciousness: "alert", onOxygen: false },
    demoTag: "routine + first attendance",
    v1Ambiguous: false,
  },

  // ---------- MID-ACUITY ----------
  {
    id: "P13", mrn: "MRN-5521", name: "Arjun Mehta", age: 60, sex: "M",
    complaint: "Breathless on exertion, worsening over a week",
    pain: 3, history: "known", appearance: "unwell",
    arrivedAt: 9, arrivalMode: "walk-in",
    comorbidities: ["Heart failure"],
    vitals: { respRate: 23, spo2: 94, sbp: 106, heartRate: 108, temp: 37.0, consciousness: "alert", onOxygen: false },
    demoTag: "mid acuity: several mild-moderate abnormalities",
    v1Ambiguous: false,
  },
  {
    id: "P14", mrn: "MRN-6672", name: "Fatima Sheikh", age: 47, sex: "F",
    complaint: "Fever and body ache, feeling faint",
    pain: 4, history: "known", appearance: "unwell",
    arrivedAt: 22, arrivalMode: "walk-in",
    comorbidities: [],
    vitals: { respRate: 21, spo2: 96, sbp: 102, heartRate: 106, temp: 39.2, consciousness: "alert", onOxygen: false },
    demoTag: "mid acuity: fever with tachycardia, sepsis pattern",
    v1Ambiguous: false,
  },
  {
    id: "P15", mrn: null, name: "Unknown elderly female", age: 82, sex: "F",
    complaint: "Confusion reported by family",
    pain: null, history: "first-time", appearance: "sick",
    arrivedAt: 15, arrivalMode: "ambulance",
    comorbidities: [],
    vitals: { respRate: 20, spo2: 95, sbp: 118, heartRate: 90, temp: 37.3, consciousness: "confusion", onOxygen: false },
    demoTag: "geriatric red flag: new confusion, no record",
    v1Ambiguous: true,
  },
  {
    id: "P17", mrn: "MRN-7318", name: "Geeta Patel", age: 55, sex: "F",
    complaint: "Palpitations, feeling anxious",
    pain: 2, history: "known", appearance: "well",
    arrivedAt: 31, arrivalMode: "walk-in",
    comorbidities: ["Anxiety"],
    vitals: { respRate: 19, spo2: 97, sbp: 114, heartRate: 118, temp: 36.9, consciousness: "alert", onOxygen: false },
    demoTag: "single abnormal vital, clear complaint",
    v1Ambiguous: true,
  },
  {
    id: "P18", mrn: "MRN-6890", name: "Suresh Yadav", age: 66, sex: "M",
    complaint: "Cough with fever for three days",
    pain: 3, history: "known", appearance: "unwell",
    arrivedAt: 16, arrivalMode: "walk-in",
    comorbidities: ["COPD"],
    vitals: { respRate: 24, spo2: 93, sbp: 110, heartRate: 102, temp: 38.4, consciousness: "alert", onOxygen: false },
    demoTag: "geriatric: respiratory infection pattern",
    v1Ambiguous: false,
  },
];

// Patients who have arrived but have NOT yet been triaged. The door clock is
// because the product only knew a patient existed once a nurse typed them in.
const arrivals = [
  {
    id: "A01", mrn: null, name: "Unknown child", age: 7, sex: "M",
    arrivedAt: 14, arrivalMode: "walk-in",
    note: "Brought in by a neighbour. No parent present yet.",
  },
  {
    id: "A02", mrn: null, name: "Unknown male", age: 40, sex: "M",
    arrivedAt: 2, arrivalMode: "ambulance",
    note: "Pre-hospital handover: reduced GCS, en route 6 minutes.",
  },
  {
    id: "A03", mrn: "MRN-3311", name: "Wasim Sharma", age: 33, sex: "M",
    arrivedAt: 9, arrivalMode: "walk-in",
    note: "Booked in at reception, waiting to be called.",
  },
];

export { patients, arrivals };
export default patients;
