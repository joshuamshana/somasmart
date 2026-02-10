import { test, expect } from "@playwright/test";
import { fillStudentRegisterKyc } from "./helpers/kyc";

test("Student lesson stepper: quiz gates progression and completes lesson", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Stepper Student");
  await page.getByLabel("Username").fill(`stepper_student_${Date.now()}`);
  await page.getByLabel("Password").fill("password123");
  await fillStudentRegisterKyc(page);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Lessons", exact: true })).toBeVisible();

  await page.goto("/student/lessons");
  await page.getByText("Introduction to Numbers").first().click();

  // Step 1 (content): can always click Next; it marks step complete.
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2 (quiz): Finish is blocked until passing attempt.
  await expect(page.getByText(/Pass: 70% to continue/i)).toBeVisible();
  const finish = page.getByRole("button", { name: "Finish" });
  await expect(finish).toBeDisabled();

  await page.getByRole("radio", { name: /^4$/ }).check();
  await page.getByRole("button", { name: "Submit Quiz" }).click();
  await expect(page.getByText("Correct")).toBeVisible();
  await expect(finish).toBeEnabled();

  await finish.click();
  await expect(page).toHaveURL(/\/student\/progress/);

  // Verify completion is recorded in Progress and listed as completed.
  await expect(page.getByText("Introduction to Numbers")).toBeVisible();
  await expect(page.getByText("Yes")).toBeVisible();

  // Completed lessons should show replay affordance in catalog.
  await page.goto("/student/lessons");
  const completedCard = page.getByRole("link", { name: /Introduction to Numbers/i }).first();
  await expect(completedCard.getByText("Completed")).toBeVisible();
  await expect(completedCard.getByText("Replay")).toBeVisible();
  await completedCard.click();

  // First entry after completion shows replay mode gate before stepper.
  await expect(page.getByText("Completed lesson")).toBeVisible();
  await expect(page.getByRole("button", { name: "Replay lesson" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish" })).toHaveCount(0);

  await page.getByRole("button", { name: "Replay lesson" }).click();
  await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
});
