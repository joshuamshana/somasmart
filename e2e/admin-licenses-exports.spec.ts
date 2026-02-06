import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test("Admin licenses: extend/revoke grant and export payments CSV", async ({ page }) => {
  const device = `adminLic_${Date.now()}`;
  const studentName = "Lic Student";
  const studentUsername = `lic_${Date.now()}`;

  // Register student into seeded school (SOMA001)
  await page.goto(`/register?device=${device}`);
  await page.getByLabel("Full name").fill(studentName);
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("pass123");
  await page.getByLabel("School code (optional)").fill("SOMA001");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Payments", exact: true })).toBeVisible({ timeout: 30_000 });

  // School admin grants sponsored access
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("schooladmin");
  await page.getByLabel("Password").fill("school123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Licenses", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.goto(`/school/licenses?device=${device}`);
  await page.getByLabel("Student").selectOption({ label: `${studentName} (${studentUsername})` });
  await page.getByRole("button", { name: "Grant access" }).click();
  await expect(page.getByText("Sponsored access granted.")).toBeVisible();

  // Admin extends then revokes
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Licenses", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/licenses?device=${device}`);
  await page.getByLabel("Search").fill(studentName);
  const row = page.locator("tbody tr").filter({ hasText: studentName }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  const before = await row.locator("td").nth(2).innerText();
  await row.getByTestId("grant-extend").click();
  await page.getByRole("dialog").getByRole("button", { name: "Extend" }).click();
  await expect(row.locator("td").nth(2)).not.toHaveText(before);
  const after = await row.locator("td").nth(2).innerText();
  expect(after).not.toEqual(before);

  await row.getByTestId("grant-revoke").click();
  await page.getByRole("dialog").getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByText(studentName)).toHaveCount(0);

  // Export payments CSV includes sponsored payment
  await page.goto(`/admin/payments?device=${device}`);
  const dlPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  const dl = await dlPromise;
  const p = await dl.path();
  expect(p).toBeTruthy();
  const csv = await fs.readFile(p as string, "utf-8");
  expect(csv).toContain("createdAt,student,method,status,reference,paymentId");
  expect(csv).toContain("sponsored");
});
