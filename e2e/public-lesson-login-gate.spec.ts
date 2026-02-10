import { test, expect } from "@playwright/test";
import { fillStudentRegisterKyc } from "./helpers/kyc";

test("Public landing: clicking a lesson requires login, then returns student to lesson via next=", async ({ page }) => {
  const device = `publicGate_${Date.now()}`;
  const username = `gate_student_${Date.now()}`;

  await page.goto(`/?device=${device}`);

  // Public sees lesson list
  const lessonCard = page.getByRole("link").filter({ hasText: "Introduction to Numbers" }).first();
  await expect(lessonCard).toBeVisible({ timeout: 30_000 });
  await lessonCard.click();

  // Must be on login with next set to the intended lesson.
  await expect(page).toHaveURL(new RegExp(`/login\\?device=${device}&next=`));

  // Register as a student (register link preserves query string).
  await page.getByRole("link", { name: "Register", exact: true }).click();
  await page.getByLabel("Full name").fill("Gate Student");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill("password123");
  await fillStudentRegisterKyc(page);
  await page.getByRole("button", { name: "Register" }).click();

  // Should land on the intended lesson after register (via next=).
  await expect(page).toHaveURL(new RegExp(`/student/lessons/lesson_seed_numbers\\?device=${device}`));
  await expect(page.getByText("Introduction to Numbers")).toBeVisible({ timeout: 30_000 });
});

