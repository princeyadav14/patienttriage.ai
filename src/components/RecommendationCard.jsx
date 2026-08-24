import React from "react";
import { ACUITY_META } from "./ui";

export default function RecommendationCard({ result, onAccept, onOverride }) {
  if (!result) {
    return (
      <div className="panel">
        <div className="panel-title">AI Recommendation</div>
        <div className="rec-empty">
          Enter a patient and press <b>Assess patient</b> to see a recommendation.
        </div>
      </div>
    );
  }

  const meta = ACUITY_META[result.acuity];
  const isRule = result.decidedBy === "rule-layer";

  return (
    <div className="panel">
      <div className="panel-title">AI Recommendation</div>

      <div className={`acuity-badge ${meta.cls}`}>{meta.label}</div>

      {isRule && (
        <div className="redflag-banner">
          ⚠ Immediate flag from the rule layer — a hard danger sign was crossed.
          This fires regardless of any model confidence.
        </div>
      )}

      <div className="decided">
        <span className="decided-tag">
          Decided by: {isRule ? "Rule layer (deterministic)" : "Scoring layer"}
          {result.aggregateScore != null && ` · aggregate ${result.aggregateScore}`}
          {` · age band: ${result.ageBand}`}
        </span>
      </div>

      <div className="drivers">
        <h4>Why (top drivers)</h4>
        {result.drivers.map((d, i) => (
          <div
            key={i}
            className={`driver-item ${d.startsWith("Escalated") ? "safety" : ""}`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="conf">
        <h4>Confidence</h4>
        <span className={`conf-badge conf-${result.confidence.level}`}>
          {result.confidence.level} confidence
        </span>
        <div className="conf-reason">{result.confidence.reasons.join("; ")}</div>
      </div>

      <div className="actions">
        <button className="btn btn-accept" onClick={onAccept}>
          Accept & route
        </button>
        <button className="btn btn-override" onClick={onOverride}>
          Override
        </button>
      </div>
    </div>
  );
}
