import { describe, expect, it } from "vitest";
import {
  deriveAgeFromDob,
  isDobInRangeForRole,
  isValidMobile,
  normalizeMobile,
  requiresStudentGuardian
} from "@/shared/kyc/kyc";

describe("kyc utilities", () => {
  it("derives age from date of birth", () => {
    const now = new Date("2026-02-09T00:00:00.000Z");
    expect(deriveAgeFromDob("2010-02-10", now)).toBe(15);
    expect(deriveAgeFromDob("2010-02-09", now)).toBe(16);
  });

  it("normalizes and validates mobile values", () => {
    expect(normalizeMobile(" +255 700-111-222 ")).toBe("+255700111222");
    expect(isValidMobile("+255700111222")).toBe(true);
    expect(isValidMobile("0700")).toBe(false);
  });

  it("validates DOB ranges by role", () => {
    const now = new Date("2026-02-09T00:00:00.000Z");
    expect(isDobInRangeForRole("student", "2018-01-01", now)).toBe(true);
    expect(isDobInRangeForRole("student", "2025-01-01", now)).toBe(false);
    expect(isDobInRangeForRole("teacher", "2010-01-01", now)).toBe(false);
    expect(isDobInRangeForRole("teacher", "1990-01-01", now)).toBe(true);
  });

  it("requires guardian only for minors", () => {
    expect(requiresStudentGuardian(true)).toBe(true);
    expect(requiresStudentGuardian(false)).toBe(false);
  });
});

