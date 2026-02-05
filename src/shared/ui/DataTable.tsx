import React from "react";
import { EmptyState } from "@/shared/ui/EmptyState";

export function DataTable({
  columns,
  rows,
  emptyTitle,
  emptyDescription
}: {
  columns: React.ReactNode;
  rows: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const hasRows = React.Children.count(rows) > 0;
  return (
    <div className="overflow-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-surface2 text-xs text-muted">{columns}</thead>
        <tbody>{rows}</tbody>
      </table>
      {!hasRows ? (
        <div className="p-4">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : null}
    </div>
  );
}
