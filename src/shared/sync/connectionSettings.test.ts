import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setSyncApiSessionTokens } from "@/shared/sync/api/syncApiSession";
import { getSyncDeviceId } from "@/shared/sync/config";
import { resetSyncConnectionOverride, saveSyncConnectionOverride } from "@/shared/sync/connectionSettings";

const originalPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

function tokenKey(suffix: "accessToken" | "refreshToken") {
  return `somasmart.sync.api.${getSyncDeviceId()}.${suffix}`;
}

describe("sync connection settings helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/?device=syncconnectiontest");
  });

  afterEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", originalPath || "/");
  });

  it("clears sync session tokens when saving override", () => {
    setSyncApiSessionTokens({ accessToken: "access_a", refreshToken: "refresh_a" });
    expect(localStorage.getItem(tokenKey("accessToken"))).toBe("access_a");

    const saved = saveSyncConnectionOverride({ baseUrl: "http://localhost:4000/customapi", projectKey: "tenant_a" });

    expect(saved.baseUrl).toBe("http://localhost:4000/customapi");
    expect(localStorage.getItem(tokenKey("accessToken"))).toBeNull();
    expect(localStorage.getItem(tokenKey("refreshToken"))).toBeNull();
  });

  it("clears sync session tokens when resetting override", () => {
    setSyncApiSessionTokens({ accessToken: "access_b", refreshToken: "refresh_b" });
    expect(localStorage.getItem(tokenKey("refreshToken"))).toBe("refresh_b");

    resetSyncConnectionOverride();

    expect(localStorage.getItem(tokenKey("accessToken"))).toBeNull();
    expect(localStorage.getItem(tokenKey("refreshToken"))).toBeNull();
  });
});
