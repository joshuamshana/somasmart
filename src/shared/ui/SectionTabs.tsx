import React, { useMemo, useRef } from "react";
import clsx from "clsx";

type SectionTabItem = {
  key: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export function SectionTabs({
  items,
  activeKey,
  onChange,
  ariaLabel,
  size = "md",
  scrollOnSmall = false
}: {
  items: SectionTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
  size?: "sm" | "md";
  scrollOnSmall?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = useMemo(() => items.findIndex((item) => item.key === activeKey), [activeKey, items]);

  function moveFocus(nextIndex: number) {
    const target = refs.current[nextIndex];
    if (!target) return;
    target.focus();
    if (!target.disabled) onChange(items[nextIndex]!.key);
  }

  return (
    <div
      className={clsx(
        "paper-secondary p-2",
        scrollOnSmall && "overflow-x-auto",
        scrollOnSmall && "[scrollbar-width:thin]"
      )}
      data-testid="lesson-section-tabs"
    >
      <div
        className={clsx("flex items-center gap-2", scrollOnSmall && "min-w-max")}
        role="tablist"
        aria-label={ariaLabel ?? "Lesson sections"}
      >
        {items.map((item, index) => {
          const selected = item.key === activeKey;
          return (
            <button
              key={item.key}
              ref={(node) => {
                refs.current[index] = node;
              }}
              id={`section-tab-${item.key}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`section-panel-${item.key}`}
              disabled={item.disabled}
              tabIndex={selected ? 0 : -1}
              className={clsx(
                "rounded-md border font-semibold transition-colors duration-base ease-[var(--ease-standard)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/70",
                size === "sm" && "h-9 px-3 text-xs",
                size === "md" && "h-10 px-4 text-sm",
                selected
                  ? "border-section-tab-active-border bg-section-tab-active-bg text-text-title"
                  : "border-border-subtle bg-section-tab-bg text-text-subtle hover:bg-section-tab-hover hover:text-text-title",
                item.disabled && "cursor-not-allowed opacity-50"
              )}
              onClick={() => onChange(item.key)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  moveFocus((index + 1) % items.length);
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  moveFocus((index - 1 + items.length) % items.length);
                } else if (event.key === "Home") {
                  event.preventDefault();
                  moveFocus(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  moveFocus(items.length - 1);
                } else if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!item.disabled) onChange(item.key);
                }
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeIndex >= 0 ? (
        <div className="sr-only" aria-live="polite">
          Active section: {String(items[activeIndex]?.label ?? "")}
        </div>
      ) : null}
    </div>
  );
}
