// ui - shared display metadata.
// Acuity labels and colours, confidence labels, and layer labels used across
// components.

import SITE from "../config/site";

export const ACUITY_META = {
  1: { label: "Critical",    long: "Level 1 · Critical",     cls: "acu-1", desc: "Needs a life-saving intervention now" },
  2: { label: "Emergent",    long: "Level 2 · Emergent",     cls: "acu-2", desc: "High risk, or severe pain or distress" },
  3: { label: "Urgent",      long: "Level 3 · Urgent",       cls: "acu-3", desc: "Stable, but will need several resources" },
  4: { label: "Less urgent", long: "Level 4 · Less urgent",  cls: "acu-4", desc: "Likely to need one resource" },
  5: { label: "Non-urgent",  long: "Level 5 · Non-urgent",   cls: "acu-5", desc: "Likely to need none" },
};

export const CONFIDENCE_META = {
  High:   { segments: 3, cls: "conf-high",   note: "act on this" },
  Medium: { segments: 2, cls: "conf-medium", note: "worth a second look" },
  Low:    { segments: 1, cls: "conf-low",    note: "your judgement matters more here" },
};

export const LAYER_META = {
  "rule-layer": {
    label: "Rule layer",
    note: "Deterministic. Independent of the model, and cannot be softened by it.",
  },
  "scoring-layer": {
    label: "Scoring layer",
    note: "Age-banded weighted score. Every point below is shown.",
  },
};

// Progressive autonomy ladder. The product behaves differently at each level,
// and the level a site is running at is displayed, not hidden.
export const AUTONOMY_META = {
  0: { label: "L0 · Shadow",     note: "Runs and logs. Shows the nurse nothing." },
  1: { label: "L1 · Red flags",  note: "Deterministic flags only. The score stays silent." },
  2: { label: "L2 · Advisory",   note: "Full recommendation. The nurse's field starts blank." },
  3: { label: "L3 · Pre-filled", note: "Recommendation pre-selects the nurse's field. She confirms or changes it." },
};

export const currentAutonomy = () => AUTONOMY_META[SITE.autonomyLevel] || AUTONOMY_META[2];

/** At L2 the nurse's acuity field starts empty; at L3 it is pre-filled. */
export const prefillsNurseField = () => SITE.autonomyLevel >= 3;

/** At L0/L1 the scoring layer is not shown at all. */
export const showsScoringLayer = () => SITE.autonomyLevel >= 2;

export const severityClass = (weight) =>
  weight >= 3 ? "sev-3" : weight === 2 ? "sev-2" : weight === 1 ? "sev-1" : "sev-0";
