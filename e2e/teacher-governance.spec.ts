import { test, expect } from "@playwright/test";

test("Teacher governance: register is student-only", async ({ page }) => {
  await page.goto("/register");
  await expect(page.getByRole("button", { name: "Register" })).toBeVisible();
  await expect(
    page.getByText("Teachers are created by your School Admin and approved by the System Admin.")
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByLabel("School code (optional)")).toBeVisible();
});
