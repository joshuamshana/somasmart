import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SyncPage } from "@/features/sync/SyncPage";
import { resetSyncConnectionOverride, saveSyncConnectionOverride } from "@/shared/sync/connectionSettings";

vi.mock("@/shared/sync/SyncContext", () => ({
  useSync: () => ({
    mode: "api",
    status: "idle",
    lastError: undefined,
    lastSyncAt: null,
    queuedCount: 0,
    failedCount: 0,
    outbox: [],
    syncNow: vi.fn(async () => undefined)
  })
}));

const env = import.meta.env as Record<string, string | undefined>;
const originalEnv = {
  baseUrl: env.VITE_SYNC_API_URL,
  projectKey: env.VITE_SYNC_PROJECT_KEY
};

describe("SyncPage connection summary", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/sync?device=syncpagetest");
    env.VITE_SYNC_API_URL = "https://env.example.com/api";
    env.VITE_SYNC_PROJECT_KEY = "env_project";
  });

  afterEach(() => {
    resetSyncConnectionOverride();
    localStorage.clear();
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
  });

  it("shows runtime override source when runtime connection is configured", () => {
    saveSyncConnectionOverride({ baseUrl: "http://localhost:4000/customapi", projectKey: "tenant_sync" });
    render(
      <MemoryRouter initialEntries={["/sync?device=syncpagetest"]}>
        <SyncPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Endpoint:/)).toHaveTextContent("Endpoint: http://localhost:4000/customapi");
    expect(screen.getByText(/Project key:/)).toHaveTextContent("Project key: tenant_sync");
    expect(screen.getByText(/Source:/)).toHaveTextContent("Source: runtime override");
  });

  it("shows env/default source when runtime override is not configured", () => {
    render(
      <MemoryRouter initialEntries={["/sync?device=syncpagetest"]}>
        <SyncPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Endpoint:/)).toHaveTextContent("Endpoint: https://env.example.com/api");
    expect(screen.getByText(/Project key:/)).toHaveTextContent("Project key: env_project");
    expect(screen.getByText(/Source:/)).toHaveTextContent("Source: env/default");
  });
});
