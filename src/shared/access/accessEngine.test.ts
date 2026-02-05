import { describe, expect, it } from "vitest";
import { canAccessLesson } from "@/shared/access/accessEngine";
import type { Lesson, LicenseGrant } from "@/shared/types";

const lesson: Lesson = {
  id: "l1",
  title: "t",
  subject: "Math",
  level: "Primary",
  language: "en",
  tags: [],
  description: "",
  status: "approved",
  createdByUserId: "u1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe("canAccessLesson", () => {
  it("allows trial lessons without grants", () => {
    const res = canAccessLesson({ lesson: { ...lesson, tags: ["trial"] }, grants: [] });
    expect(res.allowed).toBe(true);
  });

  it("denies without grants", () => {
    const res = canAccessLesson({ lesson, grants: [] });
    expect(res.allowed).toBe(false);
  });

  it("allows with full grant", () => {
    const g: LicenseGrant = {
      id: "g1",
      studentId: "s1",
      scope: { type: "full" },
      validUntil: new Date(Date.now() + 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    const res = canAccessLesson({ lesson, grants: [g] });
    expect(res.allowed).toBe(true);
  });
});

