import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  THEME_PREFERENCE_KEY,
  ThemeProvider,
  useTheme
} from "@/shared/theme/ThemeProvider";

function TestHarness() {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();
  return (
    <div>
      <div data-testid="pref">{themePreference}</div>
      <div data-testid="resolved">{resolvedTheme}</div>
      <button onClick={() => setThemePreference("light")}>Light</button>
      <button onClick={() => setThemePreference("dark")}>Dark</button>
      <button onClick={() => setThemePreference("auto")}>Auto</button>
    </div>
  );
}

function setupMatchMedia(initialDark = true) {
  let matches = initialDark;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const mediaQueryList: MediaQueryList = {
    media: "(prefers-color-scheme: dark)",
    matches,
    onchange: null,
    addEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject | null
    ) => {
      if (typeof listener === "function") listeners.add(listener as (event: MediaQueryListEvent) => void);
    },
    removeEventListener: (
      _type: string,
      listener: EventListenerOrEventListenerObject | null
    ) => {
      if (typeof listener === "function")
        listeners.delete(listener as (event: MediaQueryListEvent) => void);
    },
    addListener: (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null) => {
      if (listener) listeners.add(listener);
    },
    removeListener: (listener: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null) => {
      if (listener) listeners.delete(listener);
    },
    dispatchEvent: () => true
  };

  vi.stubGlobal("matchMedia", vi.fn(() => mediaQueryList));

  return {
    setDark(nextDark: boolean) {
      matches = nextDark;
      Object.defineProperty(mediaQueryList, "matches", { configurable: true, value: matches });
      const event = { matches, media: mediaQueryList.media } as MediaQueryListEvent;
      listeners.forEach((listener) => listener(event));
    }
  };
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  it("defaults to auto and resolves from system preference", async () => {
    setupMatchMedia(true);
    render(
      <ThemeProvider>
        <TestHarness />
      </ThemeProvider>
    );

    expect(screen.getByTestId("pref")).toHaveTextContent("auto");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe("auto");
  });

  it("applies explicit light/dark preferences and persists", async () => {
    setupMatchMedia(true);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestHarness />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: "Light" }));
    expect(screen.getByTestId("pref")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
    expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe("light");

    await user.click(screen.getByRole("button", { name: "Dark" }));
    expect(screen.getByTestId("pref")).toHaveTextContent("dark");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe("dark");
  });

  it("reacts to system changes while in auto mode", async () => {
    const media = setupMatchMedia(false);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <TestHarness />
      </ThemeProvider>
    );

    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    act(() => {
      media.setDark(true);
    });
    await waitFor(() => {
      expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    await user.click(screen.getByRole("button", { name: "Light" }));
    act(() => {
      media.setDark(false);
    });
    await waitFor(() => {
      expect(screen.getByTestId("resolved")).toHaveTextContent("light");
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });

  it("restores persisted preference on mount", async () => {
    localStorage.setItem(THEME_PREFERENCE_KEY, "light");
    setupMatchMedia(true);
    render(
      <ThemeProvider>
        <TestHarness />
      </ThemeProvider>
    );

    expect(screen.getByTestId("pref")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
  });
});
