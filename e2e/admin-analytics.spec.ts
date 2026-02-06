import { test, expect } from "@playwright/test";

test("Admin analytics: key KPI cards render with values", async ({ page }) => {
  const device = `adminAnalytics_${Date.now()}`;
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/analytics?device=${device}`);
  await expect(page.getByText("Users (students)")).toBeVisible();
  await expect(page.getByText("Users (teachers)")).toBeVisible();
  await expect(page.getByText("Active students (7d)")).toBeVisible();
  await expect(page.getByText("Lessons (approved)")).toBeVisible();
  await expect(page.getByText("Avg quiz score")).toBeVisible();
});

