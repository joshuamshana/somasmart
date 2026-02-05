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
    <div className="flex flex-col gap-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">{title}</h1>
          {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children ? <div>{children}</div> : null}
    </div>
  );
}

