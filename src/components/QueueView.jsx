import React from "react";
import { ACUITY_META, SAFE_WAIT_MINUTES, formatMins } from "./ui";

// Each queue item: { result, waitMins }
export default function QueueView({ queue, surge, onSurgeToggle, onReassess }) {
    // Compute live wait time (minutes) from each patient's arrival timestamp
  const withWaits = queue.map((item) => ({
    ...item,
    waitMins: Math.floor((Date.now() - item.arrivedAt) / 60000),
  }));

  // Sort by acuity (asc = most critical first), then by wait time (desc)
  const sorted = [...withWaits].sort((a, b) => {
    if (a.result.acuity !== b.result.acuity) return a.result.acuity - b.result.acuity;
    return b.waitMins - a.waitMins;
  });

  const capacityPct = Math.min(200, Math.round((queue.length / 10) * 100));

  function waitStatus(item) {
    const safe = SAFE_WAIT_MINUTES[item.result.acuity];
    if (item.waitMins >= safe && safe > 0) {
      // overdue
      if (item.waitMins >= safe * 1.5) return "red";
      return "amber";
    }
    return "ok";
  }

  return (
    <div className="panel">
      <div className="panel-title">Live Waiting Room</div>

      <div className="queue-controls">
        <button
          className={`surge-pill ${surge ? "on" : ""}`}
          onClick={onSurgeToggle}
        >
          {surge ? "● SURGE MODE ON (3×)" : "Simulate surge (3×)"}
        </button>
        <div className="cap-indicator">
          Department load: {capacityPct}%
          <div className="cap-bar">
            <div className="cap-fill" style={{ width: `${Math.min(100, capacityPct / 2)}%` }} />
          </div>
        </div>
        <div className="cap-indicator">{queue.length} patients waiting</div>
      </div>

      {queue.length === 0 ? (
        <div className="log-empty">
          No patients in the queue yet. Assess patients or turn on surge mode.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Acuity</th>
              <th>Patient</th>
              <th>Age band</th>
              <th>Confidence</th>
              <th>Waited</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => {
              const meta = ACUITY_META[item.result.acuity];
              const st = waitStatus(item);
              const safe = SAFE_WAIT_MINUTES[item.result.acuity];
              return (
                <tr key={item.result.patientId} className={st !== "ok" ? `row-wait-${st}` : ""}>
                  <td>
                    <span className={`acuity-dot ${meta.cls}`}>{meta.short}</span>
                  </td>
                  <td>
                    {item.result.name}
                    <div className="demo-tag">{item.result.patientId}</div>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{item.result.ageBand}</td>
                  <td>
                    <span className={`mini-conf conf-${item.result.confidence.level}`}>
                      {item.result.confidence.level}
                    </span>
                  </td>
                  <td>{formatMins(item.waitMins)}</td>
                  <td>
                    {st === "red" && (
                      <span className="wait-flag" onClick={() => onReassess(item)} style={{ cursor: "pointer" }}>
                        ⚠ RE-ASSESS NOW
                      </span>
                    )}
                    {st === "amber" && (
                      <span className="wait-flag due" onClick={() => onReassess(item)} style={{ cursor: "pointer" }}>
                        Recheck due (safe wait {formatMins(safe)})
                      </span>
                    )}
                    {st === "ok" && <span className="status-ok">Within safe wait</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="hint section-gap">
        Rows turn amber when a patient passes the safe-wait time for their acuity,
        and red when well overdue. Click a flag to simulate re-assessment (new
        vitals re-run the same two-layer engine).
      </div>
    </div>
  );
}
