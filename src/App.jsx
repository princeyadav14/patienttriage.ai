// App - application shell and routing.
// Holds top-level state via useReducer (see lib/store.js), runs a simulated
// department clock (one minute per few seconds) so timers advance during use,
// and renders the three tabs: Board, Triage, and Audit Log. Triage flow:
// select or start a patient, confirm vitals, then commit an acuity decision.
import React, { useEffect, useMemo, useReducer, useState } from "react";

import { triage } from "./engine/triageEngine";
import { patients as SAMPLE } from "./data/patients";
import { reducer, initialState, selectStats } from "./lib/store";

import StatusBar from "./components/StatusBar";
import IntakeForm from "./components/IntakeForm";
import RecommendationCard from "./components/RecommendationCard";
import BoardView from "./components/BoardView";
import PatientView from "./components/PatientView";
import AuditLogView from "./components/AuditLogView";

const TICK_MS = 3000;

// Minimum data required before a nurse can confirm and see a recommendation.
// The NEWS2 backbone: heart rate, SpO2, respiratory rate, and a consciousness
// level. BP and temperature may be missing (the engine handles that through
// lower confidence). This stops "confirm" working on an empty form.
function hasMinimumVitals(draft) {
  const v = (draft && draft.vitals) || {};
  const hasNum = (x) => x != null && x !== "";
  return hasNum(v.heartRate) && hasNum(v.spo2) && hasNum(v.respRate) && !!v.consciousness;
}

const BLANK_PATIENT = {
  id: null,
  mrn: null,
  name: "",
  age: "",
  sex: "F",
  complaint: "",
  pain: null,
  history: "first-time",
  appearance: null,
  arrivalMode: "walk-in",
  comorbidities: [],
  nurseUnsure: false,
  vitals: {
    respRate: null, spo2: null, sbp: null,
    heartRate: null, temp: null,
    consciousness: "alert", onOxygen: false,
  },
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [vitalsConfirmed, setVitalsConfirmed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // --- the department clock ------------------------------------------------
  useEffect(() => {
    const t = setInterval(() => dispatch({ type: "TICK" }), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => selectStats(state), [state]);

  // --- live assessment -----------------------------------------------------
  // The recommendation is recomputed on every keystroke and every tap, so the
  // was pressed.
  const liveResult = useMemo(() => {
    const d = state.activeDraft;
    if (!d) return null;
    const hasSomething =
      d.complaint?.trim() ||
      Object.entries(d.vitals || {}).some(([k, v]) => k !== "consciousness" && k !== "onOxygen" && v != null);
    if (!hasSomething) return null;
    return triage(
      { ...d, age: d.age === "" || d.age == null ? 30 : Number(d.age) },
      { vitalsAgeMinutes: state.clockMin - (d._capturedAtMin ?? state.clockMin) }
    );
  }, [state.activeDraft, state.clockMin]);

  const focused = state.queue.find((q) => q.key === state.focusPatient) || null;

  // --- handlers ------------------------------------------------------------
  function startBlank() {
    setVitalsConfirmed(false); setRevealed(false);
    dispatch({
      type: "START_TRIAGE",
      draft: { ...BLANK_PATIENT, id: `NEW-${state.clockMin}`, _capturedAtMin: state.clockMin, arrivedAtMin: state.clockMin },
    });
  }

  function startFromArrival(arrival) {
    setVitalsConfirmed(false); setRevealed(false);
    dispatch({
      type: "START_TRIAGE",
      arrivalId: arrival.id,
      draft: {
        ...BLANK_PATIENT,
        id: arrival.id,
        mrn: arrival.mrn,
        name: arrival.name,
        age: arrival.age,
        sex: arrival.sex,
        arrivalMode: arrival.arrivalMode,
        history: arrival.mrn ? "known" : "first-time",
        arrivedAtMin: arrival.arrivedAtMin,
        _capturedAtMin: state.clockMin,
      },
    });
  }

  function loadSample(id) {
    const s = SAMPLE.find((p) => p.id === id);
    if (!s) return;
    setVitalsConfirmed(false); setRevealed(false);
    dispatch({
      type: "UPDATE_DRAFT",
      patch: {
        ...JSON.parse(JSON.stringify(s)),
        arrivedAtMin: Math.max(0, state.clockMin - (s.arrivedAt ?? 5)),
        _capturedAtMin: state.clockMin,
        nurseUnsure: false,
      },
    });
  }

  function commit({ clinicianAcuity, reason, note, unsure }) {
    const d = state.activeDraft;
    const record = {
      ...d,
      age: d.age === "" || d.age == null ? 30 : Number(d.age),
      name: d.name?.trim() || "Unidentified patient",
      nurseUnsure: !!unsure,
    };
    dispatch({
      type: "COMMIT",
      record,
      result: triage(record),
      clinicianAcuity,
      reason,
      note,
      unsure,
    });
    setVitalsConfirmed(false); setRevealed(false);
  }

  const tabs = [
    { key: "board", label: "Board", count: stats.waiting + stats.awaitingTriage },
    { key: "triage", label: "Triage", count: state.activeDraft ? 1 : 0 },
    { key: "governance", label: "Audit Log", count: state.log.length, locked: true },
  ];

  return (
    <div className="app">
      <StatusBar
        stats={stats}
        mode={state.mode}
        clockMin={state.clockMin}
        onToggleSurge={() => dispatch({ type: "SET_SURGE", on: state.mode !== "surge" })}
      />

      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab ${state.tab === t.key ? "active" : ""} ${t.locked ? "locked" : ""}`}
            onClick={() => dispatch({ type: "SET_TAB", tab: t.key })}
            title={t.locked ? "Charge nurse / quality lead" : undefined}
          >
            {t.label}
            {t.count > 0 && <span className="count">{t.count}</span>}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="btn btn-sm btn-primary" style={{ margin: "0 0 0 8px" }} onClick={startBlank}>
          + New triage
        </button>
      </nav>

      <main className="container">
        {state.tab === "board" && (
          <BoardView
            queue={state.queue}
            arrivals={state.arrivals}
            clockMin={state.clockMin}
            mode={state.mode}
            stats={{ ...stats, surgeSince: state.surgeEnteredAtMin }}
            onTriageArrival={startFromArrival}
            onReassess={(key, outcome) => dispatch({ type: "REASSESS", key, outcome })}
            onFocus={(key) => dispatch({ type: "FOCUS_PATIENT", key })}
            onTreat={(key) => dispatch({ type: "MOVE_TO_TREATMENT", key })}
            onSimulateSurge={() => dispatch({ type: "SIMULATE_SURGE" })}
          />
        )}

        {state.tab === "triage" && (
          state.activeDraft ? (
            <div className="split">
              <IntakeForm
                draft={state.activeDraft}
                clockMin={state.clockMin}
                vitalsConfirmed={vitalsConfirmed}
                canConfirm={hasMinimumVitals(state.activeDraft)}
                onPatch={(patch) => dispatch({ type: "UPDATE_DRAFT", patch })}
                onLoadSample={loadSample}
                onConfirmVitals={() => { setVitalsConfirmed(true); setRevealed(true); }}
                onCancel={() => dispatch({ type: "CANCEL_TRIAGE" })}
              />
              <RecommendationCard
                result={revealed ? liveResult : null}
                awaitingConfirm={!revealed}
                patient={state.activeDraft}
                onCommit={commit}
                onToggleUnsure={() =>
                  dispatch({ type: "UPDATE_DRAFT", patch: { nurseUnsure: !state.activeDraft.nurseUnsure } })
                }
              />
            </div>
          ) : (
            <div className="panel">
              <div className="panel-head"><span className="panel-title">Triage</span></div>
              <div className="empty">
                No patient selected.
                <div style={{ marginTop: 14 }}>
                  <button className="btn btn-primary" onClick={startBlank}>Start a new triage</button>
                </div>
              </div>
            </div>
          )
        )}

        {state.tab === "patient" && (
          <PatientView
            item={focused}
            clockMin={state.clockMin}
            mode={state.mode}
            onReassess={(key, outcome) => dispatch({ type: "REASSESS", key, outcome })}
            onBack={() => dispatch({ type: "SET_TAB", tab: "board" })}
          />
        )}

        {state.tab === "governance" && <AuditLogView log={state.log} />}
      </main>
    </div>
  );
}
