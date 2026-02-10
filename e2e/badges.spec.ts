import { test, expect } from "@playwright/test";
import { fillStudentRegisterKyc } from "./helpers/kyc";

test("Badges + streak: student earns first badges", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Badge Student");
  await page.getByLabel("Username").fill(`badge_student_${Date.now()}`);
  await page.getByLabel("Password").fill("password123");
  await fillStudentRegisterKyc(page);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Lessons", exact: true })).toBeVisible();

  await page.goto("/student/lessons");
  await page.getByText("Introduction to Numbers").first().click();

  // Seeded lesson has one content step; advance once into the quiz step (step-based player).
  const next = page.getByRole("button", { name: "Next" });
  if (await next.isVisible()) {
    await expect(next).toBeEnabled();
    await next.click();
  }

  const submitQuiz = page.getByRole("button", { name: "Submit Quiz" });
  await expect(submitQuiz).toBeVisible();
  await page.getByRole("radio", { name: /^4$/ }).check();
  await submitQuiz.click();
  await expect(page.getByText("Correct")).toBeVisible();

  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByText("Badges", { exact: true })).toBeVisible();
  await expect(page.getByText("first_quiz_submit")).toBeVisible();
  await expect(page.getByText("first_lesson_complete")).toBeVisible();
  await expect(page.getByText("Streak")).toBeVisible();
  await expect(page.getByText("Days active in a row")).toBeVisible();
});
