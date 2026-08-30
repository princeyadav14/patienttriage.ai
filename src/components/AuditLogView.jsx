// AuditLogView - the audit log screen (role-restricted).
// Wraps the AuditLog list with a header. Every triage decision is recorded
// here for review.
import React from "react";
import AuditLog from "./AuditLog";

export default function AuditLogView({ log }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Audit log</span>
        <span className="panel-note">
          {log.length} {log.length === 1 ? "entry" : "entries"} this shift
        </span>
      </div>
      <div className="panel-body tight">
        <AuditLog log={log} />
      </div>
    </div>
  );
}
