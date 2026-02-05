import { test, expect } from "@playwright/test";

test("Sync: admin school CRUD propagates across devices", async ({ page }) => {
  const server = `srv_sync_school_${Date.now()}`;
  const schoolName = `Sync School ${Date.now()}`;
  const deviceA = `adminA_${server}`;
  const deviceB = `adminB_${server}`;

  // Device A: admin creates school and pushes
  await page.goto(`/login?device=${deviceA}&server=${server}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Schools", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/schools?device=${deviceA}&server=${server}`);
  await page.getByLabel("School name").fill(schoolName);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("School created.")).toBeVisible();

  await page.goto(`/sync?device=${deviceA}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  // Device B: admin pulls and sees school
  await page.goto(`/login?device=${deviceB}&server=${server}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Schools", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.goto(`/sync?device=${deviceB}&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  const schoolButton = page.getByRole("button", { name: new RegExp(schoolName) }).first();
  for (let i = 0; i < 10; i++) {
    await page.goto(`/sync?device=${deviceB}&server=${server}`);
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByTestId("sync-failed")).toContainText("0");
    await page.goto(`/admin/schools?device=${deviceB}&server=${server}`);
    const count = await schoolButton.count();
    if (count > 0) break;
  }
  await expect(schoolButton).toBeVisible({ timeout: 30_000 });
});
