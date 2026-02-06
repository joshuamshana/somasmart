import { describe, expect, it } from "vitest";
import { getSafeNextFromSearch, isSafeInternalNext } from "@/features/auth/nextRoute";

describe("nextRoute", () => {
  it("accepts safe internal paths", () => {
    expect(isSafeInternalNext("/student/lessons/abc?device=x")).toBe(true);
    expect(getSafeNextFromSearch("?next=%2Fstudent%2Flessons%2Fabc%3Fdevice%3Dx")).toBe(
      "/student/lessons/abc?device=x"
    );
  });

  it("rejects empty or non-internal values", () => {
    expect(isSafeInternalNext("")).toBe(false);
    expect(isSafeInternalNext("student/lessons")).toBe(false);
    expect(getSafeNextFromSearch("?next=")).toBe(null);
  });

  it("rejects protocol and protocol-relative redirects", () => {
    expect(isSafeInternalNext("http://evil.com")).toBe(false);
    expect(isSafeInternalNext("https://evil.com")).toBe(false);
    expect(isSafeInternalNext("//evil.com")).toBe(false);
    expect(getSafeNextFromSearch("?next=https%3A%2F%2Fevil.com")).toBe(null);
    expect(getSafeNextFromSearch("?next=%2F%2Fevil.com")).toBe(null);
  });
});

