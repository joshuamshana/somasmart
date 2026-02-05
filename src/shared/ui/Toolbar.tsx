import React from "react";

export function Toolbar({
  left,
  right
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 md:flex-row md:items-end md:justify-between">
      <div className="flex-1">{left}</div>
      {right ? <div className="shrink-0 text-sm text-muted">{right}</div> : null}
    </div>
  );
}

