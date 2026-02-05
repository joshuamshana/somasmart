import { test, expect } from "@playwright/test";

test("Teacher layout: sidebar navigation works and preserves query params", async ({ page }) => {
  const server = `srv_teacher_nav_${Date.now()}`;
  const device = `teach_${server}`;

  await page.goto(`/login?device=${device}&server=${server}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/teacher?device=${device}&server=${server}`);
  await expect(page.getByTestId("teacher-layout")).toBeVisible();
  await expect(page.getByTestId("teacher-sidebar")).toBeVisible();

  await page.getByRole("link", { name: "Lessons", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher/lessons\\?device=${device}&server=${server}`));
  await expect(page.getByRole("heading", { name: "My lessons" })).toBeVisible();

  await page.getByRole("link", { name: "Lesson creator", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher/lessons/new\\?device=${device}&server=${server}`));
  await expect(page.getByRole("heading", { name: "Create lesson" })).toBeVisible();

  await page.getByRole("link", { name: "Support inbox", exact: true }).click();
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
});

test("Teacher layout: mobile drawer navigation works", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/login");
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible({ timeout: 30_000 });

  await page.goto("/teacher");
  await expect(page.getByTestId("teacher-mobile-header")).toBeVisible();
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByText("Teacher menu")).toBeVisible();

  await page.getByRole("link", { name: "Lessons", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My lessons" })).toBeVisible();
  await expect(page.getByText("Teacher menu")).toHaveCount(0);
});
