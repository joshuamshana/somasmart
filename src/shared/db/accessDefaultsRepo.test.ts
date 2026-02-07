import { describe, expect, it, vi } from "vitest";
import type { AppSetting } from "@/shared/types";
import { getSubjectAccessDefaultsByCurriculumSubjectId } from "@/shared/db/accessDefaultsRepo";

const { settingsRows } = vi.hoisted(() => {
  return { settingsRows: [] as AppSetting[] };
});

vi.mock("@/shared/db/db", () => ({
  db: {
    settings: {
      toArray: vi.fn(async () => settingsRows)
    }
  }
}));

describe("accessDefaultsRepo", () => {
  it("extracts only valid access defaults from settings", async () => {
    settingsRows.splice(0, settingsRows.length);
    settingsRows.push(
      { key: "access.subjectDefault.subj_a", value: { policy: "free" }, updatedAt: "2026-01-01T00:00:00.000Z" },
      { key: "access.subjectDefault.subj_b", value: { policy: "coupon" }, updatedAt: "2026-01-01T00:00:00.000Z" },
      { key: "access.subjectDefault.subj_bad", value: { policy: "invalid" }, updatedAt: "2026-01-01T00:00:00.000Z" },
      { key: "access.subjectDefault.", value: { policy: "free" }, updatedAt: "2026-01-01T00:00:00.000Z" },
      { key: "other.setting", value: { policy: "free" }, updatedAt: "2026-01-01T00:00:00.000Z" }
    );

    await expect(getSubjectAccessDefaultsByCurriculumSubjectId()).resolves.toEqual({
      subj_a: "free",
      subj_b: "coupon"
    });
  });
});
