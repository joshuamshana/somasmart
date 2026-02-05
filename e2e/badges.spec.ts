import { test, expect } from "@playwright/test";

test("Badges + streak: student earns first badges", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Badge Student");
  await page.getByLabel("Username").fill(`badge_student_${Date.now()}`);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Lessons", exact: true })).toBeVisible();

  await page.goto("/student/lessons");
  await page.getByText("Introduction to Numbers").first().click();
  await page.getByText("4").click();
  await page.getByRole("button", { name: "Submit Quiz" }).click();
  await expect(page.getByText("Correct")).toBeVisible();

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByText("Badges", { exact: true })).toBeVisible();
  await expect(page.getByText("first_quiz_submit")).toBeVisible();
  await expect(page.getByText("first_lesson_complete")).toBeVisible();
  await expect(page.getByText("Streak")).toBeVisible();
  await expect(page.getByText("Days active in a row")).toBeVisible();
});
