import React from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "danger";
type ButtonSize = "sm" | "md" | "lg";
type ButtonTone = "primary" | "secondary" | "neutral" | "danger";
type ButtonPriority = "solid" | "soft" | "ghost";

export function Button({
  variant,
  tone,
  priority,
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  tone?: ButtonTone;
  priority?: ButtonPriority;
  size?: ButtonSize;
}) {
  const derivedTone: ButtonTone =
    tone ??
    (variant === "danger"
      ? "danger"
      : variant === "secondary"
        ? "secondary"
        : variant === "primary"
          ? "primary"
          : "primary");

  const derivedPriority: ButtonPriority =
    priority ??
    (variant === "secondary" ? "soft" : variant === "danger" ? "solid" : variant === "primary" ? "solid" : "solid");

  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-semibold",
        "transition-colors duration-base ease-[var(--ease-standard)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/80 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-11 px-5 text-sm",
        derivedTone === "primary" &&
          derivedPriority === "solid" &&
          "bg-action-primary text-action-primary-fg hover:bg-action-primary-hover active:bg-action-primary-active",
        derivedTone === "primary" &&
          derivedPriority === "soft" &&
          "bg-action-primary/14 text-action-primary-active hover:bg-action-primary/22 active:bg-action-primary/30",
        derivedTone === "primary" &&
          derivedPriority === "ghost" &&
          "bg-transparent text-action-primary-active hover:bg-action-primary/12 active:bg-action-primary/18",
        derivedTone === "secondary" &&
          derivedPriority === "solid" &&
          "bg-action-secondary text-action-secondary-fg hover:bg-action-secondary-hover active:bg-action-secondary-active",
        derivedTone === "secondary" &&
          derivedPriority === "soft" &&
          "bg-paper-2 text-text-title hover:bg-inset active:bg-inset/90",
        derivedTone === "secondary" &&
          derivedPriority === "ghost" &&
          "bg-transparent text-text-body hover:bg-paper-2 active:bg-inset",
        derivedTone === "neutral" &&
          derivedPriority === "solid" &&
          "bg-paper-2 text-text-title hover:bg-inset active:bg-inset/90",
        derivedTone === "neutral" &&
          derivedPriority === "soft" &&
          "bg-canvas text-text-body hover:bg-paper-2 active:bg-inset",
        derivedTone === "neutral" &&
          derivedPriority === "ghost" &&
          "bg-transparent text-text-subtle hover:bg-paper-2 active:bg-inset",
        derivedTone === "danger" &&
          derivedPriority === "solid" &&
          "bg-status-danger text-text-inverse hover:bg-status-danger/85 active:bg-status-danger/75",
        derivedTone === "danger" &&
          derivedPriority === "soft" &&
          "bg-status-danger-bg text-status-danger hover:bg-status-danger-bg/80 active:bg-status-danger-bg/70",
        derivedTone === "danger" &&
          derivedPriority === "ghost" &&
          "bg-transparent text-status-danger hover:bg-status-danger-bg/70 active:bg-status-danger-bg",
        className
      )}
      {...props}
    />
  );
}
