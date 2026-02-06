import { test, expect } from "@playwright/test";

test("Reports: student exports progress PDF", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Report Student");
  await page.getByLabel("Username").fill(`report_student_${Date.now()}`);
  await page.getByLabel("Password").fill("password123");
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
  await expect(page.getByText(/Pass: 70% to continue/i)).toBeVisible();

  const submitQuiz = page.getByRole("button", { name: "Submit Quiz" });
  await expect(submitQuiz).toBeVisible();
  await page.getByRole("radio", { name: /^4$/ }).check();
  await submitQuiz.click();
  await expect(page.getByText("Correct")).toBeVisible();

  await page.goto("/student/progress");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/somasmart_progress_.*\.pdf/);
});
