import { test, expect } from "@playwright/test";

test("Notifications: teacher receives approval notification after sync", async ({ page }) => {
  const teacherUsername = `notif_teacher_${Date.now()}`;
  const server = `srv_notif_${Date.now()}`;
  const deviceTeacherA = `notifTeachA_${server}`;
  const deviceAdminB = `notifAdminB_${server}`;
  const adminPage = await page.context().newPage();

  // School admin creates teacher (pending) on device A, then syncs so admin can see it.
  await page.goto(`/login?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Username").fill("schooladmin");
  await page.getByLabel("Password").fill("school123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("SomaSmart Demo School")).toBeVisible({ timeout: 30_000 });
  await page.goto(`/school/users?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Role").selectOption("teacher");
  await page.getByLabel("Full name").fill("Notif Teacher");
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Teacher created (pending admin approval).")).toBeVisible();

  await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never", { timeout: 30_000 });
  await expect(page.getByTestId("sync-status")).toHaveAttribute("data-status", "idle");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  // Switch users on the same device (clear the per-device session key).
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  await page.goto(`/login?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();

  await adminPage.goto(`/login?device=${deviceAdminB}&server=${server}`);
  await adminPage.getByLabel("Username").fill("admin");
  await adminPage.getByLabel("Password").fill("admin123");
  await adminPage.getByRole("button", { name: "Login" }).click();
  await expect(adminPage.getByRole("link", { name: "Teachers", exact: true })).toBeVisible({ timeout: 30_000 });
  await adminPage.goto(`/sync?device=${deviceAdminB}&server=${server}`);
  await adminPage.getByRole("button", { name: "Sync now" }).click();
  await expect(adminPage.getByTestId("sync-last-sync")).not.toContainText("Never", { timeout: 30_000 });
  await expect(adminPage.getByTestId("sync-status")).toHaveAttribute("data-status", "idle");
  await expect(adminPage.getByTestId("sync-failed")).toContainText("0");

  await adminPage.goto(`/admin/teachers?device=${deviceAdminB}&server=${server}`);
  const row = adminPage.getByTestId(`teacher-row-${teacherUsername}`);
  await expect(row).toBeVisible();
  await row.getByTestId("teacher-approve").click();
  await adminPage.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await adminPage.goto(`/sync?device=${deviceAdminB}&server=${server}`);
  await adminPage.getByRole("button", { name: "Sync now" }).click();
  await expect(adminPage.getByTestId("sync-status")).toHaveAttribute("data-status", "idle");
  await expect(adminPage.getByTestId("sync-queued")).toContainText("0");
  await expect(adminPage.getByTestId("sync-failed")).toContainText("0");

  await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-status")).toHaveAttribute("data-status", "idle");
  await expect(page.getByTestId("sync-failed")).toContainText("0");
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  for (let i = 0; i < 10; i++) {
    await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByTestId("sync-status")).toHaveAttribute("data-status", "idle");
    await expect(page.getByTestId("sync-failed")).toContainText("0");
    await page.goto(`/notifications?device=${deviceTeacherA}&server=${server}`);
    const count = await page.getByText("Teacher approved").count();
    if (count > 0) break;
  }
  await expect(page.getByText("Teacher approved")).toBeVisible({ timeout: 30_000 });
});
