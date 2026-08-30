// site - per-hospital configuration.
// All values that vary by hospital: name, jurisdiction, safe-wait policy,
// surge thresholds and behaviour, safety ceilings, geriatric weighting, and
// quick-complaint terms. Changing hospital is a config change, not a code one.

export const SITE = {
  id: "SITE-DEMO-01",
  name: "Demo General Hospital · Emergency Department",
  shortName: "Demo General",

  // ---- scale & integration -------------------------------------------------
  tier: "tier3",
  dailyVisits: 320,
  treatmentBays: 18,
  jurisdiction: "IN-DPDP-2023", // see GovernanceView for what this implies

  // ---- clinical governance -------------------------------------------------
  signedOff: {
    by: "Dr A. Menon, ED Clinical Lead",
    on: "2026-07-14",
    note: "Illustrative prototype values. NOT clinically validated.",
  },

  // ---- autonomy level (see the progressive autonomy ladder) ----------------
  // L0 shadow · L1 red flags only · L2 advisory (blank field)
  // L3 pre-filled (recommendation pre-selects the nurse's field)
  // L4 does not exist and never will.
  autonomyLevel: 3,

  // ---- safe-wait policy: minutes before a recheck is due, per acuity -------
  safeWaitMinutes: { 1: 0, 2: 10, 3: 30, 4: 60, 5: 120 },

  // Door-to-triage target. The clock that starts before the product used to
  // know the patient existed.
  doorToTriageTargetMinutes: 10,

  // ---- surge ---------------------------------------------------------------
  surge: {
    // Department is considered surging above this many waiting patients.
    enterAtWaiting: 24,
    exitAtWaiting: 16,
    // In surge, recheck intervals tighten by this factor...
    recheckTightenFactor: 0.66,
    // ...and non-escalation alerts at or below this acuity are suppressed.
    // Every suppression is logged: silence is still an auditable decision.
    suppressAlertsAtOrBelowAcuity: 4,
  },

  // ---- safety thresholds ---------------------------------------------------
  safety: {
    // ESI decision point B: severe pain is an ESI-2 criterion in its own right.
    severePainScore: 7,
    severePainCeilingAcuity: 2,
    // A nurse saying the patient looks sick outranks the numbers.
    sickAppearanceCeilingAcuity: 2,
    // Vitals older than this are treated as stale and reduce confidence.
    staleVitalsMinutes: 15,
    // Geriatric vulnerability multiplier on the aggregate score.
    geriatricVulnerabilityFactor: 1.15,
  },

  // ---- complaint ontology --------------------------------------------------
  // A complaint that matches NOTHING here contributes to the derived ambiguity
  // score. A specialty hospital swaps this list; nothing else changes.
  complaintTerms: [
    "chest pain", "chest tightness", "palpitation", "palpitations",
    "breathless", "breathlessness", "short of breath", "shortness of breath",
    "difficulty breathing", "wheeze", "cough", "asthma",
    "abdominal pain", "abdo pain", "stomach pain", "vomiting", "diarrhoea",
    "diarrhea", "nausea", "constipation",
    "headache", "migraine", "seizure", "fit", "collapse", "syncope",
    "faint", "dizziness", "vertigo",
    "fever", "rash", "sore throat", "ear pain", "urine infection",
    "back pain", "neck pain", "joint pain", "limb injury", "ankle injury",
    "fracture", "sprain", "laceration", "cut", "wound", "burn", "bleeding",
    "fall", "head injury", "trauma", "assault", "road traffic",
    "stroke", "face drooping", "slurred speech", "weakness one side",
    "overdose", "poisoning", "self harm", "mental health",
    "pregnancy", "labour", "bleeding in pregnancy",
    "allergic", "anaphylaxis", "sting", "bite",
  ],

  // Top complaints for THIS department, shown as one-tap chips at triage.
  quickComplaints: [
    "Chest pain", "Breathlessness", "Abdominal pain",
    "Fall", "Fever", "Head injury", "Limb injury",
  ],

  // ---- vagueness lexicon ---------------------------------------------------
  // Words that mark a presentation as genuinely hard to pin down. This is what
  // replaces the old `Ambiguous? Yes/No` dropdown: the nurse never sets it.
  vaguenessTerms: [
    "vague", "unclear", "non-specific", "nonspecific", "generally",
    "general weakness", "generally unwell", "unwell", "not right",
    "off", "hard to", "difficult to", "can't say", "cannot say",
    "malaise", "tired", "lethargic", "weakness", "weak", "just feels",
    "something wrong", "no obvious", "unexplained",
  ],

  // ---- override reasons ----------------------------------------------------
  // Owned by the nurse educator (see RACI). Two taps, never free text first -
  // free text is offered as an optional addition, not a requirement.
  overrideReasons: [
    "Patient appears more unwell than the numbers",
    "Atypical presentation for this age",
    "Known high-risk history",
    "Clinical concern I can't fully articulate",
    "Vitals look wrong / re-taking",
    "Social or safeguarding factor",
    "Department capacity decision",
  ],

  // ---- data protection -----------------------------------------------------
  dataProtection: {
    framework: "Digital Personal Data Protection Act 2023 (India) + Rules",
    status: "Active compliance phase through 2026; full enforcement 2027",
    retentionDays: 2555, // 7 years, per typical hospital record policy
    consentModel: "Care-delivery legitimate use; no secondary use without consent",
    dpo: "dpo@demogeneral.example",
  },
};

// Convenience: does this site receive vitals from monitors?
export const hasDeviceFeed = () => SITE.tier === "tier2" || SITE.tier === "tier3";
// Does it resolve identity and history from an EHR?
export const hasEhrFeed = () => SITE.tier === "tier3";

export default SITE;
