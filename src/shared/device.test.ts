import { afterEach, describe, expect, it } from "vitest";
import { getDeviceId } from "@/shared/device";

const originalPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

describe("getDeviceId", () => {
  afterEach(() => {
    window.history.replaceState({}, "", originalPath || "/");
  });

  it("returns null when no device query is present", () => {
    window.history.replaceState({}, "", "/");
    expect(getDeviceId()).toBeNull();
  });

  it("sanitizes and truncates the device id", () => {
    window.history.replaceState({}, "", "/?device=dev!ce_123-ABC__too_long_value_1234567890");
    expect(getDeviceId()).toBe("devce_123-ABC__too_long_value_12");
  });

  it("returns null when URL parsing fails", () => {
    const originalURL = globalThis.URL;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).URL = class BrokenUrl {
      constructor() {
        throw new Error("broken");
      }
    };
    try {
      expect(getDeviceId()).toBeNull();
    } finally {
      globalThis.URL = originalURL;
    }
  });
});
