import { test, expect } from "@playwright/test";

test("End-to-end: teacher submits lesson; admin approves; student enrolls via coupon and accesses lesson", async ({
  page
}) => {
  const device = `e2eEnroll_${Date.now()}`;

  // --- Teacher creates + submits lesson ---
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Teacher dashboard" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/teacher/lessons/new?device=${device}`);
  const title = `Coupon Lesson ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Level").selectOption({ label: "Primary" });
  await page.getByLabel("Class").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject").selectOption({ label: "ICT" });
  await page.getByLabel("Language").selectOption({ label: "English" });
  await page.getByLabel("Access").selectOption({ label: "Requires coupon" });
  await page.getByLabel("Tags (comma separated)").fill("");
  await page.getByLabel("Description").fill("A lesson that requires coupon enrollment.");

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text block 1").fill("Private lesson content.");

  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page).toHaveURL(new RegExp(`/teacher/lessons\\?device=${device}`));

  // --- Admin sees pending lesson and approves ---
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/lessons?device=${device}`);
  await page.getByRole("button", { name: "Refresh" }).click();

  const pendingRow = page.locator("tr", { hasText: title }).first();
  await expect(pendingRow).toBeVisible({ timeout: 30_000 });
  await pendingRow.getByRole("button", { name: "Open review" }).click();

  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create new version" })).toBeVisible({ timeout: 30_000 });

  // --- Student registers and attempts access (locked), then enrolls via coupon ---
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto(`/register?device=${device}`);
  const studentUsername = `stu_${Date.now()}`;
  await page.getByLabel("Full name").fill("Enroll Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Browse lessons" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/student/lessons?device=${device}`);
  const lessonCard = page.getByRole("link").filter({ hasText: title }).first();
  await expect(lessonCard).toBeVisible({ timeout: 30_000 });
  await lessonCard.click();

  await expect(page.getByText("Locked.")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Redeem a code" }).click();
  await expect(page).toHaveURL(new RegExp(`/student/payments\\?device=${device}`));

  await page.getByLabel("Code").fill("FREE30");
  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(page.getByText("Access unlocked offline.")).toBeVisible({ timeout: 30_000 });

  // Back to lesson should now be available.
  await page.goto(`/student/lessons?device=${device}`);
  await page.getByRole("link").filter({ hasText: title }).first().click();
  await expect(page.getByText("Private lesson content.", { exact: true })).toBeVisible({ timeout: 30_000 });
});
