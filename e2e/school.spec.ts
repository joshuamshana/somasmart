import { test, expect } from "@playwright/test";

test("School admin: create student and grant sponsored access", async ({ page }) => {
  const studentUsername = `school_student_${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("Username").fill("schooladmin");
  await page.getByLabel("Password").fill("school123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("SomaSmart Demo School")).toBeVisible();
  await page.getByRole("link", { name: "Users", exact: true }).click();

  await page.getByLabel("Role").selectOption("student");
  await page.getByLabel("Full name").fill("School Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Student created.")).toBeVisible();

  await page.getByRole("link", { name: "Licenses", exact: true }).click();
  await page
    .getByLabel("Student")
    .selectOption({ label: `School Student (${studentUsername})` });
  await page.getByRole("button", { name: "Grant access" }).click();
  await expect(page.getByText("Sponsored access granted.")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();

  await page.goto("/login");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Payments", exact: true })).toBeVisible();

  await page.goto("/student/payments");
  await expect(page.getByText(/Active grants:\s*1/)).toBeVisible();
});
