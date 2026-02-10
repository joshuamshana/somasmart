import { test, expect } from "@playwright/test";

test("Admin users CRUD: create/edit/reset/suspend/activate/delete student + admin login with reset password", async ({
  page
}) => {
  const device = `adminUsers_${Date.now()}`;
  const studentUsername = `stu_${Date.now()}`;
  const adminUsername = `adm_${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Students", exact: true })).toBeVisible({ timeout: 30_000 });

  // Student CRUD
  await page.goto(`/admin/students?device=${device}`);
  await page.getByLabel("Name").first().fill("Student One");
  await page.getByLabel("Username").first().fill(studentUsername);
  await page.getByLabel("Temp password").first().fill("s1pass");
  await page.getByLabel("Mobile").first().fill("+255700200001");
  await page.getByLabel("Country").first().fill("Tanzania");
  await page.getByLabel("Region").first().fill("Dar");
  await page.getByLabel("Street").first().fill("Kijitonyama");
  await page.getByLabel("Date of birth").first().fill("2012-01-01");
  await page.getByLabel("Level").first().selectOption("secondary");
  await page.getByRole("checkbox", { name: "Minor" }).check();
  await page.getByLabel("Guardian full name").first().fill("Guardian Crud");
  await page.getByLabel("Guardian mobile").first().fill("+255700200002");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Student created.")).toBeVisible();

  const sRow = page.getByTestId(`student-row-${studentUsername}`);
  await expect(sRow).toBeVisible();
  await expect(sRow).toContainText("Yes");

  await sRow.getByTestId("student-edit").click();
  const editDialog = page.getByRole("dialog", { name: "Edit student" });
  await editDialog.getByLabel("Name").fill("Student Updated");
  await editDialog.getByRole("checkbox", { name: "Student is a minor" }).uncheck();
  await editDialog.getByRole("button", { name: "Save" }).click();
  await expect(sRow).toContainText("Student Updated");
  await expect(sRow).toContainText("No");

  await sRow.getByTestId("student-reset-password").click();
  const resetDialog = page.getByRole("dialog", { name: "Reset student password" });
  await resetDialog.getByLabel("New temporary password").fill("s1newpass");
  await resetDialog.getByRole("button", { name: "Reset password" }).click();

  await sRow.getByTestId("student-suspend").click();
  await page.getByRole("dialog").getByRole("button", { name: "Suspend" }).click();
  await expect(sRow.getByTestId("student-status")).toHaveText("suspended");
  await sRow.getByTestId("student-activate").click();
  await page.getByRole("dialog").getByRole("button", { name: "Activate" }).click();
  await expect(sRow.getByTestId("student-status")).toHaveText("active");

  await sRow.getByTestId("student-delete").click();
  const delDialog = page.getByRole("dialog");
  await delDialog.getByLabel("Confirm text").fill("DELETE");
  await delDialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByTestId(`student-row-${studentUsername}`)).toHaveCount(0);

  // Admin create + reset password, then verify login works.
  await page.goto(`/admin/admins?device=${device}`);
  await page.getByLabel("Name").first().fill("New Admin");
  await page.getByLabel("Username").first().fill(adminUsername);
  await page.getByLabel("Temp password").first().fill("a1pass");
  await page.getByLabel("Mobile").first().fill("+255700300001");
  await page.getByLabel("Country").first().fill("Tanzania");
  await page.getByLabel("Region").first().fill("Dar");
  await page.getByLabel("Street").first().fill("Mikocheni");
  await page.getByLabel("Date of birth").first().fill("1990-01-01");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Admin created.")).toBeVisible();

  const aRow = page.getByTestId(`admin-row-${adminUsername}`);
  await expect(aRow).toBeVisible();
  await aRow.getByTestId("admin-reset-password").click();
  const aReset = page.getByRole("dialog", { name: "Reset admin password" });
  await aReset.getByLabel("New temporary password").fill("a1newpass");
  await aReset.getByRole("button", { name: "Reset password" }).click();

  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill(adminUsername);
  await page.getByLabel("Password").fill("a1newpass");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Admin", exact: true })).toBeVisible();
});
