import { describe, expect, it } from "vitest";
import { getHomePathForRole, getHomePathForUser } from "@/features/auth/homeRoute";
import type { User } from "@/shared/types";

describe("homeRoute", () => {
  it("returns the correct path for each known role", () => {
    expect(getHomePathForRole("student")).toBe("/");
    expect(getHomePathForRole("teacher")).toBe("/teacher");
    expect(getHomePathForRole("admin")).toBe("/admin");
    expect(getHomePathForRole("school_admin")).toBe("/school");
  });

  it("returns / for unknown roles", () => {
    expect(getHomePathForRole("unknown" as never)).toBe("/");
  });

  it("derives the home path from a full user object", () => {
    const user: User = {
      id: "u_1",
      role: "teacher",
      status: "active",
      displayName: "Teacher",
      username: "teacher1",
      passwordHash: "hash",
      createdAt: "2026-01-01T00:00:00.000Z"
    };

    expect(getHomePathForUser(user)).toBe("/teacher");
  });
});
