import React from "react";
import clsx from "clsx";

export function StatusPill({
  value
}: {
  value: string;
}) {
  const v = value.toLowerCase();
  const tone =
    v.includes("active") || v.includes("approved") || v.includes("verified")
      ? "success"
      : v.includes("pending")
        ? "warning"
        : v.includes("rejected") || v.includes("suspended") || v.includes("inactive") || v.includes("danger")
          ? "danger"
          : v.includes("draft") || v.includes("unpublished")
            ? "info"
            : "muted";

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "success" && "border-success/30 bg-success/10 text-success",
        tone === "warning" && "border-warning/30 bg-warning/10 text-warning",
        tone === "danger" && "border-danger/30 bg-danger/10 text-danger",
        tone === "info" && "border-info/30 bg-info/10 text-info",
        tone === "muted" && "border-border bg-surface2 text-muted"
      )}
    >
      {value}
    </span>
  );
}

