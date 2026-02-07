import React from "react";
import clsx from "clsx";

export function SectionPaper({
  children,
  className,
  tone = "primary"
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "primary" | "secondary" | "inset";
}) {
  return (
    <section
      className={clsx(
        tone === "primary" && "paper-primary",
        tone === "secondary" && "paper-secondary",
        tone === "inset" && "paper-inset",
        className
      )}
    >
      {children}
    </section>
  );
}
