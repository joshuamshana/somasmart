import React from "react";
import clsx from "clsx";

export function AppContainer({
  children,
  className,
  maxWidth = "default"
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "default" | "wide";
}) {
  return (
    <div
      className={clsx(
        "mx-auto w-full px-4 sm:px-5 lg:px-7",
        maxWidth === "default" && "max-w-[1240px]",
        maxWidth === "wide" && "max-w-[1540px]",
        className
      )}
    >
      {children}
    </div>
  );
}
