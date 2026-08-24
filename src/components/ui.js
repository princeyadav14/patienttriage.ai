// Shared display helpers for acuity levels.

export const ACUITY_META = {
  1: { label: "Level 1 · Critical", short: "1", cls: "acuity-1" },
  2: { label: "Level 2 · Emergent", short: "2", cls: "acuity-2" },
  3: { label: "Level 3 · Urgent", short: "3", cls: "acuity-3" },
  4: { label: "Level 4 · Less urgent", short: "4", cls: "acuity-4" },
  5: { label: "Level 5 · Non-urgent", short: "5", cls: "acuity-5" },
};

// Safe-wait thresholds in MINUTES per acuity level. Higher acuity = shorter safe
// wait before a re-assessment is due. (Illustrative; hospital policy in prod.)
export const SAFE_WAIT_MINUTES = {
  1: 0,    // should already be in resus
  2: 10,
  3: 30,
  4: 60,
  5: 120,
};

export function formatMins(m) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
