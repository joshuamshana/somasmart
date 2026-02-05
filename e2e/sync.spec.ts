import { test, expect } from "@playwright/test";

test("Sync: teacher approval and lesson approval propagate across devices", async ({ page, context }) => {
  const teacherUsername = `sync_teacher_${Date.now()}`;
  const server = `srv_sync_${Date.now()}`;
  const deviceTeacherA = `teachA_${server}`;
  const deviceAdminB = `adminB_${server}`;

  // Device A: teacher registers (pending)
  await page.goto(`/register?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Full name").fill("Sync Teacher");
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("Role").selectOption("teacher");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  // Teacher logs in (still pending) to access Sync page
  await page.goto(`/login?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(/Teacher approval pending/i)).toBeVisible();

  // Offline sync attempt should fail
  await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByText(/You are offline/i)).toBeVisible();
  await context.setOffline(false);

  // Push teacher registration to mock server
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByText(/Outbox queued:\s*0/i)).toBeVisible();
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  // Device B: admin pulls teacher registration
  await page.goto(`/login?device=${deviceAdminB}&server=${server}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Teachers", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.goto(`/sync?device=${deviceAdminB}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  await page.goto(`/admin/teachers?device=${deviceAdminB}&server=${server}`);
  const row = page.getByTestId(`teacher-row-${teacherUsername}`);
  await expect(row).toBeVisible();
  await row.getByTestId("teacher-approve").click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(row.getByTestId("teacher-status")).toHaveText("active");

  // Push approval
  await page.goto(`/sync?device=${deviceAdminB}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-queued")).toContainText("0");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  // Device A: teacher pulls approval and submits lesson
  await page.goto(`/login?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(/Teacher approval pending/i)).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
    await expect(page.getByTestId("sync-failed")).toContainText("0");
    await page.goto(`/teacher?device=${deviceTeacherA}&server=${server}`);
    const quickActionsVisible = (await page.getByText("Quick actions").count()) > 0;
    if (quickActionsVisible) break;
  }
  await page.goto(`/teacher?device=${deviceTeacherA}&server=${server}`);
  await expect(page.getByText("Quick actions")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/teacher/lessons/new?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Title").fill("Synced Lesson 1");
  await page.getByLabel("Subject").fill("Science");
  await page.getByLabel("Tags (comma separated; include 'trial' for free lessons)").fill("trial");
  await page.getByLabel("Description").fill("Lesson synced via mock server.");
  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text block 1").fill("Hello sync world");
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page.getByText("Submitted for approval.")).toBeVisible();

  await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-queued")).toContainText("0");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  // Device B: admin pulls lesson and approves it
  const syncedLessonButton = page.getByRole("button", { name: /Synced Lesson 1/i }).first();
  for (let i = 0; i < 10; i++) {
    await page.goto(`/sync?device=${deviceAdminB}&server=${server}`);
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
    await expect(page.getByTestId("sync-queued")).toContainText("0");
    await expect(page.getByTestId("sync-failed")).toContainText("0");
    await page.goto(`/admin/lessons?device=${deviceAdminB}&server=${server}`);
    await expect(page.getByRole("heading", { name: "Lessons" })).toBeVisible();
    const count = await syncedLessonButton.count();
    if (count > 0) break;
  }
  await expect(syncedLessonButton).toBeVisible({ timeout: 30_000 });
  await syncedLessonButton.click();
  await page.getByRole("button", { name: "Approve" }).click();

  await page.goto(`/sync?device=${deviceAdminB}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");

  // Teacher pulls approval notification/status update
  await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await page.goto(`/teacher/lessons?device=${deviceTeacherA}&server=${server}`);
  await expect(page.getByText("Synced Lesson 1")).toBeVisible();
});
