import React from "react";

export default function AuditLog({ log }) {
  return (
    <div className="panel">
      <div className="panel-title">Audit Log</div>
      {log.length === 0 ? (
        <div className="log-empty">
          Every accept and override is recorded here — what the system saw, what
          it recommended, and what the clinician decided.
        </div>
      ) : (
        log.map((e, i) => (
          <div className="log-entry" key={i}>
            <div className="log-head">
              <span className={`log-action ${e.action}`}>
                {e.action === "accept" ? "ACCEPTED" : "OVERRIDDEN"}
              </span>
              <span className="log-time">{e.time}</span>
            </div>
            <div className="log-detail">
              <b>{e.name}</b> ({e.patientId}) · AI recommended{" "}
              <b>Level {e.recommended}</b> ({e.confidence} confidence)
              {e.action === "override" && (
                <>
                  {" "}→ clinician set <b>Level {e.chosen}</b>
                  <br />
                  Reason: {e.reason}
                </>
              )}
              <br />
              <span style={{ color: "var(--muted)" }}>
                Drivers: {e.drivers.join(" | ")}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
