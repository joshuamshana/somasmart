import React from "react";
import clsx from "clsx";

export function Card({
  title,
  children,
  actions,
  className,
  paper = "primary",
  density = "comfortable"
}: {
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  paper?: "primary" | "secondary" | "inset";
  density?: "comfortable" | "compact";
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border",
        paper === "primary" && "border-border-subtle bg-paper shadow-sm",
        paper === "secondary" && "border-border-subtle bg-paper-2 shadow-sm",
        paper === "inset" && "border-border-subtle bg-inset",
        density === "comfortable" && "p-5",
        density === "compact" && "p-4",
        className
      )}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="text-h3 text-text-title">{title}</div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}
