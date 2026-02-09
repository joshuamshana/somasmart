import { test, expect } from "@playwright/test";

test("Admin lessons governance: create new version for teacher; expire approved lesson hides from students", async ({
  page
}) => {
  const device = `adminLessonsGov_${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Lessons", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/lessons?device=${device}`);
  await page.getByTestId("lesson-item-lesson_seed_numbers").click();
  await expect(page).toHaveURL(/\/admin\/lessons\/lesson_seed_numbers\/review/);
  await expect(page.getByRole("heading", { name: "Lesson review" })).toBeVisible({ timeout: 30_000 });

  // Create a new version (draft copy)
  await page.getByTestId("lesson-create-version").click();
  await page.getByRole("dialog").getByRole("button", { name: "Create version" }).click();

  // Teacher sees the new draft
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "My Lessons", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.goto(`/teacher/lessons?device=${device}`);
  await expect(page.getByRole("table").getByText(/Introduction to Numbers \(v2\)/)).toBeVisible();

  // Admin unpublishes the original lesson
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Lessons", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.goto(`/admin/lessons?device=${device}`);
  await page.getByTestId("lesson-item-lesson_seed_numbers").click();
  await expect(page).toHaveURL(/\/admin\/lessons\/lesson_seed_numbers\/review/);

  await page.getByRole("button", { name: "Unpublish" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Unpublish" }).click();

  // Student should not see unpublished lesson in catalog
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto(`/register?device=${device}`);
  await page.getByLabel("Full name").fill("Student X");
  await page.getByLabel("Username").fill(`s_${Date.now()}`);
  await page.getByLabel("Password").fill("pass123");
  await page.getByRole("button", { name: "Register" }).click();
  await page.goto(`/student/lessons?device=${device}`);
  await expect(page.getByText("Introduction to Numbers")).toHaveCount(0);
});
