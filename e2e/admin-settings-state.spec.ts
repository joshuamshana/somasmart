import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page, device: string) {
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });
}

test("Admin settings: selected level stays selected after time passes", async ({ page }) => {
  const device = `adminSettingsState_${Date.now()}`;
  const levelAName = `Level A ${Date.now()}`;
  const levelBName = `Level B ${Date.now()}`;
  const classB1Name = `Class B1 ${Date.now()}`;

  await loginAsAdmin(page, device);
  await page.goto(`/admin/settings?device=${device}`);

  await page.getByLabel("New level name").fill(levelAName);
  await page.getByLabel("Level sort order").fill("1");
  await page.getByRole("button", { name: "Add level" }).click();
  const levelAButton = page.getByRole("button").filter({ hasText: levelAName }).first();
  await expect(levelAButton).toBeVisible();

  await page.getByLabel("New level name").fill(levelBName);
  await page.getByLabel("Level sort order").fill("2");
  await page.getByRole("button", { name: "Add level" }).click();
  const levelBButton = page.getByRole("button").filter({ hasText: levelBName }).first();
  await expect(levelBButton).toBeVisible();

  await levelBButton.click();
  const levelSelect = page.getByLabel("Level", { exact: true });
  await expect(levelSelect.locator("option:checked")).toHaveText(levelBName);

  await page.waitForTimeout(3000);
  await expect(levelSelect.locator("option:checked")).toHaveText(levelBName);

  await page.getByLabel("New class name").fill(classB1Name);
  await page.getByRole("button", { name: "Add class" }).click();
  const classB1Button = page.getByRole("button").filter({ hasText: classB1Name }).first();
  await expect(classB1Button).toBeVisible();

  await levelAButton.click();
  await expect(page.getByRole("button").filter({ hasText: classB1Name })).toHaveCount(0);
});

test("Admin settings: system settings draft isn't clobbered by curriculum actions", async ({ page }) => {
  const device = `adminSettingsDraft_${Date.now()}`;
  const levelName = `Draft Level ${Date.now()}`;

  await loginAsAdmin(page, device);
  await page.goto(`/admin/settings?device=${device}`);

  const autoSyncInput = page.getByLabel("Auto sync interval minutes (0 = off)", { exact: true });
  await autoSyncInput.fill("7");
  await expect(autoSyncInput).toHaveValue("7");

  await page.getByLabel("New level name").fill(levelName);
  await page.getByRole("button", { name: "Add level" }).click();
  await expect(page.getByRole("button").filter({ hasText: levelName }).first()).toBeVisible();

  await expect(autoSyncInput).toHaveValue("7");
});

test("Admin settings: category can remain Uncategorized after categories change", async ({ page }) => {
  const device = `adminSettingsUncat_${Date.now()}`;
  const levelName = `Uncat Level ${Date.now()}`;
  const className = `Uncat Class ${Date.now()}`;
  const categoryName = `Uncat Category ${Date.now()}`;

  await loginAsAdmin(page, device);
  await page.goto(`/admin/settings?device=${device}`);

  await page.getByLabel("New level name").fill(levelName);
  await page.getByLabel("Level sort order").fill("1");
  await page.getByRole("button", { name: "Add level" }).click();
  await page.getByRole("button").filter({ hasText: levelName }).first().click();

  await page.getByLabel("New class name").fill(className);
  await page.getByRole("button", { name: "Add class" }).click();
  await page.getByRole("button").filter({ hasText: className }).first().click();

  const categorySelect = page.getByLabel("Category (optional)");
  await categorySelect.selectOption("");
  await expect(categorySelect).toHaveValue("");

  await page.getByLabel("New category name").fill(categoryName);
  await page.getByRole("button", { name: "Add category" }).click();
  await expect(page.locator("div.font-semibold").filter({ hasText: categoryName }).first()).toBeVisible();

  await expect(categorySelect).toHaveValue("");
});
