// BoardView - the live waiting room and department home screen.
// Three lanes: not-yet-triaged arrivals, triaged patients waiting (with
// recheck clocks and status colouring), and patients in treatment. Includes
// filters, the surge control, and a safety counter-metric panel (escalation
// and override rates across the shift).
import React, { useMemo, useState } from "react";
import SITE from "../config/site";
import ConfidenceMeter from "./ConfidenceMeter";
import { ACUITY_META } from "./ui";
import { safeWaitFor, waitStatus, doorStatus, sortForBoard, alertVisible } from "../lib/store";
import { mins, ageLabel, ARRIVAL_MODE_LABEL } from "../lib/format";
import { RESAMPLE_OUTCOMES } from "../data/deviceFeed";

const FILTERS = [
  { key: "all",       label: "All" },
  { key: "acute",     label: "Level 1–2" },
  { key: "overdue",   label: "Recheck overdue" },
  { key: "lowconf",   label: "Low confidence" },
  { key: "escalated", label: "Escalated by safety rule" },
  { key: "paeds",     label: "Paediatric" },
];

export default function BoardView({
  queue,
  arrivals,
  clockMin,
  mode,
  stats,
  onTriageArrival,
  onReassess,
  onFocus,
  onTreat,
  onSimulateSurge,
}) {
  const [filter, setFilter] = useState("all");
  const [openReassess, setOpenReassess] = useState(null);

  const waiting = useMemo(
    () => sortForBoard(queue.filter((q) => q.status === "waiting"), clockMin),
    [queue, clockMin]
  );
  const treating = useMemo(
    () => sortForBoard(queue.filter((q) => q.status === "treatment"), clockMin),
    [queue, clockMin]
  );

  const matches = (item) => {
    switch (filter) {
      case "acute":     return item.acuity <= 2;
      case "overdue":   return waitStatus(item, clockMin, mode) !== "ok";
      case "lowconf":   return item.result.confidence.level === "Low";
      case "escalated": return item.result.safety.escalated;
      case "paeds":     return ["infant", "toddler", "child"].includes(item.result.ageBand);
      default:          return true;
    }
  };

  const shown = waiting.filter(matches);

  // How many alerts the surge policy is currently holding quiet. Named on the
  // banner so nobody has to take the suppression on trust.
  const suppressed = waiting.filter(
    (q) => waitStatus(q, clockMin, mode) !== "ok" && !alertVisible(q, mode)
  ).length;

  const counts = {
    acute: waiting.filter((q) => q.acuity <= 2).length,
    overdue: waiting.filter((q) => waitStatus(q, clockMin, mode) !== "ok").length,
    lowconf: waiting.filter((q) => q.result.confidence.level === "Low").length,
    escalated: waiting.filter((q) => q.result.safety.escalated).length,
    paeds: waiting.filter((q) => ["infant", "toddler", "child"].includes(q.result.ageBand)).length,
    all: waiting.length,
  };

  // Safety counter-metric: a system biased toward escalation must watch itself
  // for over-escalation. Computed across the whole triaged queue this shift.
  const triaged = queue.length;
  const escalations = queue.filter((q) => q.result.safety.escalated).length;
  const overrides = queue.filter((q) => q.overridden).length;
  const escalationRate = triaged ? Math.round((escalations / triaged) * 100) : 0;
  const overrideRate = triaged ? Math.round((overrides / triaged) * 100) : 0;

  return (
    <div className="stack" style={{ gap: 14 }}>
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Live board · {SITE.shortName}</span>
        <span className="panel-note">
          {stats.waiting} waiting · {stats.inTreatment} in treatment · {stats.awaitingTriage} awaiting triage
        </span>
      </div>

      {/* ---- surge changes BEHAVIOUR, and says exactly how -------------- */}
      {mode === "surge" && (
        <div className="surge-banner">
          <span className="sb-title">Surge active</span>
          <span className="sb-body">
            Arrival rate above the department threshold. Recheck intervals tightened
            by {Math.round((1 - SITE.surge.recheckTightenFactor) * 100)}% ·
            alerts at Level {SITE.surge.suppressAlertsAtOrBelowAcuity} and below suppressed ·
            batch re-assess enabled.{suppressed > 0 && <> <b>{suppressed} alert{suppressed === 1 ? "" : "s"} currently held quiet</b>,</>} and every suppression is logged. Silence is a decision too.
          </span>
          <span className="sb-meta">
            {clockMin - (stats.surgeSince ?? clockMin) < 1
              ? "just declared"
              : `since ${mins(clockMin - stats.surgeSince)} ago`} · queue untouched
          </span>
        </div>
      )}

      {/* ---- filters --------------------------------------------------- */}
      <div className="board-controls">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? "accent" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} · {counts[f.key] ?? 0}
          </button>
        ))}
        {mode === "surge" ? (
          <button className="btn btn-sm" onClick={onSimulateSurge} title="Add another wave of arrivals">
            Add more arrivals
          </button>
        ) : (
          onSimulateSurge && (
            <button className="btn btn-sm btn-danger" onClick={onSimulateSurge} title="Inject a 3x rush of arrivals and enter surge">
              Simulate 3x surge
            </button>
          )
        )}
        <span className="sortnote">sort: acuity, then wait</span>
      </div>

      <div className="table-scroll">
        <table className="board">
          <thead>
            <tr>
              <th style={{ width: 46 }}>Lvl</th>
              <th style={{ width: "20%" }}>Patient</th>
              <th style={{ width: "10%" }}>Band</th>
              <th style={{ width: "27%" }}>Why</th>
              <th style={{ width: "10%" }}>Confidence</th>
              <th style={{ width: "8%" }}>Waited</th>
              <th>Recheck</th>
            </tr>
          </thead>
          <tbody>
            {/* Lane 1: not yet triaged */}
            {arrivals.length > 0 && (
              <tr><td colSpan={7} className="lane-head">Not yet triaged · door clock running</td></tr>
            )}
            {arrivals.map((a) => {
              const st = doorStatus(a, clockMin);
              const waited = clockMin - a.arrivedAtMin;
              return (
                <tr key={a.id} className={st !== "ok" ? `wait-${st === "overdue" ? "overdue" : "due"}` : ""}>
                  <td><span className="acuity unknown">?</span></td>
                  <td>
                    <div className="pt-name">{a.name}</div>
                    <div className="pt-sub">{ageLabel(a.age)} · {a.mrn || "no MRN"}</div>
                  </td>
                  <td style={{ color: "var(--ink-3)" }}>{ARRIVAL_MODE_LABEL[a.arrivalMode]}</td>
                  <td className="why" style={{ color: "var(--ink-3)" }}>{a.note}</td>
                  <td><span className="status-ok">-</span></td>
                  <td className="num">{mins(waited)}</td>
                  <td>
                    <button
                      className={`flag ${st === "overdue" ? "" : st === "due" ? "due" : "quiet"}`}
                      onClick={() => onTriageArrival(a)}
                    >
                      {st === "ok"
                        ? "Start triage"
                        : `TRIAGE NOW · target ${SITE.doorToTriageTargetMinutes}m`}
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Lane 2: waiting */}
            <tr><td colSpan={7} className="lane-head">
              Waiting: triaged and monitored{filter !== "all" && ` · filtered to “${FILTERS.find((f) => f.key === filter).label}”`}
            </td></tr>

            {shown.length === 0 && (
              <tr><td colSpan={7} className="empty">No patients match this filter.</td></tr>
            )}

            {shown.map((item) => {
              const st = waitStatus(item, clockMin, mode);
              const safe = safeWaitFor(item.acuity, mode);
              const waited = clockMin - item.triagedAtMin;
              const since = clockMin - item.lastCheckMin;
              const meta = ACUITY_META[item.acuity];
              const r = item.result;
              const top = r.drivers[0];

              return (
                <tr key={item.key} className={st !== "ok" ? `wait-${st}` : ""}>
                  <td>
                    <span className={`acuity ${meta.cls}`} title={meta.long}>{item.acuity}</span>
                  </td>
                  <td>
                    <button
                      className="pt-name"
                      style={{ background: "none", border: 0, padding: 0, textAlign: "left" }}
                      onClick={() => onFocus(item.key)}
                    >
                      {item.record.name}
                    </button>
                    <div className="pt-sub">
                      {ageLabel(item.record.age)} · {item.record.mrn || "no MRN"}
                      {item.overridden && " · overridden"}
                      {item.nurseUnsure && " · flagged unsure"}
                    </div>
                  </td>
                  <td style={{ color: "var(--ink-3)" }}>{r.bandLabel}</td>
                  <td className="why">
                    {r.decidedBy === "rule-layer" ? (
                      <><b style={{ color: "var(--crit)" }}>Rule layer</b> · {top?.text}</>
                    ) : r.safety.escalated ? (
                      <><b style={{ color: "var(--accent)" }}>Escalated {r.acuityBeforeSafety} → {r.acuity}</b> · {r.confidence.level.toLowerCase()} confidence</>
                    ) : (
                      top?.text || "All vitals normal for age"
                    )}
                  </td>
                  <td><ConfidenceMeter confidence={r.confidence} size="sm" showValue={false} /></td>
                  <td className="num">{mins(waited)}</td>
                  <td>
                    {st === "ok" ? (
                      <div className="row" style={{ gap: 6 }}>
                        <span className="status-ok">Due in {mins(safe - since)}</span>
                        <button className="btn btn-sm" onClick={() => onTreat(item.key)}>Treat</button>
                      </div>
                    ) : !alertVisible(item, mode) ? (
                      /* The surge banner says routine alerts are suppressed.
                         This is where that becomes true rather than decorative:
                         the row still exists and still carries its clock, but it
                         stops shouting. The suppression is visible and counted,
                         because silence has to be as auditable as noise. */
                      <span className="flag quiet" title="Suppressed while the department is in surge. The clock is still running.">
                        Alert quiet · surge · {mins(since - safe)} past
                      </span>
                    ) : (
                      <div className="row" style={{ gap: 6 }}>
                        <button
                          className={`flag ${st === "due" ? "due" : ""}`}
                          onClick={() => setOpenReassess(openReassess === item.key ? null : item.key)}
                        >
                          {/* A Level 1 has a safe wait of zero, so "safe wait 0m"
                              is a true sentence that reads like a bug. Say the
                              thing it actually means. */}
                          {safe === 0
                            ? "RESUS NOW · should not be waiting"
                            : st === "overdue"
                            ? "RE-ASSESS NOW"
                            : `Recheck due · safe wait ${mins(safe)}`}
                        </button>
                        {openReassess === item.key && (
                          <span className="row" style={{ gap: 4 }}>
                            {RESAMPLE_OUTCOMES.map((o) => (
                              <button
                                key={o.key}
                                className="chip"
                                title={o.hint}
                                onClick={() => { onReassess(item.key, o.key); setOpenReassess(null); }}
                              >
                                {o.label}
                              </button>
                            ))}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Lane 3: in treatment */}
            {treating.length > 0 && (
              <tr><td colSpan={7} className="lane-head">In treatment · off the waiting clock</td></tr>
            )}
            {treating.map((item) => {
              const meta = ACUITY_META[item.acuity];
              return (
                <tr key={item.key} style={{ opacity: 0.72 }}>
                  <td><span className={`acuity ${meta.cls}`}>{item.acuity}</span></td>
                  <td>
                    <div className="pt-name">{item.record.name}</div>
                    <div className="pt-sub">{ageLabel(item.record.age)} · {item.record.mrn || "no MRN"}</div>
                  </td>
                  <td style={{ color: "var(--ink-3)" }}>{item.result.bandLabel}</td>
                  <td className="why" style={{ color: "var(--ink-3)" }}>{item.record.complaint}</td>
                  <td><ConfidenceMeter confidence={item.result.confidence} size="sm" showValue={false} /></td>
                  <td className="num">{mins(clockMin - item.triagedAtMin)}</td>
                  <td><span className="status-ok">In treatment</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel-body" style={{ borderTop: "1px solid var(--rule)" }}>
        <div className="hint">
          Amber rows have passed the safe wait for their level; red rows are well past it. A recheck
          re-runs the same two-layer engine on fresh observations, and it can return
          "no change", which is the result a system nobody trusts never produces.
        </div>
      </div>
    </div>

    {triaged > 0 && (
      <div className="panel">
        <div className="panel-head">
          <span className="panel-title">Safety counter-metric</span>
          <span className="panel-note">watch over-triage, not just misses</span>
        </div>
        <div className="panel-body stack">
          <div className="metric-grid">
            <div className={`metric ${escalationRate > 33 ? "watch" : "good"}`}>
              <div className="m-k">Escalation rate</div>
              <div className="m-v">{escalationRate}%</div>
              <div className="m-n">{escalations} of {triaged} raised by the safety rule</div>
            </div>
            <div className="metric">
              <div className="m-k">Override rate</div>
              <div className="m-v">{overrideRate}%</div>
              <div className="m-n">{overrides} of {triaged} changed by a clinician</div>
            </div>
          </div>
          <div className="hint">
            This system is deliberately biased toward escalation, because under-triage and
            over-triage do not cost the same. That same bias is how a well-meaning sepsis model
            becomes noise, so the rate is measured in the open.
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
