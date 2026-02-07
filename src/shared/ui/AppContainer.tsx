import React from "react";
import clsx from "clsx";

export function AppContainer({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mx-auto w-full max-w-[1240px] px-4 sm:px-5 lg:px-7", className)}>
      {children}
    </div>
  );
}
