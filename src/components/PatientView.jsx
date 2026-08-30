// PatientView - single-patient detail, opened from the board.
// Shows the patient's identity, a visit timeline (triage and reassessments
// over time), and their latest observations.
import React from "react";
import PatientHeader from "./PatientHeader";
import VitalsBlock from "./VitalsBlock";
import ConfidenceMeter from "./ConfidenceMeter";
import { ACUITY_META } from "./ui";
import { readDeviceFeed } from "../data/deviceFeed";
import { mins, clockLabel } from "../lib/format";
import { safeWaitFor, waitStatus } from "../lib/store";

export default function PatientView({ item, clockMin, mode, onReassess, onBack }) {
  if (!item) {
    return (
      <div className="panel">
        <div className="panel-head"><span className="panel-title">Patient</span></div>
        <div className="empty">Select a patient from the board to see their timeline.</div>
      </div>
    );
  }

  const r = item.result;
  const meta = ACUITY_META[item.acuity];
  const prov = readDeviceFeed(item.record, clockMin, item.vitalsCapturedAtMin);
  const st = waitStatus(item, clockMin, mode);
  const safe = safeWaitFor(item.acuity, mode);
  const since = clockMin - item.lastCheckMin;

  const events = [
    {
      at: item.record.arrivedAt != null ? item.triagedAtMin - 2 : item.triagedAtMin,
      body: <>Arrived · <b>{item.record.arrivalMode || "walk-in"}</b></>,
    },
    {
      at: item.triagedAtMin,
      body: (
        <>
          Triaged · system recommended <b>Level {item.systemAcuity}</b> ({r.confidence.level} confidence),
          clinician committed <b>Level {item.acuity}</b>
          {item.overridden && <> · overridden: {item.overrideReason}</>}
          {item.nurseUnsure && <> · flagged “not sure”</>}
        </>
      ),
    },
    ...item.reassessments.map((ra) => ({
      at: ra.atMin,
      body: (
        <>
          Re-assessed · observations <b>{ra.outcome}</b>
          {ra.from === ra.to ? <> · level unchanged at <b>{ra.to}</b></> : <> · <b>{ra.from} → {ra.to}</b></>}
        </>
      ),
    })),
  ].sort((a, b) => a.at - b.at);

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="panel">
        <PatientHeader patient={item.record} clockMin={clockMin} arrivedAtMin={item.triagedAtMin} />

        <div className="panel-body">
          <div className="metric-grid">
            <div className="metric">
              <div className="m-k">Current level</div>
              <div className="m-v" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span className={`acuity ${meta.cls}`}>{item.acuity}</span>
                <span style={{ fontSize: 16, fontFamily: "var(--font-ui)", fontWeight: 600 }}>{meta.label}</span>
              </div>
              <div className="m-n">
                {item.overridden ? `Clinician override from Level ${item.systemAcuity}` : "Accepted as recommended"}
              </div>
            </div>

            <div className="metric">
              <div className="m-k">Confidence</div>
              <div className="m-v" style={{ fontSize: 16, fontFamily: "var(--font-ui)" }}>
                <ConfidenceMeter confidence={r.confidence} />
              </div>
              <div className="m-n">{r.confidence.reasons.join(" · ")}</div>
            </div>

            <div className={`metric ${st === "overdue" ? "alert" : st === "due" ? "watch" : "good"}`}>
              <div className="m-k">Since last check</div>
              <div className="m-v">{mins(since)}</div>
              <div className="m-n">
                safe wait {mins(safe)}{mode === "surge" && " (tightened for surge)"}
              </div>
              <div className="bar-track">
                <i
                  className={st === "overdue" ? "crit" : st === "due" ? "warn" : ""}
                  style={{ width: `${Math.min(100, safe > 0 ? (since / safe) * 100 : 100)}%` }}
                />
              </div>
            </div>

            <div className="metric">
              <div className="m-k">Data completeness</div>
              <div className="m-v">{r.dataCompleteness.pct}%</div>
              <div className="m-n">
                {r.dataCompleteness.present} of {r.dataCompleteness.expected} inputs
                {r.dataCompleteness.missing.length > 0 && ` · missing ${r.dataCompleteness.missing.join(", ")}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Visit timeline</span>
            <span className="panel-note">{events.length} events</span>
          </div>
          <div className="panel-body">
            <div className="timeline">
              {events.map((e, i) => (
                <div className="tl-item" key={i}>
                  <span className="tl-time">{clockLabel(e.at)}</span>
                  <span className="tl-body">{e.body}</span>
                </div>
              ))}
            </div>

            <div className="row" style={{ marginTop: 14, gap: 7 }}>
              <span className="hint grow">Re-run the engine on fresh observations:</span>
              <button className="btn btn-sm" onClick={() => onReassess(item.key, "improved")}>Improved</button>
              <button className="btn btn-sm" onClick={() => onReassess(item.key, "unchanged")}>No change</button>
              <button className="btn btn-sm btn-danger" onClick={() => onReassess(item.key, "deteriorated")}>Deteriorated</button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <span className="panel-title">Latest observations</span>
            <span className="panel-note">captured {mins(clockMin - item.vitalsCapturedAtMin)} ago</span>
          </div>
          <div className="panel-body">
            <VitalsBlock
              patient={item.record}
              provenance={prov}
              clockMin={clockMin}
              onVital={() => {}}
              editable={false}
            />

            <div style={{ marginTop: 14 }}>
              <span className="label">Why this level</span>
              <div className="stack" style={{ gap: 7 }}>
                {r.drivers.map((d, i) => (
                  <div className="driver" key={i}>
                    <span className={`bar ${d.severity >= 3 ? "sev-3" : d.severity === 2 ? "sev-2" : d.severity === 1 ? "sev-1" : ""}`} />
                    <span className="txt">
                      <b>{d.text}</b>
                      {d.detail && <span className="detail">{d.detail}</span>}
                    </span>
                    {d.weight != null && <span className="weight">+{d.weight}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button className="btn" style={{ alignSelf: "flex-start" }} onClick={onBack}>← Back to board</button>
    </div>
  );
}
