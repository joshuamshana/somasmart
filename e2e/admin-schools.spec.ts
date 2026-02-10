import { test, expect } from "@playwright/test";

test("Admin: create school and school admin", async ({ page }) => {
  const schoolName = `Test School ${Date.now()}`;
  const schoolAdminUsername = `sa_${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Schools", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto("/admin/schools");
  await page.getByLabel("School name").fill(schoolName);
  const code = await page.getByLabel("School code").inputValue();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("School created.")).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(schoolName) }).first()).toBeVisible();

  await page.getByLabel("Enable messaging for minors (school-level)").click();
  await page.getByRole("dialog").getByRole("button", { name: "Enable" }).click();

  await page.getByLabel("Admin name").fill("School Admin X");
  await page.getByLabel("Admin username").fill(schoolAdminUsername);
  await page.getByLabel("Temp password").fill("school123");
  await page.getByLabel("Mobile").fill("+255700999001");
  await page.getByLabel("Country").fill("Tanzania");
  await page.getByLabel("Region").fill("Arusha");
  await page.getByLabel("Street").fill("School Rd 2");
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await page.getByRole("button", { name: "Create school admin" }).click();
  await expect(page.getByText("School admin created.")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();

  await page.goto("/login");
  await page.getByLabel("Username").fill(schoolAdminUsername);
  await page.getByLabel("Password").fill("school123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(schoolName)).toBeVisible();
  await expect(page.getByText(new RegExp(code))).toBeVisible();
});
