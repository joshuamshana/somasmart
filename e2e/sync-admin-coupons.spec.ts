import { test, expect } from "@playwright/test";

test("Sync: admin coupon CRUD propagates to student device", async ({ page }) => {
  const server = `srv_sync_coupon_${Date.now()}`;
  const code = `SYNC${Date.now()}`.toUpperCase();
  const studentUsername = `sync_coupon_student_${Date.now()}`;
  const deviceAdminA = `adminA_${server}`;
  const deviceStudentB = `studB_${server}`;

  // Device A: admin creates coupon and pushes
  await page.goto(`/login?device=${deviceAdminA}&server=${server}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Coupons", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/coupons?device=${deviceAdminA}&server=${server}`);
  await page.getByLabel("Code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Coupon created.")).toBeVisible();

  await page.goto(`/sync?device=${deviceAdminA}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  // Device B: student registers and pulls coupon
  await page.goto(`/register?device=${deviceStudentB}&server=${server}`);
  await page.getByLabel("Full name").fill("Sync Coupon Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Payments" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/sync?device=${deviceStudentB}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  for (let i = 0; i < 10; i++) {
    await page.goto(`/sync?device=${deviceStudentB}&server=${server}`);
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByTestId("sync-failed")).toContainText("0");

    await page.goto(`/student/payments?device=${deviceStudentB}&server=${server}`);
    await page.getByLabel("Code", { exact: true }).fill(code);
    await page.getByRole("button", { name: "Redeem" }).click();
    const ok = await page.getByText("Access unlocked offline.").count();
    if (ok > 0) break;
  }
  await expect(page.getByText("Access unlocked offline.")).toBeVisible();
});
