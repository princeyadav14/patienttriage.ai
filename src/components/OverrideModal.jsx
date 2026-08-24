import React, { useState } from "react";

const REASONS = [
  "Patient appears unwell / toxic",
  "Atypical presentation for age",
  "Clinical gut concern",
  "Social / safeguarding factor",
];

export default function OverrideModal({ result, onConfirm, onCancel }) {
  const [level, setLevel] = useState(result.acuity);
  const [reason, setReason] = useState(REASONS[0]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Override recommendation</h3>

        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
          AI recommended Level {result.acuity}. Select the level you assign:
        </div>

        <div className="level-picker">
          {[1, 2, 3, 4, 5].map((l) => (
            <button
              key={l}
              className={`level-btn ${level === l ? "sel" : ""}`}
              onClick={() => setLevel(l)}
            >
              {l}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
          Reason (one tap):
        </div>
        <div className="reason-list">
          {REASONS.map((r) => (
            <div
              key={r}
              className={`reason-opt ${reason === r ? "sel" : ""}`}
              onClick={() => setReason(r)}
            >
              {r}
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-override" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-accept"
            onClick={() => onConfirm(level, reason)}
          >
            Confirm override
          </button>
        </div>
      </div>
    </div>
  );
}
