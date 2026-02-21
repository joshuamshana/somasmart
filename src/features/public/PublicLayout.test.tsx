import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/features/public/PublicLayout";

function renderPublicLayout(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/register" element={<div>Register page</div>} />
          <Route path="/connection-settings" element={<div>Connection settings page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("PublicLayout", () => {
  it("shows Connection settings in public navigation", () => {
    renderPublicLayout("/login");

    expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connection settings" })).toBeInTheDocument();
  });

  it("shows Connection settings title for the route", () => {
    renderPublicLayout("/connection-settings");

    expect(screen.getByText("Connection settings page")).toBeInTheDocument();
    expect(screen.getAllByText("Connection settings").length).toBeGreaterThan(0);
  });
});
