import { test, expect } from "@playwright/test";

test("Admin schools: regenerate code requires confirm; roster move; delete requires typed DELETE", async ({ page }) => {
  const device = `adminSchoolsCrud_${Date.now()}`;
  const schoolName = `Crud School ${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Schools", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/schools?device=${device}`);
  await page.getByLabel("School name").fill(schoolName);
  const oldCode = await page.getByLabel("School code").inputValue();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("School created.")).toBeVisible();

  // Regenerate code (confirm required)
  await page.getByTestId("school-regenerate-code").click();
  await page.getByRole("dialog").getByRole("button", { name: "Regenerate" }).click();
  await expect(page.getByText(oldCode)).toHaveCount(0);

  // Move an existing user (seed teacher1) into the school via roster controls.
  // Teacher1 exists in seed data and is not assigned to a school.
  // Select should exist and triggers a confirm modal.
  const row = page.getByTestId("school-roster-row-teacher1");
  await expect(row).toBeVisible();
  await row.getByTestId("school-roster-move").selectOption({ label: schoolName });
  await page.getByRole("dialog").getByRole("button", { name: "Move" }).click();

  // Delete requires typed DELETE
  await page.getByTestId("school-delete").click();
  const delDialog = page.getByRole("dialog");
  await delDialog.getByLabel("Confirm text").fill("DELETE");
  await delDialog.getByRole("button", { name: "Delete school" }).click();
  await expect(page.getByText("Select a school to manage.")).toBeVisible();
});
