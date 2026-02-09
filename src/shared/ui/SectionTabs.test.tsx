import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SectionTabs } from "@/shared/ui/SectionTabs";

describe("SectionTabs", () => {
  const items = [
    { key: "metadata", label: "1. Metadata" },
    { key: "blocks", label: "2. Blocks" },
    { key: "preview", label: "3. Preview" }
  ];

  it("renders tabs with selected state", () => {
    render(<SectionTabs items={items} activeKey="blocks" onChange={() => undefined} ariaLabel="Lesson sections" />);

    const tab = screen.getByRole("tab", { name: "2. Blocks" });
    expect(tab).toHaveAttribute("aria-selected", "true");
  });

  it("calls onChange for click and keyboard navigation", () => {
    const onChange = vi.fn();
    render(<SectionTabs items={items} activeKey="metadata" onChange={onChange} ariaLabel="Lesson sections" />);

    const metadata = screen.getByRole("tab", { name: "1. Metadata" });
    fireEvent.keyDown(metadata, { key: "ArrowRight" });
    fireEvent.keyDown(metadata, { key: "End" });
    fireEvent.keyDown(metadata, { key: "Home" });
    fireEvent.click(screen.getByRole("tab", { name: "2. Blocks" }));

    expect(onChange).toHaveBeenCalledWith("blocks");
    expect(onChange).toHaveBeenCalledWith("preview");
    expect(onChange).toHaveBeenCalledWith("metadata");
  });

  it("enables horizontal-scroll shell when requested", () => {
    const { container } = render(<SectionTabs items={items} activeKey="metadata" onChange={() => undefined} scrollOnSmall />);
    expect(container.querySelector("[data-testid='lesson-section-tabs']")).toHaveClass("overflow-x-auto");
  });
});
