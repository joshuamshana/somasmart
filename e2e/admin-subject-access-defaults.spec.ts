import { test, expect } from "@playwright/test";

test("Admin settings: subject access default can be saved and reloaded", async ({ page }) => {
  const device = `adminAccessDefault_${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/settings?device=${device}`);
  await page.getByLabel("Level (access defaults)").selectOption({ label: "Primary" });
  await page.getByLabel("Class (access defaults)").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject (access defaults)").selectOption({ label: "ICT" });
  await page.getByLabel("Default access").selectOption({ label: "Free" });
  await page.getByRole("button", { name: "Save default" }).click();
  await expect(page.getByText("Saved subject default access.")).toBeVisible();

  await page.reload();
  await page.getByLabel("Level (access defaults)").selectOption({ label: "Primary" });
  await page.getByLabel("Class (access defaults)").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject (access defaults)").selectOption({ label: "ICT" });
  await expect(page.getByLabel("Default access")).toHaveValue("free");
});

