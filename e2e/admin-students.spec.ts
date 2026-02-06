import { test, expect } from "@playwright/test";

test("Admin: suspend student and see audit log", async ({ page }) => {
  const studentUsername = `stud_${Date.now()}`;
  const server = `srv_admin_students_${Date.now()}`;

  // Student registers
  await page.goto(`/register?device=adminB&server=${server}`);
  await page.getByLabel("Full name").fill("Student X");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByText("Learn", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Login", exact: true })).toBeVisible();

  // Admin suspends student
  await page.goto(`/login?device=adminB&server=${server}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Students", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.goto(`/admin/students?device=adminB&server=${server}`);

  const row = page.getByTestId(`student-row-${studentUsername}`);
  await expect(row).toBeVisible();
  await row.getByTestId("student-suspend").click();
  await page.getByRole("dialog").getByRole("button", { name: "Suspend" }).click();
  await expect(row.getByTestId("student-status")).toHaveText("suspended");

  // Audit log shows action
  await page.goto(`/admin/audit?device=adminB&server=${server}`);
  await expect(page.getByTestId("audit-table")).toBeVisible();
  await page.getByLabel("Action").selectOption("student_suspend");
  await expect(page.getByTestId("audit-table").getByText("student_suspend").first()).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();

  // Suspended student cannot log in
  await page.goto(`/login?device=adminB&server=${server}`);
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("Account suspended.")).toBeVisible();
});
