// ambiguity - derives how ambiguous a presentation is.
// Combines observable signals (vague complaint with no protocol match, missing
// vitals, first-time patient, appearance disagreeing with vitals, a score near
// a level boundary) into an ambiguity assessment that lowers confidence.

import SITE from "../config/site";

export const AMBIGUITY_SIGNALS = {
  "AMB-1": "Complaint uses vague or hedging language",
  "AMB-2": "Complaint does not match any known presentation",
  "AMB-3": "Two or more vitals missing at intake",
  "AMB-4": "Nurse says the patient looks unwell but the numbers are clean",
  "AMB-5": "Nurse flagged uncertainty about this patient",
};

/**
 * Derive an ambiguity assessment from what is already on screen.
 *
 * @param {object} patient       the patient record
 * @param {object} ctx
 * @param {number} ctx.missingVitals    count of scored vitals not recorded
 * @param {number} ctx.aggregate        NEWS2-style aggregate, if computed
 * @returns {{ score:number, ambiguous:boolean, signals:{code:string,label:string,detail:string}[] }}
 */
export function deriveAmbiguity(patient, ctx = {}) {
  const { missingVitals = 0, aggregate = 0 } = ctx;
  const signals = [];
  const complaint = String(patient.complaint || "").toLowerCase().trim();

  const add = (code, detail) =>
    signals.push({ code, label: AMBIGUITY_SIGNALS[code], detail });

  // AMB-1: hedging language in the free text.
  const vagueHit = SITE.vaguenessTerms.find((t) => complaint.includes(t));
  if (vagueHit) add("AMB-1", `“${vagueHit}” in the presenting complaint`);

  // AMB-2: matches nothing in the site's complaint ontology.
  // A complaint we cannot map is a complaint we cannot reason about.
  if (complaint.length > 0) {
    const matched = SITE.complaintTerms.some((t) => complaint.includes(t));
    if (!matched) add("AMB-2", "no matching entry in the complaint ontology");
  }

  // AMB-3: sparse data. Roughly half of arrivals have no record; some also
  // arrive before a full vitals set can be taken.
  if (missingVitals >= 2) add("AMB-3", `${missingVitals} vitals not recorded`);

  // AMB-4: the "well-appearing ill" inverse: a nurse's eyes disagree with the
  // numbers. Genuine, common, and exactly the case where a score is least
  // trustworthy on its own.
  if ((patient.appearance === "unwell" || patient.appearance === "sick") && aggregate <= 1) {
    add("AMB-4", `appearance recorded as "${patient.appearance}" with an aggregate of ${aggregate}`);
  }

  // AMB-5: the human signal. Weighted double.
  if (patient.nurseUnsure) add("AMB-5", "nurse ticked “I'm not sure about this one”");

  const score = signals.reduce((s, x) => s + (x.code === "AMB-5" ? 2 : 1), 0);

  return { score, ambiguous: score > 0, signals };
}
