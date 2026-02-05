import { test, expect } from "@playwright/test";

test("Notifications: teacher receives approval notification after sync", async ({ page }) => {
  const teacherUsername = `notif_teacher_${Date.now()}`;
  const server = `srv_notif_${Date.now()}`;

  await page.goto(`/register?device=notifTeachA&server=${server}`);
  await page.getByLabel("Full name").fill("Notif Teacher");
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("Role").selectOption("teacher");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  await page.goto(`/login?device=notifTeachA&server=${server}`);
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(/Teacher approval pending/i)).toBeVisible();
  await page.goto(`/sync?device=notifTeachA&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-queued")).toContainText("0");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  await page.goto(`/login?device=notifAdminB&server=${server}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Teachers", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.goto(`/sync?device=notifAdminB&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  await page.goto(`/admin/teachers?device=notifAdminB&server=${server}`);
  const row = page.getByTestId(`teacher-row-${teacherUsername}`);
  await expect(row).toBeVisible();
  await row.getByTestId("teacher-approve").click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await page.goto(`/sync?device=notifAdminB&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-queued")).toContainText("0");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  await page.goto(`/sync?device=notifTeachA&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-failed")).toContainText("0");
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await page.goto(`/notifications?device=notifTeachA&server=${server}`);
  await expect(page.getByText("Teacher approved")).toBeVisible({ timeout: 30_000 });
});
