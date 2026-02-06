import React from "react";
import { Card } from "@/shared/ui/Card";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useTheme, type ThemePreference } from "@/shared/theme/ThemeProvider";

const options: Array<{ value: ThemePreference; label: string; description: string }> = [
  { value: "light", label: "Light", description: "Always use the light theme." },
  { value: "dark", label: "Dark", description: "Always use the dark theme." },
  { value: "auto", label: "Auto (system)", description: "Follow your system appearance setting." }
];

export function AppearanceSettingsPage() {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Appearance"
        description={`Current theme: ${resolvedTheme === "dark" ? "Dark" : "Light"} (${themePreference}).`}
      />
      <Card title="Theme">
        <fieldset className="space-y-2" aria-label="Theme preference">
          {options.map((option) => {
            const checked = themePreference === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 ${
                  checked ? "border-brand bg-surface2" : "border-border bg-surface hover:bg-surface2/60"
                }`}
              >
                <input
                  type="radio"
                  className="mt-1"
                  name="theme-preference"
                  value={option.value}
                  checked={checked}
                  onChange={() => setThemePreference(option.value)}
                />
                <span>
                  <span className="block text-sm font-semibold text-text">{option.label}</span>
                  <span className="block text-xs text-muted">{option.description}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </Card>
    </div>
  );
}
