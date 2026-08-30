// ConfidenceMeter - reusable confidence indicator.
// Renders a High/Medium/Low level as a small segmented bar with a label,
// used wherever confidence is shown.
import React from "react";
import { CONFIDENCE_META } from "./ui";

export default function ConfidenceMeter({ confidence, size = "md", showValue = true }) {
  if (!confidence) return null;
  const meta = CONFIDENCE_META[confidence.level] || CONFIDENCE_META.Medium;

  return (
    <span
      className={`confidence ${meta.cls}`}
      title={confidence.reasons?.join(" · ")}
    >
      <span className={`conf-track ${size === "sm" ? "mini" : ""}`}>
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= meta.segments ? "on" : ""} />
        ))}
      </span>
      {showValue && <span className="conf-value">{confidence.level}</span>}
    </span>
  );
}
