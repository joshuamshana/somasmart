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
      <label htmlFor={selectId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-subtle">
        {label}
      </label>
      <select
        id={selectId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={clsx(
          "h-11 w-full rounded-md border bg-paper px-3 text-sm text-text-title",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70",
          error ? "border-status-danger" : "border-border-subtle focus-visible:border-brand",
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <div className="mt-1 text-caption font-medium text-status-danger">{error}</div> : null}
    </div>
  );
});
