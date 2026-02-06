import { test, expect } from "@playwright/test";

test("Student lesson stepper: quiz gates progression and completes lesson", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Stepper Student");
  await page.getByLabel("Username").fill(`stepper_student_${Date.now()}`);
  await page.getByLabel("Password").fill("password123");
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

  // Verify completion is recorded in Progress.
  await page.goto("/student/progress");
  await expect(page.getByText("Introduction to Numbers")).toBeVisible();
  await expect(page.getByText("Yes")).toBeVisible();
});
