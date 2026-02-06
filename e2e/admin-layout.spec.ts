import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page, device: string) {
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });
}

test("Admin layout: sidebar navigation works", async ({ page }) => {
  const device = `adminLayout_${Date.now()}`;
  await loginAsAdmin(page, device);

  await page.getByRole("link", { name: "Teachers", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Teacher management" })).toBeVisible();

  await page.getByRole("link", { name: "Lessons", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Lessons" })).toBeVisible();

  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("Admin layout: mobile drawer navigation works", async ({ page }) => {
  const device = `adminLayoutMobile_${Date.now()}`;
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAsAdmin(page, device);

  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Admin menu")).toBeVisible();

  await page.getByRole("link", { name: "Teachers", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Teacher management" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Admin layout: sidebar scroll is independent from main body", async ({ page }) => {
  const device = `adminSidebarScroll_${Date.now()}`;
  await page.setViewportSize({ width: 1280, height: 320 });
  await loginAsAdmin(page, device);

  const sidebarPanel = page.getByTestId("admin-sidebar-panel");
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

test("Admin pages: screenshot smoke checks", async ({ page }) => {
  const device = `adminLayoutShots_${Date.now()}`;
  await loginAsAdmin(page, device);

  await page.setViewportSize({ width: 1280, height: 720 });

  async function stableScreenshot(name: string, url: string) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
    await page.mouse.move(0, 0);
    await page.waitForTimeout(50);
    await expect(page.getByTestId("admin-layout")).toHaveScreenshot(name);
  }

  await stableScreenshot("admin-teachers.png", `/admin/teachers?device=${device}`);
  await stableScreenshot("admin-lessons.png", `/admin/lessons?device=${device}`);
  await stableScreenshot("admin-settings.png", `/admin/settings?device=${device}`);
});
