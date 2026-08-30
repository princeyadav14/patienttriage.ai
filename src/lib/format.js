// format - small display helpers for times, ages, and labels.

/** 47 -> "47m", 84 -> "1h 24m" */
export function mins(m) {
  if (m == null || Number.isNaN(m)) return "-";
  const n = Math.max(0, Math.round(m));
  if (n < 60) return `${n}m`;
  const h = Math.floor(n / 60);
  const r = n % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/** Department clock minute -> wall-clock label, department opens at 08:00. */
export function clockLabel(clockMin, openHour = 8) {
  const total = openHour * 60 + Math.max(0, Math.round(clockMin));
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "Mohan Lal" -> "ML" */
export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** 0.5 -> "6 mo", 3 -> "3 y" */
export function ageLabel(age) {
  if (age == null) return "-";
  if (age < 1) return `${Math.round(age * 12)} mo`;
  return `${Math.round(age)} y`;
}

export const ARRIVAL_MODE_LABEL = {
  "walk-in": "Walk-in",
  ambulance: "Ambulance",
  referral: "GP referral",
};

export const ACVPU_OPTIONS = [
  { key: "alert",        label: "Alert" },
  { key: "confusion",    label: "Confusion" },
  { key: "voice",        label: "Voice" },
  { key: "pain",         label: "Pain" },
  { key: "unresponsive", label: "Unresponsive" },
];

// ESI decision point B depends on how the patient LOOKS. Three taps, and no
// monitor in the world can supply it.
export const APPEARANCE_OPTIONS = [
  { key: "well",   label: "Looks well",  hint: "no concern on sight" },
  { key: "unwell", label: "Unwell",      hint: "not right, but talking" },
  { key: "sick",   label: "Sick-looking", hint: "would not leave them alone" },
];
