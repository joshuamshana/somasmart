import { describe, expect, it } from "vitest";
import { getStepFromSearch, withStepInSearch } from "@/features/teacher/lessonBuilderStepQuery";

describe("lessonBuilderStepQuery", () => {
  it("defaults to metadata when step is missing or invalid", () => {
    expect(getStepFromSearch("")).toBe("metadata");
    expect(getStepFromSearch("?step=unknown")).toBe("metadata");
  });

  it("returns valid step from query", () => {
    expect(getStepFromSearch("?step=blocks")).toBe("blocks");
    expect(getStepFromSearch("?device=abc&step=preview")).toBe("preview");
  });

  it("preserves existing params while updating step", () => {
    expect(withStepInSearch("?device=1&server=2", "submit")).toBe("?device=1&server=2&step=submit");
    expect(withStepInSearch("?step=metadata", "blocks")).toBe("?step=blocks");
  });
});
