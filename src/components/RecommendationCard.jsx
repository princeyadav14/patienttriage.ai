// RecommendationCard - the recommendation and the nurse's decision.
// Shows the recommended acuity level, the layer that produced it, the scoring
// drivers with their weights, and a confidence indicator. The nurse's own
// acuity field sits directly below with an inline override (level plus reason).
// The recommendation appears once vitals are confirmed, then updates live.
import React, { useEffect, useState } from "react";
import SITE from "../config/site";
import ConfidenceMeter from "./ConfidenceMeter";
import { ACUITY_META, LAYER_META, prefillsNurseField, showsScoringLayer, severityClass } from "./ui";

export default function RecommendationCard({
  result,
  patient,
  awaitingConfirm,
  onCommit,
  onToggleUnsure,
  disabled,
}) {
  const [chosen, setChosen] = useState(null);
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState("");

  // At autonomy L3 the field is pre-filled with the recommendation; at L2 it
  // starts blank. That single difference is the anchoring experiment, and it is
  // config, not code: see SITE.autonomyLevel.
  useEffect(() => {
    if (!result) { setChosen(null); return; }
    setChosen(prefillsNurseField() ? result.acuity : null);
    setReason(null);
    setNote("");
  }, [result?.patientId, result?.acuity, result?.decidedBy]);

  if (!result) {
    return (
      <div className="panel">
        <div className="panel-head"><span className="panel-title">Assessment</span></div>
        {awaitingConfirm ? (
          <div className="empty">
            Review the vitals and observations on the left, then press
            <b> Confirm vitals</b> to see the recommendation.
          </div>
        ) : (
          <div className="empty">Open a patient from the board to begin an assessment.</div>
        )}
      </div>
    );
  }

  const meta = ACUITY_META[result.acuity];
  const layer = LAYER_META[result.decidedBy];
  const isRule = result.decidedBy === "rule-layer";
  const overriding = chosen != null && chosen !== result.acuity;
  const canCommit = chosen != null && (!overriding || !!reason);

  const commit = () =>
    onCommit({
      clinicianAcuity: chosen,
      reason: overriding ? reason : null,
      note: note.trim() || null,
      unsure: !!patient?.nurseUnsure,
    });

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="rec">
        {/* ---- headline ------------------------------------------------- */}
        <div className="rec-top">
          <span className={`acuity lg ${meta.cls}`}>{result.acuity}</span>
          <div className="rec-title">
            <div className="rec-level">{meta.label}</div>
            <div className="rec-sub">
              {layer.label}
              {result.aggregateScore != null && ` · aggregate ${result.aggregateScore}`}
              {` · ${result.bandLabel.toLowerCase()} table`}
            </div>
          </div>
        </div>

        {/* ---- rule layer gets its own treatment ------------------------ */}
        {isRule && (
          <div className="redflag-banner">
            <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden="true">▲</span>
            <span>
              <span className="rf-title">Immediate flag: {result.pathway || "critical"} pathway</span>
              <span className="rf-note">{layer.note}</span>
            </span>
          </div>
        )}

        {/* ---- confidence, always, never optional ----------------------- */}
        <div className="rec-conf">
          <span className="label" style={{ margin: 0 }}>Confidence</span>
          <ConfidenceMeter confidence={result.confidence} />
          <span className="why">{result.confidence.reasons.join(" · ")}</span>
        </div>

        {/* ---- drivers, heaviest first ---------------------------------- */}
        {showsScoringLayer() || isRule ? (
          <div className="drivers">
            {result.drivers.map((d, i) => (
              <div key={i} className={`driver ${d.kind}`}>
                <span className={`bar ${severityClass(d.severity)}`} />
                <span className="txt">
                  <b>{d.text}</b>
                  {d.detail && <span className="detail">{d.detail}</span>}
                </span>
                {d.weight != null && <span className="weight">+{d.weight}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="drivers">
            <div className="hint">
              This site runs at autonomy {SITE.autonomyLevel}. The scoring layer is recording but not
              displayed; only deterministic red flags are shown.
            </div>
          </div>
        )}

        {/* ---- data completeness: honest about what it does not know ---- */}
        {result.dataCompleteness.missing.length > 0 && (
          <div className="rec-conf" style={{ borderBottom: 0 }}>
            <span className="label" style={{ margin: 0 }}>Data</span>
            <span className="hint">
              {result.dataCompleteness.present} of {result.dataCompleteness.expected} inputs ·
              missing {result.dataCompleteness.missing.join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* ================= THE NURSE'S OWN DECISION ===================== */}
      <div className="nurse-block">
        <div className="nurse-q">Your acuity for this patient</div>

        <div className="level-picker">
          {[1, 2, 3, 4, 5].map((l) => (
            <button
              key={l}
              className={`${chosen === l ? `on ${ACUITY_META[l].cls}` : ""}`}
              onClick={() => setChosen(l)}
              title={ACUITY_META[l].desc}
            >
              {l}
              {result.acuity === l && <span className="rec-dot" aria-label="recommended" />}
            </button>
          ))}
        </div>

        <div className="hint">
          {prefillsNurseField()
            ? "Pre-set to the recommendation. Change it and a reason list appears. Nothing is recorded until you commit."
            : "Choose your level first. The recommendation is above, and the dot marks it."}
        </div>

        {/* ---- inline override: two taps, no modal --------------------- */}
        {overriding && (
          <div className="override-inline">
            <span className="label" style={{ margin: 0 }}>
              Overriding Level {result.acuity} → Level {chosen}. Why?
            </span>
            <div className="reason-list">
              {SITE.overrideReasons.map((r) => (
                <button
                  key={r}
                  className={`reason-opt ${reason === r ? "on" : ""}`}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              className="textarea"
              placeholder="Anything else worth recording (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}

        <div className="row" style={{ gap: 7, flexWrap: "nowrap" }}>
          <button
            className="btn btn-primary grow"
            disabled={disabled || !canCommit}
            onClick={commit}
          >
            {overriding
              ? `Commit override · Level ${chosen}`
              : chosen == null
              ? "Choose a level"
              : `Accept Level ${chosen} & route`}
          </button>
          {overriding && (
            <button className="btn" onClick={() => { setChosen(result.acuity); setReason(null); }}>
              Reset
            </button>
          )}
        </div>

        {onToggleUnsure && (
          <button
            className={`checkline ${patient?.nurseUnsure ? "on" : ""}`}
            onClick={onToggleUnsure}
          >
            <span className="box">{patient?.nurseUnsure ? "✓" : ""}</span>
            <span>
              <b>I'm not sure about this one.</b> Recorded with the decision, and it shortens the recheck clock.
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
