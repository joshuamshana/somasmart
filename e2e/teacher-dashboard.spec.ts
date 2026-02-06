import { test, expect } from "@playwright/test";

test("Teacher dashboard: shows core panels and actions", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible({ timeout: 30_000 });

  await page.goto("/teacher");
  await expect(page.getByRole("heading", { name: "Teacher dashboard" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Create lesson" })).toBeVisible();
  await expect(page.getByText("Needs attention")).toBeVisible();
  await expect(page.getByText("Engagement summary")).toBeVisible();
  await expect(page.getByText(/Notifications \(\d+\)/)).toBeVisible();
  await expect(page.getByText("Last sync")).toBeVisible();
  await expect(page.getByText("Queued")).toBeVisible();
  await expect(page.getByText("Failed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync now" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open sync" })).toBeVisible();
});
