// ObservedBlock - the inputs a nurse supplies directly.
// Presenting complaint (free text plus quick chips), consciousness (ACVPU),
// general appearance, and pain score. Consciousness and appearance feed
// deterministic safety rules; pain feeds ESI decision point B.
import React from "react";
import SITE from "../config/site";
import { ACVPU_OPTIONS, APPEARANCE_OPTIONS } from "../lib/format";

export default function ObservedBlock({ patient, onField, onVital }) {
  const v = patient.vitals || {};
  const pain = patient.pain;

  return (
    <div className="stack" style={{ gap: 13 }}>
      <span className="label" style={{ margin: 0 }}>Observed</span>

      {/* -- chief complaint ---------------------------------------------- */}
      <div>
        <label className="label" htmlFor="complaint">Presenting complaint</label>
        <input
          id="complaint"
          className="input"
          value={patient.complaint || ""}
          placeholder="in the patient's own words"
          onChange={(e) => onField("complaint", e.target.value)}
        />
        <div className="row" style={{ gap: 5, marginTop: 6 }}>
          {SITE.quickComplaints.map((c) => (
            <button
              key={c}
              className={`chip ${patient.complaint === c ? "on" : ""}`}
              onClick={() => onField("complaint", c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* -- ACVPU --------------------------------------------------------- */}
      <div>
        <span className="label">Consciousness (ACVPU)</span>
        {/* Alert is the safe state; styling it red would teach the nurse the
            wrong thing at a glance. Only a non-alert selection turns the
            control into a warning. */}
        <div className={`seg ${v.consciousness && v.consciousness !== "alert" ? "crit" : ""}`}>
          {ACVPU_OPTIONS.map((o) => (
            <button
              key={o.key}
              className={v.consciousness === o.key ? "on" : ""}
              onClick={() => onVital("consciousness", o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
        {v.consciousness && v.consciousness !== "alert" && (
          <div className="hint" style={{ marginTop: 5, color: "var(--crit)" }}>
            Anything other than Alert is a deterministic red flag. This fires on its own.
          </div>
        )}
      </div>

      {/* -- general appearance -------------------------------------------- */}
      <div>
        <span className="label">General appearance</span>
        <div className="seg accent">
          {APPEARANCE_OPTIONS.map((o) => (
            <button
              key={o.key}
              className={patient.appearance === o.key ? "on" : ""}
              onClick={() => onField("appearance", o.key)}
              title={o.hint}
            >
              {o.label}
            </button>
          ))}
        </div>
        {patient.appearance === "sick" && (
          <div className="hint" style={{ marginTop: 5, color: "var(--warn)" }}>
            Capped at Level {SITE.safety.sickAppearanceCeilingAcuity}. Your judgement outranks the score.
          </div>
        )}
      </div>

      {/* -- pain ----------------------------------------------------------- */}
      <div>
        <span className="label">Pain now (0–10)</span>
        <div className="pain-scale">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              className={`${pain === n ? "on" : ""} ${n >= SITE.safety.severePainScore ? "severe" : ""}`}
              onClick={() => onField("pain", n)}
            >
              {n}
            </button>
          ))}
        </div>
        {pain != null && pain >= SITE.safety.severePainScore && (
          <div className="hint" style={{ marginTop: 5, color: "var(--crit)" }}>
            Severe pain. ESI decision point B caps this at Level {SITE.safety.severePainCeilingAcuity} regardless of vitals.
          </div>
        )}
      </div>

    </div>
  );
}
