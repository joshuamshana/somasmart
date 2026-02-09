import React from "react";
import clsx from "clsx";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";

type RowKey = string | number;

type ActionTone = "primary" | "secondary" | "destructive";

export type ResponsiveCollectionAction<T> = {
  label: React.ReactNode;
  tone?: ActionTone;
  onAction: (item: T) => void;
  disabled?: boolean | ((item: T) => boolean);
};

export type ResponsiveCollectionColumn<T> = {
  key: string;
  header: React.ReactNode;
  className?: string;
  cellClassName?: string;
  render: (item: T) => React.ReactNode;
};

export function ResponsiveCollection<T>({
  items,
  getKey,
  columns,
  renderListItem,
  selectedKey,
  onSelect,
  actions = [],
  emptyTitle,
  emptyDescription,
  ariaLabel,
  viewMode = "auto",
  breakpoint = "xl"
}: {
  items: T[];
  getKey: (item: T) => RowKey;
  columns: ResponsiveCollectionColumn<T>[];
  renderListItem: (item: T) => React.ReactNode;
  selectedKey?: RowKey | null;
  onSelect?: (item: T) => void;
  actions?: ResponsiveCollectionAction<T>[];
  emptyTitle?: string;
  emptyDescription?: string;
  ariaLabel?: string;
  viewMode?: "auto" | "table" | "list";
  breakpoint?: "xl" | "lg";
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const orderedActions = [...actions].sort((a, b) => toneRank(a.tone) - toneRank(b.tone));
  const selectable = Boolean(onSelect);
  const renderTable = viewMode !== "list";
  const renderList = viewMode !== "table";
  const tableVisibilityClass = viewMode === "table" ? "block" : breakpoint === "lg" ? "hidden lg:block" : "hidden xl:block";
  const listVisibilityClass = viewMode === "list" ? "block" : breakpoint === "lg" ? "lg:hidden" : "xl:hidden";

  return (
    <div className="space-y-3">
      {renderTable ? (
        <div className={clsx("overflow-auto rounded-lg border border-border-subtle bg-paper shadow-sm", tableVisibilityClass)}>
          <table className="min-w-full text-left text-sm text-text-body" aria-label={ariaLabel}>
            <thead className="bg-paper-2 text-xs font-semibold uppercase tracking-wide text-text-subtle">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className={clsx("px-4 py-3", column.className)}>
                    {column.header}
                  </th>
                ))}
                {orderedActions.length > 0 ? <th className="px-4 py-3 text-right">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const key = getKey(item);
                const selected = selectedKey !== null && selectedKey !== undefined && String(key) === String(selectedKey);
                return (
                  <tr
                    key={String(key)}
                    tabIndex={selectable ? 0 : undefined}
                    aria-selected={selectable ? selected : undefined}
                    className={clsx(
                      "border-t border-border-subtle transition-colors duration-base ease-[var(--ease-standard)]",
                      selectable &&
                        "cursor-pointer hover:bg-collection-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/70",
                      selected && "bg-collection-selected"
                    )}
                    onClick={selectable ? () => onSelect?.(item) : undefined}
                    onKeyDown={
                      selectable
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelect?.(item);
                            }
                          }
                        : undefined
                    }
                  >
                    {columns.map((column) => (
                      <td key={column.key} className={clsx("px-4 py-3 align-top", column.cellClassName)}>
                        {column.render(item)}
                      </td>
                    ))}
                    {orderedActions.length > 0 ? (
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          {orderedActions.map((action, index) => {
                            const disabled =
                              typeof action.disabled === "function" ? action.disabled(item) : Boolean(action.disabled);
                            return (
                              <Button
                                key={`${String(key)}-${index}`}
                                size="sm"
                                variant={toneToVariant(action.tone)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  action.onAction(item);
                                }}
                                disabled={disabled}
                              >
                                {action.label}
                              </Button>
                            );
                          })}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {renderList ? (
        <div className={clsx("space-y-3", listVisibilityClass)}>
          {items.map((item) => {
            const key = getKey(item);
            const selected = selectedKey !== null && selectedKey !== undefined && String(key) === String(selectedKey);
            return (
              <article
                key={String(key)}
                tabIndex={selectable ? 0 : undefined}
                aria-selected={selectable ? selected : undefined}
                className={clsx(
                  "rounded-lg border border-border-subtle bg-paper p-4 shadow-sm transition-colors duration-base ease-[var(--ease-standard)]",
                  selectable &&
                    "cursor-pointer hover:bg-collection-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary/70",
                  selected && "border-collection-selected-border bg-collection-selected"
                )}
                onClick={selectable ? () => onSelect?.(item) : undefined}
                onKeyDown={
                  selectable
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect?.(item);
                        }
                      }
                    : undefined
                }
              >
                <div className="space-y-3">{renderListItem(item)}</div>
                {orderedActions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border-subtle pt-3">
                    {orderedActions.map((action, index) => {
                      const disabled = typeof action.disabled === "function" ? action.disabled(item) : Boolean(action.disabled);
                      return (
                        <Button
                          key={`${String(key)}-mobile-${index}`}
                          size="sm"
                          variant={toneToVariant(action.tone)}
                          onClick={(event) => {
                            event.stopPropagation();
                            action.onAction(item);
                          }}
                          disabled={disabled}
                        >
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function toneRank(tone: ActionTone | undefined) {
  if (tone === "primary") return 0;
  if (tone === "secondary" || tone === undefined) return 1;
  return 2;
}

function toneToVariant(tone: ActionTone | undefined): "primary" | "secondary" | "danger" {
  if (tone === "primary") return "primary";
  if (tone === "destructive") return "danger";
  return "secondary";
}
