import React from "react";

export function EmptyState({
  title = "Nothing here yet",
  description
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6 text-center">
      <div className="text-sm font-semibold text-text">{title}</div>
      {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
    </div>
  );
}

