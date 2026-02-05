import React from "react";

export function Card({
  title,
  children,
  actions
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="text-base font-semibold">{title}</div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}
