import React from "react";

export function Toolbar({
  left,
  right
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="paper-secondary flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
      <div className="flex-1">{left}</div>
      {right ? <div className="shrink-0 text-sm text-text-subtle">{right}</div> : null}
    </div>
  );
}
