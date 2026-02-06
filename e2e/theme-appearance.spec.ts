import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, username: string, password: string, device: string) {
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible({ timeout: 30_000 });
}

test("Appearance settings supports light, dark, auto and persistence", async ({ page }) => {
  const device = `theme_admin_${Date.now()}`;
  await page.emulateMedia({ colorScheme: "dark" });
  await login(page, "admin", "admin123", device);

  await page.goto(`/settings/appearance?device=${device}`);
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();

  await page.getByLabel("Light").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.getByLabel("Dark").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBg).not.toBe(darkBg);

  await page.getByLabel("Auto (system)").check();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("somasmart.themePreference")))
    .toBe("auto");
});

test("Appearance settings route is available to teacher and school admin", async ({ page }) => {
  const roles = [
    { username: "teacher1", password: "teacher123", key: "teacher" },
    { username: "schooladmin", password: "school123", key: "schooladmin" }
  ];

  for (const role of roles) {
    const device = `theme_${role.key}_${Date.now()}`;
    await login(page, role.username, role.password, device);
    await page.goto(`/settings/appearance?device=${device}`);
    await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  }
});
