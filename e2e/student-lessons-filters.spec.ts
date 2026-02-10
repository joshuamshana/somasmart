import { test, expect } from "@playwright/test";
import { fillStudentRegisterKyc } from "./helpers/kyc";
import type { Page } from "@playwright/test";

function visibleSelectByLabel(page: Page, label: string) {
  return page.locator("label:visible", { hasText: label }).locator("..").locator("select");
}

test("Student lessons filters: level → class → subject cascade filters lessons", async ({ page }) => {
  const device = `studentLessonFilters_${Date.now()}`;

  await page.goto(`/register?device=${device}`);
  await page.getByLabel("Full name").fill("Student Filters");
  await page.getByLabel("Username").fill(`student_${Date.now()}`);
  await page.getByLabel("Password").fill("password123");
  await fillStudentRegisterKyc(page);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/student/lessons?device=${device}`);
  await expect(page.getByLabel("Level")).toBeVisible({ timeout: 30_000 });

  const level = visibleSelectByLabel(page, "Level");
  const klass = visibleSelectByLabel(page, "Class");
  const subject = visibleSelectByLabel(page, "Subject");

  await expect(klass).toBeDisabled();
  await expect(subject).toBeDisabled();

  await level.selectOption({ label: "Primary" });
  await expect(klass).toBeEnabled();

  await klass.selectOption({ label: "Class 1" });
  await expect(subject).toBeEnabled();

  await subject.selectOption({ label: "ICT" });
  await expect(page.getByText("No lessons found.")).toBeVisible();

  await subject.selectOption({ label: "Math" });
  await expect(page.getByText("Introduction to Numbers")).toBeVisible();
});
