import React, { useState, useEffect } from "react";
import { triage } from "./engine/triageEngine";
import { patients as samplePatients } from "./data/patients";
import IntakeForm from "./components/IntakeForm";
import RecommendationCard from "./components/RecommendationCard";
import OverrideModal from "./components/OverrideModal";
import QueueView from "./components/QueueView";
import AuditLog from "./components/AuditLog";

export default function App() {
  const [tab, setTab] = useState("triage"); // triage | queue | log
  const [currentPatient, setCurrentPatient] = useState(null);
  const [result, setResult] = useState(null);
  const [showOverride, setShowOverride] = useState(false);

  const [queue, setQueue] = useState([]); // { result, waitMins }
    const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000); // refresh every 10s
    return () => clearInterval(id);
  }, []);
  const [log, setLog] = useState([]);
  const [surge, setSurge] = useState(false);

    function now() {
    return new Date().toLocaleString([], {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleAssess(patient) {
    const r = triage(patient);
    setCurrentPatient(patient);
    setResult(r);
  }

    function addToQueue(r) {
    setQueue((q) => {
      if (q.some((x) => x.result.patientId === r.patientId)) return q;
      return [...q, { result: r, arrivedAt: Date.now() }];
    });
  }

  function handleAccept() {
    if (!result) return;
    setLog((l) => [
      {
        action: "accept",
        time: now(),
        patientId: result.patientId,
        name: result.name,
        recommended: result.acuity,
        chosen: result.acuity,
        confidence: result.confidence.level,
        drivers: result.drivers,
      },
      ...l,
    ]);
    addToQueue(result, 0);
    setResult(null);
    setCurrentPatient(null);
  }

  function handleOverrideConfirm(level, reason) {
    const overridden = { ...result, acuity: level, overridden: true };
    setLog((l) => [
      {
        action: "override",
        time: now(),
        patientId: result.patientId,
        name: result.name,
        recommended: result.acuity,
        chosen: level,
        reason,
        confidence: result.confidence.level,
        drivers: result.drivers,
      },
      ...l,
    ]);
    addToQueue(overridden, 0);
    setShowOverride(false);
    setResult(null);
    setCurrentPatient(null);
  }

  // Surge: load 3x volume by triaging all sample patients (x3 with staggered waits)
  function toggleSurge() {
    if (surge) {
      setSurge(false);
      setQueue([]);
      return;
    }
    setSurge(true);
    const surgeQueue = [];
    for (let copy = 0; copy < 3; copy++) {
      for (const p of samplePatients) {
        const r = triage(p);
        // give a distinct id per copy so the queue is 3x
                const cloned = { ...r, patientId: `${r.patientId}-${copy + 1}` };
        // stagger arrival times into the past so wait times vary and climb
        const minsAgo = Math.floor(Math.random() * 90);
        surgeQueue.push({ result: cloned, arrivedAt: Date.now() - minsAgo * 60000 });
      }
    }
    setQueue(surgeQueue);
    setTab("queue");
  }

  // Simulate re-assessment: worsen vitals slightly and re-run engine
  function handleReassess(item) {
    // find the base sample patient to re-run with worsened vitals
    const baseId = item.result.patientId.split("-")[0];
    const base = samplePatients.find((p) => p.id === baseId);
    if (!base) {
      // just reset the wait
      setQueue((q) =>
        q.map((x) => (x.result.patientId === item.result.patientId ? { ...x, waitMins: 0 } : x))
      );
      return;
    }
    // worsen: drop SpO2, raise HR/RR to simulate deterioration
    const worse = JSON.parse(JSON.stringify(base));
    if (worse.vitals.spo2 != null) worse.vitals.spo2 = Math.max(85, worse.vitals.spo2 - 5);
    if (worse.vitals.heartRate != null) worse.vitals.heartRate += 15;
    if (worse.vitals.respRate != null) worse.vitals.respRate += 4;
    const r = triage(worse);
    const updated = { ...r, patientId: item.result.patientId };
    setQueue((q) =>
      q.map((x) => (x.result.patientId === item.result.patientId ? { result: updated, waitMins: 0 } : x))
    );
    setLog((l) => [
      {
        action: "accept",
        time: now(),
        patientId: item.result.patientId,
        name: item.result.name,
        recommended: updated.acuity,
        chosen: updated.acuity,
        confidence: updated.confidence.level,
        drivers: ["RE-ASSESSMENT: new vitals entered", ...updated.drivers.slice(0, 2)],
      },
      ...l,
    ]);
  }

  return (
    <div className="app">
      <div className="header">
        <div className="brand">
          <div className="brand-mark">+</div>
          <div>
            <div className="brand-name">PatientTriage.ai</div>
            <div className="brand-sub">It speaks when it matters.</div>
          </div>
        </div>
        <div className="tabs">
          <button className={`tab ${tab === "triage" ? "active" : ""}`} onClick={() => setTab("triage")}>
            Triage
          </button>
          <button className={`tab ${tab === "queue" ? "active" : ""}`} onClick={() => setTab("queue")}>
            Waiting Room {queue.length > 0 && `(${queue.length})`}
          </button>
          <button className={`tab ${tab === "log" ? "active" : ""}`} onClick={() => setTab("log")}>
            Audit Log {log.length > 0 && `(${log.length})`}
          </button>
        </div>
      </div>

      <div className="container">
        {tab === "triage" && (
          <div className="grid-2">
            <IntakeForm onAssess={handleAssess} />
            <RecommendationCard
              result={result}
              onAccept={handleAccept}
              onOverride={() => setShowOverride(true)}
            />
          </div>
        )}

        {tab === "queue" && (
          <QueueView
            queue={queue}
            surge={surge}
            onSurgeToggle={toggleSurge}
            onReassess={handleReassess}
          />
        )}

        {tab === "log" && <AuditLog log={log} />}
      </div>

      {showOverride && result && (
        <OverrideModal
          result={result}
          onConfirm={handleOverrideConfirm}
          onCancel={() => setShowOverride(false)}
        />
      )}
    </div>
  );
}
