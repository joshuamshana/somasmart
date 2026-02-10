import { test, expect } from "@playwright/test";
import { fillStudentRegisterKyc } from "./helpers/kyc";

test("Student layout: sidebar navigation works and preserves query params", async ({ page }) => {
  const device = `studentLayout_${Date.now()}`;
  const username = `student_layout_${Date.now()}`;

  await page.goto(`/register?device=${device}`);
  await page.getByLabel("Full name").fill("Student Layout");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill("password123");
  await fillStudentRegisterKyc(page);
  await page.getByRole("button", { name: "Register" }).click();
  if (page.url().includes("/login")) {
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Login" }).click();
  }
  await expect(page.getByTestId("student-layout")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("student-sidebar")).toBeVisible();

  await page.getByRole("link", { name: "Lessons", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/student/lessons\\?device=${device}`));
  await expect(page.getByLabel("Level")).toBeVisible();

  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/student/progress\\?device=${device}`));
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeVisible();
});

test("Student layout: mobile drawer navigation works", async ({ page }) => {
  const device = `studentLayoutMobile_${Date.now()}`;
  const username = `student_layout_mobile_${Date.now()}`;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/register?device=${device}`);
  await page.getByLabel("Full name").fill("Student Layout Mobile");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill("password123");
  await fillStudentRegisterKyc(page);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByTestId("student-mobile-header")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByText("Student menu")).toBeVisible();

  await page.getByRole("link", { name: "Lessons", exact: true }).click();
  await expect(page.getByLabel("Level")).toBeVisible();
  await expect(page.getByText("Student menu")).toHaveCount(0);
});

test("Student layout: sidebar scroll is independent from main body", async ({ page }) => {
  const device = `studentSidebarScroll_${Date.now()}`;
  const username = `student_scroll_${Date.now()}`;

  await page.setViewportSize({ width: 1280, height: 320 });
  await page.goto(`/register?device=${device}`);
  await page.getByLabel("Full name").fill("Student Sidebar Scroll");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill("password123");
  await fillStudentRegisterKyc(page);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByTestId("student-layout")).toBeVisible({ timeout: 30_000 });
  await page.goto(`/student/lessons?device=${device}`);
  await expect(page.getByTestId("student-layout")).toBeVisible({ timeout: 30_000 });

  const sidebarPanel = page.getByTestId("student-sidebar-panel");
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
