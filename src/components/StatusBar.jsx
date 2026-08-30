// StatusBar - persistent top strip.
// Shows the department clock and live counts (waiting, awaiting triage,
// longest wait, rechecks overdue), plus a toggle button to switch between
// normal and surge mode.
import React from "react";
import { mins, clockLabel } from "../lib/format";

export default function StatusBar({ stats, mode, clockMin, onToggleSurge }) {
  return (
    <div className="statusbar">
      <div className="brand">
        <span className="brand-mark">+</span>
        <span className="brand-name">PatientTriage</span>
      </div>

      <span className="stat">
        {clockLabel(clockMin)}
      </span>
      <span className="stat">
        Waiting <b>{stats.waiting}</b>
      </span>
      <span className={`stat ${stats.awaitingTriage > 0 ? "watch" : ""}`}>
        Awaiting triage <b>{stats.awaitingTriage}</b>
      </span>
      <span className="stat">
        Longest wait <b>{mins(stats.longestWait)}</b>
      </span>
      <span className={`stat ${stats.overdue > 0 ? "alert" : ""}`}>
        Rechecks overdue <b>{stats.overdue}</b>
      </span>

      <span className="spacer" />

      <button
        className={`mode-toggle ${mode === "surge" ? "surge" : "normal"}`}
        onClick={onToggleSurge}
        title={
          mode === "surge"
            ? "Click to leave surge. The queue is untouched."
            : "Click to enter surge mode."
        }
      >
        <span className="mode-dot" />
        {mode === "surge" ? "SURGE MODE" : "NORMAL MODE"}
        <span className="mode-switch">{mode === "surge" ? "tap to exit" : "tap to enter"}</span>
      </button>
    </div>
  );
}
