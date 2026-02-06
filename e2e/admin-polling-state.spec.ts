import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page, device: string) {
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });
}

test("Admin pages: polling refresh does not reset support filters", async ({ page }) => {
  const device = `adminPollingSupport_${Date.now()}`;
  await loginAsAdmin(page, device);

  await page.goto(`/admin/support?device=${device}`);
  await expect(page.getByTestId("support-table")).toBeVisible();

  const search = page.getByLabel("Search");
  const status = page.getByLabel("Status");

  await search.fill("hello");
  await status.selectOption("resolved");

  await page.waitForTimeout(2300);
  await expect(search).toHaveValue("hello");
  await expect(status).toHaveValue("resolved");
});

test("Admin pages: polling refresh does not reset audit filters", async ({ page }) => {
  const device = `adminPollingAudit_${Date.now()}`;
  await loginAsAdmin(page, device);

  await page.goto(`/admin/audit?device=${device}`);
  await expect(page.getByRole("heading", { name: "Audit logs" })).toBeVisible();

  const search = page.getByLabel("Search", { exact: true });
  const from = page.getByLabel("From (YYYY-MM-DD)", { exact: true });
  const to = page.getByLabel("To (YYYY-MM-DD)", { exact: true });

  await search.fill("settings");
  await from.fill("2020-01-01");
  await to.fill("2030-12-31");

  await page.waitForTimeout(2300);
  await expect(search).toHaveValue("settings");
  await expect(from).toHaveValue("2020-01-01");
  await expect(to).toHaveValue("2030-12-31");
});

test("Admin pages: polling refresh does not reset licenses filters", async ({ page }) => {
  const device = `adminPollingLicenses_${Date.now()}`;
  await loginAsAdmin(page, device);

  await page.goto(`/admin/licenses?device=${device}`);
  await expect(page.getByRole("heading", { name: "License grants" })).toBeVisible();

  const search = page.getByLabel("Search", { exact: true });
  const extendDays = page.getByLabel("Extend days", { exact: true });

  await search.fill("student");
  await extendDays.fill("45");

  await page.waitForTimeout(2700);
  await expect(search).toHaveValue("student");
  await expect(extendDays).toHaveValue("45");
});
