import { test, expect } from "@playwright/test";

test("Parental controls: minors messaging blocked unless enabled by school", async ({ page }) => {
  const studentUsername = `minor_student_${Date.now()}`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Minor Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("Role").selectOption("student");
  await page.getByLabel("School code (optional)").fill("SOMA001");
  await page.getByLabel("Student is a minor (parental controls)").check();
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Support", exact: true })).toBeVisible();

  await page.goto("/student/support");
  await expect(page.getByText(/Messaging is disabled for minors/i)).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();

  await page.goto("/login");
  await page.getByLabel("Username").fill("schooladmin");
  await page.getByLabel("Password").fill("school123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("SomaSmart Demo School")).toBeVisible();

  await page.getByLabel("Enable messaging for minors").check();
  await page.getByRole("button", { name: "Logout" }).click();

  await page.goto("/login");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Support", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto("/student/support");
  await expect(page.getByLabel("Teacher")).toBeVisible();
});
