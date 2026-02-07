import { afterEach, describe, expect, it } from "vitest";
import { getServerId } from "@/shared/server";

const originalPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

describe("getServerId", () => {
  afterEach(() => {
    window.history.replaceState({}, "", originalPath || "/");
  });

  it("returns null when no server query is present", () => {
    window.history.replaceState({}, "", "/");
    expect(getServerId()).toBeNull();
  });

  it("sanitizes and truncates the server id", () => {
    window.history.replaceState(
      {},
      "",
      "/?server=env!_01-ABC___really_long_value_abcdefghijklmnopqrstuvwxyz_1234567890"
    );
    expect(getServerId()).toBe("env_01-ABC___really_long_value_abcdefghijklmnopqrstuvwxyz_1234567890");
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
      expect(getServerId()).toBeNull();
    } finally {
      globalThis.URL = originalURL;
    }
  });
});
