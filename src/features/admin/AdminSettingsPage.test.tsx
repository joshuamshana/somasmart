import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AdminSettingsPage } from "@/features/admin/AdminSettingsPage";
import { getEffectiveSyncConnection } from "@/shared/sync/config";

vi.mock("@/features/auth/authContext", () => ({
  useAuth: () => ({
    user: { id: "admin_1", role: "admin" }
  })
}));

vi.mock("@/shared/db/db", () => {
  const emptyToArray = vi.fn(async () => []);
  return {
    db: {
      settings: {
        toArray: emptyToArray,
        get: vi.fn(async () => null),
        put: vi.fn(async () => undefined),
        delete: vi.fn(async () => undefined)
      },
      curriculumCategories: { toArray: emptyToArray },
      curriculumLevels: { toArray: emptyToArray },
      curriculumClasses: { toArray: emptyToArray },
      curriculumSubjects: { toArray: emptyToArray }
    }
  };
});

describe("AdminSettingsPage backend sync connection", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/admin/settings?device=adminsettingstest");
  });

  it("rejects root-relative backend URL and accepts absolute URL", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin/settings?device=adminsettingstest"]}>
        <AdminSettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Backend sync connection")).toBeInTheDocument());
    await user.clear(screen.getByLabelText("Backend URL"));
    await user.type(screen.getByLabelText("Backend URL"), "/api");
    await user.click(screen.getByRole("button", { name: "Save connection" }));
    expect(
      screen.getByText("Backend URL must be an absolute URL with protocol, e.g. http://localhost:4000.")
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Backend URL"));
    await user.type(screen.getByLabelText("Backend URL"), "http://localhost:4000/customapi");
    await user.click(screen.getByRole("button", { name: "Save connection" }));

    expect(screen.getByText("Backend sync connection saved.")).toBeInTheDocument();
    expect(getEffectiveSyncConnection().baseUrl).toBe("http://localhost:4000/customapi");
  });
});
