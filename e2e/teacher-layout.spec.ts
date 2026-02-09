import { test, expect } from "@playwright/test";

test("Teacher layout: sidebar navigation works and preserves query params", async ({ page }) => {
  const server = `srv_teacher_nav_${Date.now()}`;
  const device = `teach_${server}`;

  await page.goto(`/login?device=${device}&server=${server}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("teacher-sidebar-logout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/teacher?device=${device}&server=${server}`);
  await expect(page.getByTestId("teacher-layout")).toBeVisible();
  await expect(page.getByTestId("teacher-sidebar")).toBeVisible();

  await page.getByRole("link", { name: "My Lessons", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher/lessons\\?device=${device}&server=${server}`));
  await expect(page.getByRole("heading", { name: "My lessons" })).toBeVisible();

  await page.getByRole("link", { name: "Upload Lesson", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher/lessons/new\\?device=${device}&server=${server}`));
  await expect(page.getByRole("heading", { name: "Create lesson" })).toBeVisible();

  await page.goto(`/teacher/support?device=${device}&server=${server}`);
  await expect(page).toHaveURL(new RegExp(`/teacher/support\\?device=${device}&server=${server}`));
  await expect(page.getByText("Support (offline messaging)")).toBeVisible();

  await page.getByRole("link", { name: "Alerts", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/notifications\\?device=${device}&server=${server}`));
  await expect(page.getByRole("button", { name: "Mark all read" })).toBeVisible();

  // Alerts route is outside the teacher layout; return to teacher to keep testing sidebar links.
  await page.goto(`/teacher?device=${device}&server=${server}`);
  await expect(page.getByTestId("teacher-sidebar")).toBeVisible();

  await page.getByRole("link", { name: "Sync status", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/sync\\?device=${device}&server=${server}`));
  await expect(page.getByRole("button", { name: "Sync now" })).toBeVisible();

  await page.goto(`/teacher?device=${device}&server=${server}`);
  await page.getByTestId("teacher-sidebar-logout").click();
  await expect(page.getByLabel("Username")).toBeVisible({ timeout: 30_000 });
});

test("Teacher layout: mobile drawer navigation works", async ({ page }) => {
  const server = `srv_teacher_nav_mobile_${Date.now()}`;
  const device = `teach_mobile_${server}`;
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto(`/login?device=${device}&server=${server}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/teacher/, { timeout: 30_000 });

  await page.goto(`/teacher?device=${device}&server=${server}`);
  await expect(page.getByTestId("teacher-mobile-header")).toBeVisible();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByText("Teacher menu")).toBeVisible();

  await page.getByRole("link", { name: "My Lessons", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My lessons" })).toBeVisible();
  await expect(page.getByText("Teacher menu")).toHaveCount(0);

  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByTestId("teacher-drawer-logout").click();
  await expect(page.getByLabel("Username")).toBeVisible({ timeout: 30_000 });
});

test("Teacher layout: sidebar scroll is independent from main body", async ({ page }) => {
  const server = `srv_teacher_sidebar_scroll_${Date.now()}`;
  const device = `teach_scroll_${server}`;

  await page.setViewportSize({ width: 1280, height: 320 });

  await page.goto(`/login?device=${device}&server=${server}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("teacher-sidebar-logout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/teacher?device=${device}&server=${server}`);
  await expect(page.getByTestId("teacher-layout")).toBeVisible();

  const sidebarPanel = page.getByTestId("teacher-sidebar-panel");
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
