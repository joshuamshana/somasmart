import { test, expect } from "@playwright/test";

test("Auth redirect: already-logged-in admin visiting /login or / goes to /admin", async ({ page }) => {
  const device = `authRedirectAdmin_${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/login?device=${device}`);
  await expect(page).toHaveURL(new RegExp(`/admin\\?device=${device}`));

  await page.goto(`/?device=${device}`);
  await expect(page).toHaveURL(new RegExp(`/admin\\?device=${device}`));
});

test("Auth redirect: already-logged-in teacher visiting /login or / goes to /teacher", async ({ page }) => {
  const device = `authRedirectTeacher_${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Teacher dashboard" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/login?device=${device}`);
  await expect(page).toHaveURL(new RegExp(`/teacher\\?device=${device}`));

  await page.goto(`/?device=${device}`);
  await expect(page).toHaveURL(new RegExp(`/teacher\\?device=${device}`));
});

test("Auth redirect: already-logged-in school admin visiting /login or / goes to /school", async ({ page }) => {
  const device = `authRedirectSchool_${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("schooladmin");
  await page.getByLabel("Password").fill("school123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Manage users" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/login?device=${device}`);
  await expect(page).toHaveURL(new RegExp(`/school\\?device=${device}`));

  await page.goto(`/?device=${device}`);
  await expect(page).toHaveURL(new RegExp(`/school\\?device=${device}`));
});

test("Auth redirect: already-logged-in student visiting /login or / stays on /", async ({ page }) => {
  const device = `authRedirectStudent_${Date.now()}`;
  const username = `redir_student_${Date.now()}`;

  await page.goto(`/register?device=${device}`);
  await page.getByLabel("Full name").fill("Redirect Student");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Browse lessons" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/login?device=${device}`);
  await expect(page).toHaveURL(new RegExp(`/\\?device=${device}`));

  await page.goto(`/?device=${device}`);
  await expect(page).toHaveURL(new RegExp(`/\\?device=${device}`));
});
