import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PublicConnectionSettingsPage } from "@/features/public/PublicConnectionSettingsPage";
import {
  DEFAULT_SYNC_API_BASE_URL,
  DEFAULT_SYNC_PROJECT_KEY,
  getEffectiveSyncConnection
} from "@/shared/sync/config";

describe("PublicConnectionSettingsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/connection-settings?device=publicconnectiontest");
  });

  it("saves and resets runtime sync connection settings", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/connection-settings?device=publicconnectiontest"]}>
        <PublicConnectionSettingsPage />
      </MemoryRouter>
    );

    await user.clear(screen.getByLabelText("Backend URL"));
    await user.type(screen.getByLabelText("Backend URL"), "http://localhost:4000/customapi");
    await user.clear(screen.getByLabelText("Project key"));
    await user.type(screen.getByLabelText("Project key"), "tenant_frontend");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Connection settings saved.")).toBeInTheDocument();
    expect(getEffectiveSyncConnection().baseUrl).toBe("http://localhost:4000/customapi");
    expect(getEffectiveSyncConnection().projectKey).toBe("tenant_frontend");

    await user.click(screen.getByRole("button", { name: "Reset to defaults" }));
    expect(screen.getByText("Connection settings reset to defaults.")).toBeInTheDocument();
    expect(getEffectiveSyncConnection().baseUrl).toBe(DEFAULT_SYNC_API_BASE_URL);
    expect(getEffectiveSyncConnection().projectKey).toBe(DEFAULT_SYNC_PROJECT_KEY);
  });

  it("rejects invalid backend URLs", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/connection-settings?device=publicconnectiontest"]}>
        <PublicConnectionSettingsPage />
      </MemoryRouter>
    );

    await user.clear(screen.getByLabelText("Backend URL"));
    await user.type(screen.getByLabelText("Backend URL"), "/api");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("Backend URL must be an absolute URL with protocol, e.g. http://localhost:4000.")
    ).toBeInTheDocument();
  });

  it("rejects unsupported protocols", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/connection-settings?device=publicconnectiontest"]}>
        <PublicConnectionSettingsPage />
      </MemoryRouter>
    );

    await user.clear(screen.getByLabelText("Backend URL"));
    await user.type(screen.getByLabelText("Backend URL"), "ftp://backend.invalid");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Backend URL must use http or https protocol (e.g. http://localhost:4000)."))
      .toBeInTheDocument();
  });
});
