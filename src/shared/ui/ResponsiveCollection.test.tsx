import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResponsiveCollection } from "@/shared/ui/ResponsiveCollection";

type Row = {
  id: string;
  label: string;
};

const rows: Row[] = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" }
];

describe("ResponsiveCollection", () => {
  it("renders an empty state when no rows are provided", () => {
    render(
      <ResponsiveCollection<Row>
        items={[]}
        getKey={(row) => row.id}
        columns={[{ key: "label", header: "Label", render: (row) => row.label }]}
        renderListItem={(row) => row.label}
        emptyTitle="No rows"
        emptyDescription="Add one row to get started."
      />
    );

    expect(screen.getByText("No rows")).toBeInTheDocument();
    expect(screen.getByText("Add one row to get started.")).toBeInTheDocument();
  });

  it("sorts row actions by primary, secondary, destructive priority", () => {
    render(
      <ResponsiveCollection<Row>
        ariaLabel="Example rows"
        items={rows}
        getKey={(row) => row.id}
        columns={[{ key: "label", header: "Label", render: (row) => row.label }]}
        renderListItem={(row) => row.label}
        actions={[
          { label: "Delete", tone: "destructive", onAction: () => undefined },
          { label: "Secondary", tone: "secondary", onAction: () => undefined },
          { label: "Primary", tone: "primary", onAction: () => undefined }
        ]}
      />
    );

    const table = screen.getByRole("table", { name: "Example rows" });
    const labels = within(table)
      .getAllByRole("button")
      .slice(0, 3)
      .map((button) => button.textContent);
    expect(labels).toEqual(["Primary", "Secondary", "Delete"]);
  });

  it("marks selected rows and supports click + keyboard selection", () => {
    const onSelect = vi.fn();
    render(
      <ResponsiveCollection<Row>
        ariaLabel="Selectable rows"
        items={rows}
        getKey={(row) => row.id}
        columns={[{ key: "label", header: "Label", render: (row) => row.label }]}
        renderListItem={(row) => row.label}
        selectedKey="a"
        onSelect={onSelect}
      />
    );

    const table = screen.getByRole("table", { name: "Selectable rows" });
    const dataRows = within(table).getAllByRole("row").slice(1);
    expect(dataRows[0]).toHaveClass("bg-collection-selected");

    fireEvent.click(dataRows[1]!);
    fireEvent.keyDown(dataRows[1]!, { key: "Enter" });
    fireEvent.keyDown(dataRows[1]!, { key: " " });

    expect(onSelect).toHaveBeenCalledTimes(3);
    expect(onSelect).toHaveBeenCalledWith(rows[1]);
  });

  it("supports explicit list mode without rendering table markup", () => {
    render(
      <ResponsiveCollection<Row>
        ariaLabel="List only rows"
        items={rows}
        viewMode="list"
        getKey={(row) => row.id}
        columns={[{ key: "label", header: "Label", render: (row) => row.label }]}
        renderListItem={(row) => row.label}
      />
    );

    expect(screen.queryByRole("table", { name: "List only rows" })).not.toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("uses the configured breakpoint class in auto mode", () => {
    render(
      <ResponsiveCollection<Row>
        ariaLabel="Breakpoint rows"
        items={rows}
        breakpoint="lg"
        getKey={(row) => row.id}
        columns={[{ key: "label", header: "Label", render: (row) => row.label }]}
        renderListItem={(row) => row.label}
      />
    );

    const table = screen.getByRole("table", { name: "Breakpoint rows" });
    expect(table.closest("div")).toHaveClass("hidden");
    expect(table.closest("div")).toHaveClass("lg:block");
  });
});
