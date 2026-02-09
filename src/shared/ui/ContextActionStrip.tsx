import React from "react";
import clsx from "clsx";

export function ContextActionStrip({
  title,
  actions,
  ariaLabel,
  sticky = false
}: {
  title?: React.ReactNode;
  actions: React.ReactNode;
  ariaLabel?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={clsx(
        "paper-secondary border-border-subtle bg-context-strip-bg p-3",
        sticky && "sticky top-[86px] z-10"
      )}
      role="region"
      aria-label={ariaLabel ?? "Context actions"}
      data-testid="lesson-context-action-strip"
    >
      {title ? <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">{title}</div> : null}
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}
