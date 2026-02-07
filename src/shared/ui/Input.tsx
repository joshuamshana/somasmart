import React, { forwardRef, useId } from "react";
import clsx from "clsx";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }
>(function Input({ label, error, className, id, ...props }, ref) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  return (
    <div className="block">
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-subtle">
        {label}
      </label>
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={clsx(
          "h-11 w-full rounded-md border bg-paper px-3 text-sm text-text-title",
          "placeholder:text-text-subtle/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70",
          error ? "border-status-danger" : "border-border-subtle focus-visible:border-brand",
          className
        )}
        {...props}
      />
      {error ? <div className="mt-1 text-caption font-medium text-status-danger">{error}</div> : null}
    </div>
  );
});
