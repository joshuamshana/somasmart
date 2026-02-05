import React, { forwardRef, useId } from "react";
import clsx from "clsx";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
    error?: string;
    children: React.ReactNode;
  }
>(function Select({ label, error, className, children, id, ...props }, ref) {
  const fallbackId = useId();
  const selectId = id ?? fallbackId;
  return (
    <div className="block">
      <label htmlFor={selectId} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      <select
        id={selectId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={clsx(
          "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text outline-none",
          error ? "border-danger" : "border-border focus:border-brand",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <div className="mt-1 text-xs text-danger">{error}</div> : null}
    </div>
  );
});
