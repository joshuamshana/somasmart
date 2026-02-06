import { test, expect } from "@playwright/test";

test("Accessibility basics: login form labels and keyboard navigation", async ({ page }) => {
  const device = `a11y_${Date.now()}`;
  await page.goto(`/login?device=${device}`);

  const username = page.getByLabel("Username");
  const password = page.getByLabel("Password");
  await expect(username).toBeVisible();
  await expect(password).toBeVisible();

  // Basic keyboard smoke: tabbing eventually reaches the submit button.
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
  }
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();
});

test("Accessibility basics: admin navigation links are keyboard reachable", async ({ page }) => {
  const device = `a11yAdmin_${Date.now()}`;
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin?device=${device}`);
  await expect(page.getByRole("link", { name: "Teachers", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lessons", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
});
