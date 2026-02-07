import React from "react";
import clsx from "clsx";

export function ActionBar({
  children,
  stickyOnSmall = false,
  className
}: {
  children: React.ReactNode;
  stickyOnSmall?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "paper-secondary flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4",
        stickyOnSmall && "sticky bottom-0 z-20 mt-4 border bg-paper/95 backdrop-blur sm:static sm:bg-paper-2 sm:backdrop-blur-0",
        className
      )}
    >
      {children}
    </div>
  );
}
