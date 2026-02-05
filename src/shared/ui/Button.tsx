import React from "react";
import clsx from "clsx";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-brand text-surface hover:bg-brand/90",
        variant === "secondary" && "bg-surface2 text-text hover:bg-surface2/80",
        variant === "danger" && "bg-danger text-text hover:bg-danger/90",
        className
      )}
      {...props}
    />
  );
}
