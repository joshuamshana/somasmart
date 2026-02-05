import { test, expect } from "@playwright/test";

test("Admin coupons: edit scope/limits and deactivate; student redemption shows inactive error", async ({ page }) => {
  const device = `adminCouponsEdit_${Date.now()}`;
  const code = `EDIT${Date.now()}`.toUpperCase();

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Coupons", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/coupons?device=${device}`);
  await page.getByLabel("Code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Coupon created.")).toBeVisible();

  const row = page.getByTestId(`coupon-row-${code}`);
  await expect(row).toBeVisible();
  await row.getByTestId("coupon-edit").click();
  const dialog = page.getByRole("dialog", { name: "Edit coupon/voucher" });
  await dialog.getByLabel("Scope").selectOption("level");
  await dialog.getByLabel("Level").selectOption("Primary");
  await dialog.getByLabel("Max redemptions").fill("5");
  await dialog.getByRole("checkbox", { name: "Active" }).uncheck();
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(row).toContainText("level:Primary");
  await expect(row).toContainText("0/5");
  await expect(row).toContainText("inactive");

  // Student tries to redeem the inactive code.
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto(`/register?device=${device}`);
  await page.getByLabel("Full name").fill("Student Y");
  await page.getByLabel("Username").fill(`s_${Date.now()}`);
  await page.getByLabel("Password").fill("pass123");
  await page.getByLabel("Role").selectOption("student");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Payments" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/student/payments?device=${device}`);
  await page.getByLabel("Code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(page.getByText("Code inactive.")).toBeVisible();
});
