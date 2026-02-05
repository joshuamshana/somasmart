import { test, expect } from "@playwright/test";

test.setTimeout(120_000);

test("Sync: teacher approval and lesson approval propagate across devices", async ({ page, context }) => {
  const teacherUsername = `sync_teacher_${Date.now()}`;
  const server = `srv_sync_${Date.now()}`;
  const deviceTeacherA = `teachA_${server}`;
  const deviceAdminB = `adminB_${server}`;

  const adminPage = await context.newPage();

  // Device A: school admin creates teacher (pending) and pushes to mock server
  await page.goto(`/login?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Username").fill("schooladmin");
  await page.getByLabel("Password").fill("school123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("SomaSmart Demo School")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/school/users?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Role").selectOption("teacher");
  await page.getByLabel("Full name").fill("Sync Teacher");
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Teacher created (pending admin approval).")).toBeVisible();

  await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByText(/You are offline/i)).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-failed")).toContainText("0");
  await expect(page.getByTestId("sync-queued")).toContainText("0");

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  // Device B: admin pulls teacher registration, approves, and pushes approval
  await adminPage.goto(`/login?device=${deviceAdminB}&server=${server}`);
  await adminPage.getByLabel("Username").fill("admin");
  await adminPage.getByLabel("Password").fill("admin123");
  await adminPage.getByRole("button", { name: "Login" }).click();
  await expect(adminPage.getByRole("link", { name: "Teachers", exact: true })).toBeVisible({ timeout: 30_000 });

  await adminPage.goto(`/sync?device=${deviceAdminB}&server=${server}`);
  await adminPage.getByRole("button", { name: "Sync now" }).click();
  await expect(adminPage.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(adminPage.getByTestId("sync-failed")).toContainText("0");

  await adminPage.goto(`/admin/teachers?device=${deviceAdminB}&server=${server}`);
  const teacherRow = adminPage.getByTestId(`teacher-row-${teacherUsername}`);
  await expect(teacherRow).toBeVisible();
  await teacherRow.getByTestId("teacher-approve").click();
  await adminPage.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(teacherRow.getByTestId("teacher-status")).toHaveText("active");

  await adminPage.goto(`/sync?device=${deviceAdminB}&server=${server}`);
  await adminPage.getByRole("button", { name: "Sync now" }).click();
  await expect(adminPage.getByTestId("sync-failed")).toContainText("0");
  await expect(adminPage.getByTestId("sync-queued")).toContainText("0");

  // Device A: teacher logs in (pending locally), pulls approval, creates lesson, and pushes submission
  await page.goto(`/login?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(/Teacher approval pending/i)).toBeVisible();

  for (let i = 0; i < 10; i++) {
    await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByTestId("sync-failed")).toContainText("0");
    await page.goto(`/teacher?device=${deviceTeacherA}&server=${server}`);
    const visible = (await page.getByRole("heading", { name: "Teacher dashboard" }).count()) > 0;
    if (visible) break;
  }
  await expect(page.getByRole("heading", { name: "Teacher dashboard" })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/teacher/lessons/new?device=${deviceTeacherA}&server=${server}`);
  await page.getByLabel("Title").fill("Synced Lesson 1");
  await page.getByLabel("Level").selectOption({ label: "Primary" });
  await page.getByLabel("Class").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject").selectOption({ label: "ICT" });
  await page.getByLabel("Tags (comma separated; include 'trial' for free lessons)").fill("trial");
  await page.getByLabel("Description").fill("Lesson synced via mock server.");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text block 1").fill("Hello sync world");
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page).toHaveURL(/\/teacher\/lessons/);

  await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-failed")).toContainText("0");
  await expect(page.getByTestId("sync-queued")).toContainText("0");

  // Device B: admin pulls lesson and approves it
  const syncedLessonButton = adminPage.getByRole("button", { name: /Synced Lesson 1/i }).first();
  for (let i = 0; i < 20; i++) {
    await adminPage.goto(`/sync?device=${deviceAdminB}&server=${server}`);
    await adminPage.getByRole("button", { name: "Sync now" }).click();
    await expect(adminPage.getByTestId("sync-failed")).toContainText("0");
    await adminPage.goto(`/admin/lessons?device=${deviceAdminB}&server=${server}`);
    await expect(adminPage.getByRole("heading", { name: "Lessons" })).toBeVisible();
    const count = await syncedLessonButton.count();
    if (count > 0) break;
  }
  await expect(syncedLessonButton).toBeVisible({ timeout: 60_000 });
  await syncedLessonButton.click();
  await adminPage.getByRole("button", { name: "Approve" }).click();

  await adminPage.goto(`/sync?device=${deviceAdminB}&server=${server}`);
  await adminPage.getByRole("button", { name: "Sync now" }).click();
  await expect(adminPage.getByTestId("sync-failed")).toContainText("0");

  // Device A: teacher pulls lesson approval update
  await page.goto(`/sync?device=${deviceTeacherA}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  await page.goto(`/teacher/lessons?device=${deviceTeacherA}&server=${server}`);
  await expect(page.getByText("Synced Lesson 1")).toBeVisible();
});
