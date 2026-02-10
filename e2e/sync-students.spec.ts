import { test, expect } from "@playwright/test";
import { fillStudentRegisterKyc } from "./helpers/kyc";

test("Sync: student registration + suspension propagate across devices", async ({ page }) => {
  const studentUsername = `sync_student_${Date.now()}`;
  const server = `srv_sync_student_${Date.now()}`;
  const deviceStudentA = `studA_${server}`;
  const deviceAdminB = `adminB_${server}`;

  // Device A: student registers and pushes registration
  await page.goto(`/register?device=${deviceStudentA}&server=${server}`);
  await page.getByLabel("Full name").fill("Sync Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await fillStudentRegisterKyc(page);
  await page.getByRole("button", { name: "Register" }).click();
  if (page.url().includes("/login")) {
    await page.getByLabel("Username").fill(studentUsername);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Login" }).click();
  }
  await expect(page.getByText("Learn", { exact: true })).toBeVisible();
  await expect(page.getByTestId("student-sidebar-logout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/sync?device=${deviceStudentA}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-queued")).toContainText("0");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  // Device B: admin pulls student and suspends
  await page.goto(`/login?device=${deviceAdminB}&server=${server}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Sync", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("link", { name: "Sync", exact: true }).click();
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  await page.goto(`/admin/students?device=${deviceAdminB}&server=${server}`);
  const row = page.getByTestId(`student-row-${studentUsername}`);
  await expect(row).toBeVisible();
  await row.getByTestId("student-suspend").click();
  await page.getByRole("dialog").getByRole("button", { name: "Suspend" }).click();
  await expect(row.getByTestId("student-status")).toHaveText("suspended");

  await page.goto(`/sync?device=${deviceAdminB}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-queued")).toContainText("0");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  // Device A: student pulls update and cannot log in
  await page.goto(`/sync?device=${deviceStudentA}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-queued")).toContainText("0");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  await page.getByTestId("student-sidebar-logout").click();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  await page.goto(`/login?device=${deviceStudentA}&server=${server}`);
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("Account suspended.")).toBeVisible();
});
