import { beforeEach, describe, expect, it, vi } from "vitest";
import type { School } from "@/shared/types";
import { getSchoolByCode, getSchoolById } from "@/shared/db/schoolsRepo";

const { schoolsRows } = vi.hoisted(() => {
  return { schoolsRows: [] as School[] };
});

vi.mock("@/shared/db/db", () => ({
  db: {
    schools: {
      toArray: vi.fn(async () => schoolsRows),
      get: vi.fn(async (id: string) => schoolsRows.find((s) => s.id === id))
    }
  }
}));

describe("schoolsRepo", () => {
  beforeEach(() => {
    schoolsRows.splice(0, schoolsRows.length);
    schoolsRows.push(
      {
        id: "school_1",
        name: "Alpha",
        code: "SOMA001",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "school_2",
        name: "Deleted",
        code: "SOMA002",
        deletedAt: "2026-01-02T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    );
  });

  it("finds active school by case-insensitive code", async () => {
    const row = await getSchoolByCode("  soma001 ");
    expect(row?.id).toBe("school_1");
  });

  it("returns null when code matches only a deleted school", async () => {
    const row = await getSchoolByCode("soma002");
    expect(row).toBeNull();
  });

  it("returns school by id unless deleted", async () => {
    await expect(getSchoolById("school_1")).resolves.toMatchObject({ id: "school_1" });
    await expect(getSchoolById("school_2")).resolves.toBeNull();
    await expect(getSchoolById("missing")).resolves.toBeNull();
  });
});
