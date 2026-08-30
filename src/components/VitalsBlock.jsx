// VitalsBlock - vital sign entry and confirmation.
// Device-style vitals (SpO2, pulse, systolic BP, temperature) plus a manual
// respiratory rate field. On-oxygen status is an inline toggle within the SpO2
// tile (NEWS2 adds 2 points for supplemental oxygen). Shows provenance, age,
// staleness, and the age-appropriate normal range for each value.
import React from "react";
import { getScorers, getAgeBand, NORMAL_RANGES, VITAL_UNITS } from "../engine/thresholds";
import { DEVICE_VITALS } from "../data/deviceFeed";
import { hasDeviceFeed } from "../config/site";
import { mins } from "../lib/format";

const ORDER = ["spo2", "heartRate", "sbp", "temp"];
const LABELS = { spo2: "SpO2", heartRate: "Pulse", sbp: "Syst BP", temp: "Temp" };

export default function VitalsBlock({
  patient,
  provenance,
  clockMin,
  onVital,
  onConfirm,
  confirmed,
  canConfirm = true,
  editable = true,
}) {
  const band = getAgeBand(patient.age);
  const scorers = getScorers(band);
  const ranges = NORMAL_RANGES[band] || NORMAL_RANGES.adult;
  const v = patient.vitals || {};

  const ageMin = provenance ? clockMin - provenance.capturedAtMin : 0;
  const stale = ageMin > 15;

  const sevOf = (key) => {
    const val = v[key];
    if (val == null || !scorers[key]) return 0;
    return scorers[key](val);
  };

  const sevClass = (s) => (s >= 3 ? "sev-3" : s === 2 ? "sev-2" : s === 1 ? "sev-1" : "");

  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="label" style={{ margin: 0 }}>Vitals</span>
        <span className="hint data">
          {hasDeviceFeed() && provenance?.device
            ? `${provenance.device.label} · captured ${mins(ageMin)} ago`
            : "manual entry · no device feed at this site"}
          {stale && " · STALE"}
        </span>
      </div>

      <div className="vitals-grid">
        {ORDER.map((key) => {
          const val = v[key];
          const sev = sevOf(key);
          const fromDevice = hasDeviceFeed() && DEVICE_VITALS.includes(key);
          const range = ranges[key];
          const missing = val == null;

          return (
            <div
              key={key}
              className={[
                "vital",
                fromDevice ? "from-device" : "from-manual",
                missing ? "missing" : "",
                sevClass(sev),
              ].join(" ")}
            >
              <div className="vital-top">
                <span>{LABELS[key]}</span>
                <span className="vital-src">{fromDevice ? "Device" : "Manual"}</span>
              </div>

              {editable ? (
                <div className="row" style={{ gap: 4, alignItems: "baseline", flexWrap: "nowrap" }}>
                  <input
                    className="vital-input"
                    type="number"
                    step={key === "temp" ? "0.1" : "1"}
                    inputMode="decimal"
                    value={val ?? ""}
                    placeholder="-"
                    aria-label={LABELS[key]}
                    onChange={(e) => onVital(key, e.target.value === "" ? null : Number(e.target.value))}
                  />
                  <span className="vital-unit">{VITAL_UNITS[key]}</span>
                </div>
              ) : (
                <div className="vital-value">
                  {val == null ? "-" : key === "temp" ? Number(val).toFixed(1) : val}{" "}
                  <span className="vital-unit">{VITAL_UNITS[key]}</span>
                </div>
              )}

              <div className="vital-meta">
                {missing
                  ? "not recorded"
                  : key === "temp"
                  ? provenance?.tempRoute || "route not set"
                  : range
                  ? `normal ${range[0]}–${range[1]}`
                  : ""}
              </div>

              {/* Oxygen status lives with SpO2, because it only means anything
                  in relation to the SpO2 reading. NEWS2 adds 2 points when a
                  patient needs supplemental oxygen to hold that number. */}
              {key === "spo2" && editable && (
                <label className={`o2-inline ${v.onOxygen ? "on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={!!v.onOxygen}
                    onChange={(e) => onVital("onOxygen", e.target.checked)}
                  />
                  <span>On supplemental O2</span>
                  {v.onOxygen && <span className="o2-badge">NEWS2 +2</span>}
                </label>
              )}
              {key === "spo2" && !editable && v.onOxygen && (
                <div className="vital-meta" style={{ color: "var(--warn)" }}>on supplemental O2 (NEWS2 +2)</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="vitals-grid" style={{ gridTemplateColumns: "minmax(150px, 1fr)" }}>
        {/* Respiratory rate: counted manually (not supplied by a spot-check
            monitor), so it is a plain field like the others. */}
        {(() => {
          const sev = sevOf("respRate");
          const range = ranges.respRate;
          const missing = v.respRate == null;
          return (
            <div className={["vital", "from-manual", missing ? "missing" : "", sevClass(sev)].join(" ")}>
              <div className="vital-top">
                <span>Resp rate</span>
                <span className="vital-src">Manual</span>
              </div>
              {editable ? (
                <div className="row" style={{ gap: 4, alignItems: "baseline", flexWrap: "nowrap" }}>
                  <input
                    className="vital-input"
                    type="number"
                    inputMode="numeric"
                    value={v.respRate ?? ""}
                    placeholder="-"
                    aria-label="Respiratory rate"
                    onChange={(e) => onVital("respRate", e.target.value === "" ? null : Number(e.target.value))}
                  />
                  <span className="vital-unit">/min</span>
                </div>
              ) : (
                <div className="vital-value">{v.respRate ?? "-"} <span className="vital-unit">/min</span></div>
              )}
              <div className="vital-meta">
                {missing ? "not recorded (counted manually)" : range ? `normal ${range[0]}–${range[1]}` : ""}
              </div>
            </div>
          );
        })()}
      </div>

      {onConfirm && (
        <>
          <button
            className={confirmed ? "btn btn-block" : "btn btn-primary btn-block"}
            onClick={onConfirm}
            disabled={!confirmed && !canConfirm}
          >
            {confirmed ? "✓ Vitals confirmed" : "Confirm vitals to see recommendation"}
          </button>
          {!confirmed && !canConfirm && (
            <div className="hint" style={{ textAlign: "center", marginTop: 4 }}>
              Enter pulse, SpO2, respiratory rate and consciousness to continue.
            </div>
          )}
        </>
      )}
    </div>
  );
}
