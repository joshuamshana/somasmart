import React from "react";
import clsx from "clsx";

export function ResponsiveSplit({
  aside,
  main,
  className,
  asideWidth = "narrow"
}: {
  aside: React.ReactNode;
  main: React.ReactNode;
  className?: string;
  asideWidth?: "narrow" | "wide";
}) {
  return (
    <div
      className={clsx(
        "grid gap-4 xl:gap-5",
        asideWidth === "narrow" && "lg:grid-cols-[280px_minmax(0,1fr)]",
        asideWidth === "wide" && "lg:grid-cols-[340px_minmax(0,1fr)]",
        className
      )}
    >
      <div className="lg:sticky lg:top-[88px] lg:self-start">{aside}</div>
      <div className="min-w-0">{main}</div>
    </div>
  );
}
