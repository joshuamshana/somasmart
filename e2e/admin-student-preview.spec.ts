import { test, expect } from "@playwright/test";

test("Admin can preview lesson as student for pending + approved content", async ({ page }) => {
  const device = `adminPreview_${Date.now()}`;
  const title = `Preview Lesson ${Date.now()}`;

  // Teacher creates a coupon-required lesson and submits it.
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Teacher dashboard" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/teacher/lessons/new?device=${device}`);
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Level").selectOption({ label: "Primary" });
  await page.getByLabel("Class").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject").selectOption({ label: "ICT" });
  await page.getByLabel("Access").selectOption({ label: "Requires coupon" });
  await page.getByLabel("Tags (comma separated)").fill("");
  await page.getByLabel("Description").fill("Previewable lesson.");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text block 1").fill("Preview content block.");
  await page.getByRole("button", { name: "Submit for approval" }).click();

  // Admin previews the pending lesson as student.
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/lessons?device=${device}`);
  await page.locator("button").filter({ hasText: title }).first().click();
  await page.getByRole("button", { name: "Preview as student" }).click();
  await expect(page.getByRole("heading", { name: "Student preview" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Preview content block.", { exact: true })).toBeVisible();

  // Locked mode shows the lock screen text.
  await page.getByLabel("Preview mode").selectOption({ label: "Locked (no coupon)" });
  await expect(page.getByText("Locked. This is what a student without access sees.")).toBeVisible();

  // Back, approve, preview again (approved content).
  await page.getByRole("button", { name: "Back" }).click();
  await page.goto(`/admin/lessons?device=${device}`);
  await page.locator("button").filter({ hasText: title }).first().click();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create new version" })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Preview as student" }).click();
  await expect(page.getByText("Preview content block.", { exact: true })).toBeVisible();
});
