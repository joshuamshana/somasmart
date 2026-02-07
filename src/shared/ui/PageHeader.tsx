import React from "react";

export function PageHeader({
  title,
  description,
  actions,
  children
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border-subtle pb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-h2 text-text-title">{title}</h1>
          {description ? <div className="text-sm text-text-subtle">{description}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children ? <div>{children}</div> : null}
    </div>
  );
}
