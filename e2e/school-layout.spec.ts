import { expect, test, type Page } from "@playwright/test";

async function loginAsSchoolAdmin(page: Page, device: string) {
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("schooladmin");
  await page.getByLabel("Password").fill("school123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("school-layout")).toBeVisible({ timeout: 30_000 });
}

test("School layout: sidebar navigation works", async ({ page }) => {
  const device = `schoolLayout_${Date.now()}`;
  await loginAsSchoolAdmin(page, device);
  await expect(page.getByTestId("school-sidebar")).toBeVisible();

  await page.getByTestId("school-sidebar-panel").getByRole("link", { name: "Users", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/school/users\\?device=${device}`));
  await expect(page.getByLabel("Role")).toBeVisible();

  await page.getByTestId("school-sidebar-panel").getByRole("link", { name: "Licenses", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/school/licenses\\?device=${device}`));
  await expect(page.getByText("Grant sponsored access")).toBeVisible();

  await page.getByTestId("school-sidebar-panel").getByRole("link", { name: "Notifications", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/notifications\\?device=${device}`));
  await expect(page.getByRole("button", { name: "Mark all read" })).toBeVisible();
});

test("School layout: mobile drawer navigation and logout work", async ({ page }) => {
  const device = `schoolLayoutMobile_${Date.now()}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsSchoolAdmin(page, device);

  await expect(page.getByTestId("school-mobile-header")).toBeVisible();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByText("School menu")).toBeVisible();

  await page.getByRole("dialog").getByRole("link", { name: "Users", exact: true }).click();
  await expect(page.getByLabel("Role")).toBeVisible();
  await expect(page.getByText("School menu")).toHaveCount(0);

  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByTestId("school-drawer-logout").click();
  await expect(page.getByLabel("Username")).toBeVisible({ timeout: 30_000 });
});

test("School layout: sidebar scroll is independent from main body", async ({ page }) => {
  const device = `schoolSidebarScroll_${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 320 });
  await loginAsSchoolAdmin(page, device);

  const sidebarPanel = page.getByTestId("school-sidebar-panel");
  await expect(sidebarPanel).toBeVisible();

  const overflowY = await sidebarPanel.evaluate((el) => getComputedStyle(el).overflowY);
  expect(overflowY).toBe("auto");

  const canScroll = await sidebarPanel.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(canScroll).toBeTruthy();

  await page.evaluate(() => window.scrollTo(0, 0));
  const beforeWindowY = await page.evaluate(() => window.scrollY);
  const beforeSidebarY = await sidebarPanel.evaluate((el) => el.scrollTop);

  await sidebarPanel.hover();
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(50);

  const afterSidebarY = await sidebarPanel.evaluate((el) => el.scrollTop);
  const afterWindowY = await page.evaluate(() => window.scrollY);

  expect(afterSidebarY).toBeGreaterThan(beforeSidebarY);
  expect(afterWindowY - beforeWindowY).toBeLessThan(50);
});
