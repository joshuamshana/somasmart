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
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "success" && "border-status-success-border bg-status-success-bg text-status-success",
        tone === "warning" && "border-status-warning-border bg-status-warning-bg text-status-warning",
        tone === "danger" && "border-status-danger-border bg-status-danger-bg text-status-danger",
        tone === "info" && "border-status-info-border bg-status-info-bg text-status-info",
        tone === "muted" && "border-border-subtle bg-paper-2 text-text-subtle"
      )}
    >
      {value}
    </span>
  );
}
