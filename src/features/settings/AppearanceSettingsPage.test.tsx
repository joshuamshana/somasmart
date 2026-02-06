import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppearanceSettingsPage } from "@/features/settings/AppearanceSettingsPage";
import {
  THEME_PREFERENCE_KEY,
  ThemeProvider
} from "@/shared/theme/ThemeProvider";

function setupMatchMedia(initialDark = true) {
  const mediaQueryList: MediaQueryList = {
    media: "(prefers-color-scheme: dark)",
    matches: initialDark,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true
  };
  vi.stubGlobal("matchMedia", vi.fn(() => mediaQueryList));
}

describe("AppearanceSettingsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  it("renders all theme choices", () => {
    setupMatchMedia(true);
    render(
      <ThemeProvider>
        <AppearanceSettingsPage />
      </ThemeProvider>
    );
    expect(screen.getByRole("radio", { name: /^Light/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Dark/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Auto \(system\)/i })).toBeInTheDocument();
  });

  it("updates theme preference and DOM attributes", async () => {
    setupMatchMedia(true);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <AppearanceSettingsPage />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("radio", { name: /^Light/i }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
    expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe("light");

    await user.click(screen.getByRole("radio", { name: /^Dark/i }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe("dark");
  });
});
