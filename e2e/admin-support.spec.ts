import { test, expect } from "@playwright/test";

test("Admin support desk: sees synced message and resolves it", async ({ page }) => {
  const studentUsername = `support_student_${Date.now()}`;
  const server = `srv_support_${Date.now()}`;

  // Device A: student sends message to seeded teacher1 and syncs
  await page.goto(`/register?device=studSupA&server=${server}`);
  await page.getByLabel("Full name").fill("Support Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("Role").selectOption("student");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Support", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Support", exact: true }).click();
  await expect(page.getByLabel("Teacher")).toBeVisible();
  await page.getByLabel("Teacher").selectOption("user_teacher1");
  await page.getByPlaceholder("Type a message…").fill("Hello admin support");
  await page.getByRole("button", { name: "Send" }).click();

  await page.getByRole("link", { name: "Sync", exact: true }).click();
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-failed")).toContainText("0");
  await expect(page.getByTestId("sync-queued")).toContainText("0");
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");

  // Device B: admin pulls and resolves in support desk
  await page.goto(`/login?device=adminSupB&server=${server}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Sync", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("link", { name: "Sync", exact: true }).click();
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-failed")).toContainText("0");
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");

  await page.goto(`/admin/support?device=adminSupB&server=${server}`);
  await expect(page.getByTestId("support-table")).toBeVisible();
  await expect(page.getByText("Hello admin support")).toBeVisible();
  await page.getByRole("button", { name: "Assign to me" }).first().click();
  await page.getByRole("button", { name: "Resolve" }).first().click();
  await page.getByLabel("Status").selectOption("resolved");
  await expect(page.getByText("Hello admin support")).toBeVisible();
});
