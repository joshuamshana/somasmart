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
  await page.getByText("4").click();
  await page.getByRole("button", { name: "Submit Quiz" }).click();
  await expect(page.getByText("Correct")).toBeVisible();

  await page.goto("/student/progress");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/somasmart_progress_.*\.pdf/);
});
