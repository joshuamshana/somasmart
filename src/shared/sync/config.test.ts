import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_SYNC_API_BASE_URL,
  DEFAULT_SYNC_PROJECT_KEY,
  clearSyncConnectionOverride,
  getEffectiveSyncConnection,
  getSyncApiBaseUrl,
  getSyncProjectKey,
  setSyncConnectionOverride
} from "@/shared/sync/config";

const originalPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
const env = import.meta.env as Record<string, string | undefined>;
const originalEnv = {
  baseUrl: env.VITE_SYNC_API_URL,
  projectKey: env.VITE_SYNC_PROJECT_KEY,
  deviceId: env.VITE_SYNC_DEVICE_ID
};

describe("sync config connection override", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/?device=cfgtestdevice");
    delete env.VITE_SYNC_API_URL;
    delete env.VITE_SYNC_PROJECT_KEY;
    delete env.VITE_SYNC_DEVICE_ID;
  });

  afterEach(() => {
    clearSyncConnectionOverride();
    window.history.replaceState({}, "", originalPath || "/");
    if (originalEnv.baseUrl === undefined) {
      delete env.VITE_SYNC_API_URL;
    } else {
      env.VITE_SYNC_API_URL = originalEnv.baseUrl;
    }
    if (originalEnv.projectKey === undefined) {
      delete env.VITE_SYNC_PROJECT_KEY;
    } else {
      env.VITE_SYNC_PROJECT_KEY = originalEnv.projectKey;
    }
    if (originalEnv.deviceId === undefined) {
      delete env.VITE_SYNC_DEVICE_ID;
    } else {
      env.VITE_SYNC_DEVICE_ID = originalEnv.deviceId;
    }
  });

  it("uses defaults with no env and no runtime override", () => {
    expect(getSyncApiBaseUrl()).toBe(DEFAULT_SYNC_API_BASE_URL);
    expect(getSyncProjectKey()).toBe(DEFAULT_SYNC_PROJECT_KEY);
    const effective = getEffectiveSyncConnection();
    expect(effective.source.baseUrl).toBe("default");
    expect(effective.source.projectKey).toBe("default");
    expect(effective.hasRuntimeOverride).toBe(false);
  });

  it("uses env values when runtime override is absent", () => {
    env.VITE_SYNC_API_URL = "https://tenant.example.com/api/";
    env.VITE_SYNC_PROJECT_KEY = "tenant_proj";

    expect(getSyncApiBaseUrl()).toBe("https://tenant.example.com/api");
    expect(getSyncProjectKey()).toBe("tenant_proj");
    const effective = getEffectiveSyncConnection();
    expect(effective.source.baseUrl).toBe("env");
    expect(effective.source.projectKey).toBe("env");
    expect(effective.hasRuntimeOverride).toBe(false);
  });

  it("prefers runtime override over env values", () => {
    env.VITE_SYNC_API_URL = "https://env.example.com/api";
    env.VITE_SYNC_PROJECT_KEY = "env_project";

    setSyncConnectionOverride({ baseUrl: "http://localhost:4000/custom-api", projectKey: "runtime_project" });

    expect(getSyncApiBaseUrl()).toBe("http://localhost:4000/custom-api");
    expect(getSyncProjectKey()).toBe("runtime_project");
    const effective = getEffectiveSyncConnection();
    expect(effective.source.baseUrl).toBe("runtime_override");
    expect(effective.source.projectKey).toBe("runtime_override");
    expect(effective.hasRuntimeOverride).toBe(true);
  });

  it("rejects invalid values", () => {
    expect(() => setSyncConnectionOverride({ baseUrl: "ftp://example.com", projectKey: "ok_key" })).toThrow(
      "Backend URL must use http or https protocol (e.g. http://localhost:4000)."
    );
    expect(() => setSyncConnectionOverride({ baseUrl: "/api", projectKey: "ok_key" })).toThrow(
      "Backend URL must be an absolute URL with protocol, e.g. http://localhost:4000."
    );
    expect(() => setSyncConnectionOverride({ baseUrl: "https://example.com/api", projectKey: "bad key" })).toThrow(
      "Project key must be 2-64 characters: letters, numbers, underscore, or hyphen."
    );
  });

  it("normalizes trailing slashes on save", () => {
    const saved = setSyncConnectionOverride({
      baseUrl: "https://api.example.com/v1/",
      projectKey: "somasmart"
    });
    expect(saved.baseUrl).toBe("https://api.example.com/v1");
    expect(getSyncApiBaseUrl()).toBe("https://api.example.com/v1");
  });
});
