import React, { useState } from "react";
import { patients as samplePatients } from "../data/patients";

const BLANK = {
  id: "",
  name: "",
  age: "",
  sex: "M",
  complaint: "",
  pain: "",
  history: "known",
  ambiguous: false,
  vitals: { respRate: "", spo2: "", sbp: "", heartRate: "", temp: "", consciousness: "alert" },
};

export default function IntakeForm({ onAssess }) {
  const [p, setP] = useState(BLANK);

  function setVital(k, v) {
    setP((s) => ({ ...s, vitals: { ...s.vitals, [k]: v } }));
  }

  function loadSample(id) {
    const s = samplePatients.find((x) => x.id === id);
    if (s) setP(JSON.parse(JSON.stringify(s)));
  }

  function toNum(v) {
    return v === "" || v == null ? null : Number(v);
  }

  function assess() {
    const patient = {
      id: p.id || "NEW-" + Date.now().toString().slice(-4),
      name: p.name || "Unnamed patient",
      age: Number(p.age) || 0,
      sex: p.sex,
      complaint: p.complaint,
      pain: toNum(p.pain),
      history: p.history,
      ambiguous: !!p.ambiguous,
      vitals: {
        respRate: toNum(p.vitals.respRate),
        spo2: toNum(p.vitals.spo2),
        sbp: toNum(p.vitals.sbp),
        heartRate: toNum(p.vitals.heartRate),
        temp: toNum(p.vitals.temp),
        consciousness: p.vitals.consciousness,
      },
      demoTag: p.demoTag,
    };
    onAssess(patient);
  }

  return (
    <div className="panel">
      <div className="panel-title">Triage Intake</div>

      <div className="field">
        <label>Load a sample patient (for the demo)</label>
        <select value="" onChange={(e) => loadSample(e.target.value)}>
          <option value="">— choose a sample —</option>
          {samplePatients.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} · {s.name} (age {s.age}) — {s.demoTag}
            </option>
          ))}
        </select>
        <div className="hint">Or fill the fields manually below.</div>
      </div>

      <div className="row">
        <div className="field">
          <label>Name</label>
          <input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Age</label>
          <input type="number" value={p.age} onChange={(e) => setP({ ...p, age: e.target.value })} />
        </div>
      </div>

      <div className="field">
        <label>Presenting symptom / chief complaint</label>
        <input
          value={p.complaint}
          onChange={(e) => setP({ ...p, complaint: e.target.value })}
          placeholder="e.g. chest pain, fever, ankle injury"
        />
      </div>

      <div className="row-3">
        <div className="field">
          <label>Heart rate (bpm)</label>
          <input type="number" value={p.vitals.heartRate} onChange={(e) => setVital("heartRate", e.target.value)} />
        </div>
        <div className="field">
          <label>Resp rate (/min)</label>
          <input type="number" value={p.vitals.respRate} onChange={(e) => setVital("respRate", e.target.value)} />
        </div>
        <div className="field">
          <label>SpO2 (%)</label>
          <input type="number" value={p.vitals.spo2} onChange={(e) => setVital("spo2", e.target.value)} />
        </div>
      </div>

      <div className="row-3">
        <div className="field">
          <label>Systolic BP</label>
          <input type="number" value={p.vitals.sbp} onChange={(e) => setVital("sbp", e.target.value)} />
        </div>
        <div className="field">
          <label>Temp (°C)</label>
          <input type="number" step="0.1" value={p.vitals.temp} onChange={(e) => setVital("temp", e.target.value)} />
        </div>
        <div className="field">
          <label>Consciousness</label>
          <select value={p.vitals.consciousness} onChange={(e) => setVital("consciousness", e.target.value)}>
            <option value="alert">Alert</option>
            <option value="voice">Responds to voice</option>
            <option value="pain">Responds to pain</option>
            <option value="unresponsive">Unresponsive</option>
          </select>
        </div>
      </div>

      <div className="row-3">
        <div className="field">
          <label>Pain (0–10)</label>
          <input type="number" value={p.pain} onChange={(e) => setP({ ...p, pain: e.target.value })} />
        </div>
        <div className="field">
          <label>History</label>
          <select value={p.history} onChange={(e) => setP({ ...p, history: e.target.value })}>
            <option value="known">Known patient</option>
            <option value="first-time">First-time (no record)</option>
          </select>
        </div>
        <div className="field">
          <label>Ambiguous?</label>
          <select
            value={p.ambiguous ? "yes" : "no"}
            onChange={(e) => setP({ ...p, ambiguous: e.target.value === "yes" })}
          >
            <option value="no">No</option>
            <option value="yes">Yes (vague presentation)</option>
          </select>
        </div>
      </div>

      <button className="btn btn-primary" onClick={assess}>
        Assess patient
      </button>
    </div>
  );
}
