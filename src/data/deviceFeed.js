// deviceFeed - simulates vitals arriving from a monitor.
// Provides device-sourced vital values and capture metadata so the vitals
// block can show provenance and staleness.

import { hasDeviceFeed } from "../config/site";

// Which fields a monitor can actually supply.
export const DEVICE_VITALS = ["spo2", "sbp", "heartRate", "temp"];
// Which fields only a human can supply.
export const MANUAL_VITALS = ["respRate", "onOxygen", "consciousness"];

export const DEVICE_POOL = [
  { id: "CONNEX-01", label: "Connex #1", bay: "Triage bay 1" },
  { id: "CONNEX-02", label: "Connex #2", bay: "Triage bay 2" },
  { id: "CONNEX-03", label: "Connex #3", bay: "Triage bay 3" },
];

// Deterministic device assignment so a given patient always shows the same
// monitor. Avoids random churn on re-render, which would look broken.
function deviceFor(patientId) {
  const seed = String(patientId || "")
    .split("")
    .reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return DEVICE_POOL[seed % DEVICE_POOL.length];
}

// Route matters clinically: a tympanic reading and an axillary reading are not
// interchangeable at the same threshold.
const TEMP_ROUTES = ["tympanic", "oral", "axillary"];
function routeFor(patientId) {
  const seed = String(patientId || "").length;
  return TEMP_ROUTES[seed % TEMP_ROUTES.length];
}

/**
 * Build the provenance envelope for one patient's vitals.
 *
 * @param {object} patient
 * @param {number} nowMin      simulated department clock, in minutes
 * @param {number} capturedAt  clock minute the reading was taken
 */
export function readDeviceFeed(patient, nowMin = 0, capturedAt = null) {
  const device = deviceFor(patient.id);
  const taken = capturedAt == null ? nowMin : capturedAt;
  const ageMinutes = Math.max(0, nowMin - taken);

  const sources = {};
  for (const k of DEVICE_VITALS) {
    sources[k] = hasDeviceFeed() ? "device" : "manual";
  }
  for (const k of MANUAL_VITALS) sources[k] = "manual";

  return {
    device: hasDeviceFeed() ? device : null,
    capturedAtMin: taken,
    ageMinutes,
    tempRoute: routeFor(patient.id),
    sources,
    // A reading nobody has confirmed is a reading nobody owns.
    confirmed: false,
  };
}

/**
 * Simulate re-taking observations on a waiting patient.
 *
 * That is a persuasive demo and an unfalsifiable one: a system that always
 * finds something is a system nobody can trust. Three outcomes now, and the
 * caller chooses, so "re-checked, nothing has changed" is a result the product
 * can actually produce.
 *
 * @param {object} vitals
 * @param {"improved"|"unchanged"|"deteriorated"} outcome
 */
export function resample(vitals, outcome = "unchanged") {
  const v = { ...vitals };
  if (outcome === "unchanged") return v;

  const dir = outcome === "deteriorated" ? 1 : -1;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  if (v.spo2 != null) v.spo2 = clamp(v.spo2 - dir * 4, 80, 100);
  if (v.heartRate != null) v.heartRate = clamp(v.heartRate + dir * 14, 35, 190);
  if (v.respRate != null) v.respRate = clamp(v.respRate + dir * 4, 6, 70);
  if (v.sbp != null) v.sbp = clamp(v.sbp - dir * 8, 60, 240);
  if (v.temp != null) v.temp = Math.round((v.temp + dir * 0.4) * 10) / 10;

  return v;
}

export const RESAMPLE_OUTCOMES = [
  { key: "improved",     label: "Improved",     hint: "obs better than last time" },
  { key: "unchanged",    label: "No change",    hint: "same picture as last check" },
  { key: "deteriorated", label: "Deteriorated", hint: "obs worse than last time" },
];
