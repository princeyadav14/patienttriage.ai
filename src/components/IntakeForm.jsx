// IntakeForm - triage capture screen (left side of the Triage tab).
// Renders the patient header, the vitals block, and the observed block.
// Confirm is disabled until minimum vitals are present.
import React from "react";
import PatientHeader from "./PatientHeader";
import VitalsBlock from "./VitalsBlock";
import ObservedBlock from "./ObservedBlock";
import { patients as SAMPLE } from "../data/patients";
import { readDeviceFeed } from "../data/deviceFeed";

export default function IntakeForm({
  draft,
  clockMin,
  vitalsConfirmed,
  canConfirm = true,
  onPatch,
  onLoadSample,
  onConfirmVitals,
  onCancel,
}) {
  if (!draft) return null;

  const provenance = readDeviceFeed(draft, clockMin, draft._capturedAtMin ?? clockMin);

  const setField = (k, val) => onPatch({ [k]: val });
  const setVital = (k, val) => onPatch({ vitals: { ...draft.vitals, [k]: val } });

  return (
    <div className="panel">
      <PatientHeader
        patient={draft}
        clockMin={clockMin}
        arrivedAtMin={draft.arrivedAtMin}
      />

      <div className="panel-body stack" style={{ gap: 18 }}>
        <VitalsBlock
          patient={draft}
          provenance={provenance}
          clockMin={clockMin}
          onVital={setVital}
          onConfirm={onConfirmVitals}
          confirmed={vitalsConfirmed}
          canConfirm={canConfirm}
        />

        <ObservedBlock patient={draft} onField={setField} onVital={setVital} />

        <div className="row" style={{ justifyContent: "flex-end", borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
          <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
        </div>

        {/* ---- development tool, deliberately demoted ---------------------- */}
        <div style={{ borderTop: "1px dashed var(--rule-strong)", paddingTop: 11 }}>
          <span className="label" style={{ color: "var(--ink-3)" }}>
            Demo control · not part of the nurse workflow
          </span>
          <select
            className="select"
            value=""
            aria-label="Load a scenario"
            onChange={(e) => e.target.value && onLoadSample(e.target.value)}
          >
            <option value="">Load a scenario…</option>
            {SAMPLE.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.name} ({s.age < 1 ? `${Math.round(s.age * 12)}mo` : `${s.age}y`}): {s.demoTag}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
