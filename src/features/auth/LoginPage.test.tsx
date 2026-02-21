import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage";

const loginMock = vi.fn();

vi.mock("@/features/auth/authContext", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login: loginMock
  })
}));

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    loginMock.mockReset();
    window.history.replaceState({}, "", "/login?device=logintestdevice");
  });

  it("shows a link to connection settings", () => {
    render(
      <MemoryRouter initialEntries={["/login?device=logintestdevice"]}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Open Connection settings" })).toHaveAttribute(
      "href",
      "/connection-settings?device=logintestdevice"
    );
  });

  it("submits login credentials", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValueOnce({
      ok: true,
      user: {
        id: "u1",
        role: "teacher"
      }
    });

    render(
      <MemoryRouter initialEntries={["/login?device=logintestdevice"]}>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText("Username"), "teacher1");
    await user.type(screen.getByLabelText("Password"), "teacher123");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(loginMock).toHaveBeenCalledWith({ username: "teacher1", password: "teacher123" });
  });
});
