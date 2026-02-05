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
      <label htmlFor={inputId} className="mb-1 block text-sm text-muted">
        {label}
      </label>
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={clsx(
          "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text outline-none",
          error ? "border-danger" : "border-border focus:border-brand",
          className
        )}
        {...props}
      />
      {error ? <div className="mt-1 text-xs text-danger">{error}</div> : null}
    </div>
  );
});
