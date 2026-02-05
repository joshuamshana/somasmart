import { test, expect } from "@playwright/test";

test("Teacher nav: only one sidebar item is active on nested routes", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible({ timeout: 30_000 });

  await page.goto("/teacher/lessons/new");
  await expect(page.getByRole("heading", { name: "Create lesson" })).toBeVisible();

  const sidebar = page.getByTestId("teacher-sidebar");
  const activeLinks = sidebar.locator("a.bg-surface2");
  await expect(activeLinks).toHaveCount(1);
  await expect(activeLinks.first()).toHaveText("Lesson creator");
});

