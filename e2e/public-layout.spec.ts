import { test, expect } from "@playwright/test";

test("Public layout: guest sees sidebar and can navigate with query params", async ({ page }) => {
  const device = `publicLayout_${Date.now()}`;
  await page.goto(`/?device=${device}`);

  await expect(page.getByTestId("public-layout")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("public-sidebar")).toBeVisible();

  await page.getByTestId("public-sidebar-panel").getByRole("link", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/login\\?device=${device}`));
  await expect(page.getByLabel("Username")).toBeVisible();

  await page.getByTestId("public-sidebar-panel").getByRole("link", { name: "Register", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/register\\?device=${device}`));
  await expect(page.getByLabel("Full name")).toBeVisible();
});

test("Public layout: mobile drawer navigation works", async ({ page }) => {
  const device = `publicLayoutMobile_${Date.now()}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/?device=${device}`);

  await expect(page.getByTestId("public-mobile-header")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByText("Public menu")).toBeVisible();

  await page.getByRole("dialog").getByRole("link", { name: "Login", exact: true }).click();
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByText("Public menu")).toHaveCount(0);
});
