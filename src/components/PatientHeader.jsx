// PatientHeader - identity band shown above a patient's details.
// Name, age, sex, MRN, and time since arrival.
import React from "react";
import { initials, ageLabel, mins, ARRIVAL_MODE_LABEL } from "../lib/format";
import { BAND_META, getAgeBand } from "../engine/thresholds";
import { hasEhrFeed } from "../config/site";

export default function PatientHeader({ patient, clockMin, arrivedAtMin }) {
  if (!patient) return null;

  const band = getAgeBand(patient.age);
  const bandMeta = BAND_META[band];
  const hasRecord = patient.history !== "first-time";
  const waited = arrivedAtMin != null ? clockMin - arrivedAtMin : null;

  return (
    <div className="identity">
      <div className="avatar">{initials(patient.name)}</div>

      <div>
        <div className="who-name">
          {patient.name || "Unidentified patient"}{" "}
          <span className="age">
            {ageLabel(patient.age)} · {patient.sex || "-"}
          </span>
        </div>
        <div className="who-meta">
          {patient.mrn || "no MRN · identity unconfirmed"}
          {arrivedAtMin != null && ` · arrived ${mins(waited)} ago`}
          {patient.arrivalMode && ` · ${ARRIVAL_MODE_LABEL[patient.arrivalMode] || patient.arrivalMode}`}
        </div>
      </div>

      <div className="chips">
        <span className="chip accent" title={`Scored against the ${bandMeta.label.toLowerCase()} table (${bandMeta.range})`}>
          {bandMeta.label} band
        </span>

        {hasRecord ? (
          <span className="chip">
            Record on file
            {hasEhrFeed() && patient.comorbidities?.length
              ? ` · ${patient.comorbidities.length} condition${patient.comorbidities.length > 1 ? "s" : ""}`
              : ""}
          </span>
        ) : (
          <span className="chip warn">First attendance · no record</span>
        )}

        {/* Free signal from the EHR that v1 collected nowhere and used nowhere. */}
        {hasEhrFeed() &&
          (patient.comorbidities || []).slice(0, 2).map((c) => (
            <span key={c} className="chip warn">{c}</span>
          ))}
      </div>
    </div>
  );
}
