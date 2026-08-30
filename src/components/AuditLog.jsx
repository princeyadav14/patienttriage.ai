// AuditLog - the list of recorded decisions.
// Each entry shows what the system recommended, its confidence and drivers,
// what the clinician committed, and any override reason, with a timestamp.
import React, { useState } from "react";
import { ACUITY_META } from "./ui";
import ConfidenceMeter from "./ConfidenceMeter";
import { clockLabel } from "../lib/format";

const ACTION_LABEL = {
  accept: "Accepted",
  override: "Overridden",
  reassess: "Re-assessed",
  "surge-on": "Surge declared",
  "surge-off": "Surge ended",
};

export default function AuditLog({ log, compact = false }) {
  const [filter, setFilter] = useState("all");

  const shown = log.filter((e) => (filter === "all" ? true : e.action === filter));
  const counts = {
    all: log.length,
    accept: log.filter((e) => e.action === "accept").length,
    override: log.filter((e) => e.action === "override").length,
    reassess: log.filter((e) => e.action === "reassess").length,
  };

  if (log.length === 0) {
    return (
      <div className="empty">
        Nothing recorded yet. Every accept, override, re-assessment and surge change lands here.
        what the system saw, what it recommended, how sure it was, and what the clinician decided.
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <div className="board-controls">
          {[
            { k: "all", l: "All" },
            { k: "accept", l: "Accepted" },
            { k: "override", l: "Overridden" },
            { k: "reassess", l: "Re-assessed" },
          ].map((f) => (
            <button
              key={f.k}
              className={`chip ${filter === f.k ? "accent" : ""}`}
              onClick={() => setFilter(f.k)}
            >
              {f.l} · {counts[f.k] ?? 0}
            </button>
          ))}
          <span className="sortnote">newest first · immutable</span>
        </div>
      )}

      {shown.map((e) => (
        <div className="log-entry" key={e.id}>
          <div className="log-head">
            <span className={`log-action ${e.action}`}>{ACTION_LABEL[e.action] || e.action}</span>
            <span className="log-id">{e.id}</span>
            {e.patient && (
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {e.patient.name}{" "}
                <span style={{ color: "var(--ink-3)", fontWeight: 400, fontFamily: "var(--font-data)", fontSize: 11 }}>
                  {e.patient.mrn || "no MRN"} · {e.patient.band}
                </span>
              </span>
            )}
            <span className="log-time">{clockLabel(e.atMin)}</span>
          </div>

          {e.system ? (
            <div className="log-grid">
              <div className="log-cell">
                <div className="k">What the system saw</div>
                <div className="v">
                  <span className="data">
                    {Object.entries(e.observed.vitals)
                      .filter(([k, v]) => v != null && k !== "onOxygen" && k !== "consciousness")
                      .map(([k, v]) => `${k} ${v}`)
                      .join(" · ")}
                  </span>
                  <br />
                  {e.observed.vitals.consciousness} · pain {e.observed.pain ?? "-"} · looks {e.observed.appearance || "n/a"}
                  <br />
                  <span style={{ color: "var(--ink-3)" }}>
                    {e.observed.completeness.present}/{e.observed.completeness.expected} inputs
                    {e.observed.completeness.missing.length > 0 && ` · missing ${e.observed.completeness.missing.join(", ")}`}
                  </span>
                </div>
              </div>

              <div className="log-cell">
                <div className="k">What it recommended</div>
                <div className="v">
                  <span className="row" style={{ gap: 7, marginBottom: 4 }}>
                    <span className={`acuity sm ${ACUITY_META[e.system.acuity].cls}`}>{e.system.acuity}</span>
                    <b>{ACUITY_META[e.system.acuity].label}</b>
                    <ConfidenceMeter
                      confidence={{ level: e.system.confidence, reasons: e.system.confidenceReasons }}
                      size="sm"
                    />
                  </span>
                  {e.system.decidedBy === "rule-layer" ? "Rule layer" : `Scoring layer · aggregate ${e.system.aggregate}`}
                  {e.system.escalated && <><br /><span style={{ color: "var(--accent)" }}>Escalated by the safety rule</span></>}
                  <br />
                  <span style={{ color: "var(--ink-3)" }}>{e.system.drivers.slice(0, 2).join(" · ")}</span>
                </div>
              </div>

              <div className="log-cell">
                <div className="k">What the clinician decided</div>
                <div className="v">
                  <span className="row" style={{ gap: 7, marginBottom: 4 }}>
                    <span className={`acuity sm ${ACUITY_META[e.clinician.acuity].cls}`}>{e.clinician.acuity}</span>
                    <b>{e.clinician.acuity === e.system.acuity ? "Accepted" : "Changed"}</b>
                  </span>
                  {e.clinician.reason && <>{e.clinician.reason}<br /></>}
                  {e.clinician.note && <span style={{ fontStyle: "italic" }}>“{e.clinician.note}”<br /></span>}
                  {e.clinician.unsure && <span style={{ color: "var(--warn)" }}>Flagged “not sure”<br /></span>}
                  <span style={{ color: "var(--ink-3)" }}>{e.clinician.actor}</span>
                </div>
              </div>

              <div className="log-cell">
                <div className="k">Governance</div>
                <div className="v">
                  Autonomy L{e.governance.autonomyLevel}
                  <br />
                  <span className="data">{e.governance.siteId}</span>
                  <br />
                  <span style={{ color: "var(--ink-3)" }}>{e.governance.jurisdiction}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="log-grid">
              <div className="log-cell">
                <div className="k">Department state change</div>
                <div className="v">
                  {e.surge.waiting} patients waiting.
                  {e.action === "surge-on"
                    ? ` Rechecks tightened to ${Math.round(e.surge.recheckFactor * 100)}% of policy; alerts at Level ${e.surge.suppressAtOrBelow} and below suppressed.`
                    : " Standard policy restored. No patient removed from the board."}
                  <br />
                  <span style={{ color: "var(--ink-3)" }}>{e.clinician.actor}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
