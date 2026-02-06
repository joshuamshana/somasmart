import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test("Admin settings: curriculum CRUD + backup/export/reset/import roundtrip", async ({ page }) => {
  const device = `adminSettings_${Date.now()}`;

  const categoryName = `Cat ${Date.now()}`;
  const levelName = `Level ${Date.now()}`;
  const className = `Class ${Date.now()}`;
  const subjectName = `Sub ${Date.now()}`;
  const schoolName = `Backup School ${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Schools", exact: true })).toBeVisible({ timeout: 30_000 });

  // Create a school and curriculum data so the backup has something meaningful.
  await page.goto(`/admin/schools?device=${device}`);
  await page.getByLabel("School name").fill(schoolName);
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("School created.")).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(schoolName) }).first()).toBeVisible();

  await page.goto(`/admin/settings?device=${device}`);
  await page.getByLabel("New category name").fill(categoryName);
  await page.getByRole("button", { name: "Add category" }).click();
  await expect(page.locator("div.font-semibold").filter({ hasText: categoryName })).toBeVisible();

  await page.getByLabel("New level name").fill(levelName);
  await page.getByRole("button", { name: "Add level" }).click();
  await expect(page.getByRole("button", { name: levelName })).toBeVisible();
  await page.getByRole("button", { name: levelName }).click();

  await page.getByLabel("New class name").fill(className);
  await page.getByRole("button", { name: "Add class" }).click();
  await expect(page.getByRole("button", { name: className })).toBeVisible();
  await page.getByRole("button", { name: className }).click();

  await page.getByLabel("Subject name").fill(subjectName);
  await page.getByLabel("Category (optional)").selectOption({ label: categoryName });
  await page.getByRole("button", { name: "Add subject" }).click();
  await expect(page.locator("[data-testid^='subject-row-']").filter({ hasText: subjectName }).first()).toBeVisible();

  // Export backup
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("settings-export-backup").click();
  const download = await downloadPromise;
  const p = await download.path();
  expect(p).toBeTruthy();
  const backupText = await fs.readFile(p as string, "utf-8");
  expect(backupText).toContain("\"version\": 1");

  // Reset device (wipes IndexedDB + localStorage, returns to login)
  await page.getByTestId("settings-reset-device").click();
  const resetDialog = page.getByRole("dialog");
  await expect(resetDialog).toBeVisible();
  await resetDialog.getByLabel("Confirm text").fill("RESET");
  await resetDialog.getByRole("button", { name: "Reset" }).click();
  await expect(page).toHaveURL(new RegExp(`/login\\?device=${device}`));

  // Login again (seed admin exists on fresh device)
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toBeVisible({ timeout: 30_000 });

  // Import backup (overwrites local data and redirects to login)
  await page.goto(`/admin/settings?device=${device}`);
  await page
    .getByTestId("settings-import-backup")
    .setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(backupText) });

  const importDialog = page.getByRole("dialog");
  await expect(importDialog).toBeVisible();
  await importDialog.getByLabel("Confirm text").fill("IMPORT");
  await importDialog.getByRole("button", { name: "Import" }).click();
  await expect(page).toHaveURL(new RegExp(`/login\\?device=${device}`));

  // Login and verify the school + curriculum are restored
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Schools", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/schools?device=${device}`);
  await expect(page.getByRole("button", { name: new RegExp(schoolName) }).first()).toBeVisible();

  await page.goto(`/admin/settings?device=${device}`);
  await expect(page.locator("div.font-semibold").filter({ hasText: categoryName })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(levelName) }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(className) }).first()).toBeVisible();
  await expect(page.locator("[data-testid^='subject-row-']").filter({ hasText: subjectName }).first()).toBeVisible();
});
