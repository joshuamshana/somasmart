import { test, expect } from "@playwright/test";

test("Admin confirmations: cancel prevents change; typed confirm required for delete", async ({ page }) => {
  const device = `adminConf_${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/admin/teachers?device=${device}`);
  const row = page.getByTestId("teacher-row-teacher1");
  await expect(row).toBeVisible();
  await expect(row.getByTestId("teacher-status")).toHaveText("active");

  // Cancel suspend
  await row.getByTestId("teacher-suspend").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(row.getByTestId("teacher-status")).toHaveText("active");

  // Confirm suspend
  await row.getByTestId("teacher-suspend").click();
  await page.getByRole("dialog").getByRole("button", { name: "Suspend" }).click();
  await expect(row.getByTestId("teacher-status")).toHaveText("suspended");

  // Delete requires typing DELETE
  await row.getByTestId("teacher-delete").click();
  const delDialog = page.getByRole("dialog");
  await expect(delDialog.getByLabel("Confirm text")).toBeVisible();
  const deleteButton = delDialog.getByRole("button", { name: "Delete" });
  await expect(deleteButton).toBeDisabled();
  await delDialog.getByLabel("Confirm text").fill("DELETE");
  await expect(deleteButton).toBeEnabled();
  await deleteButton.click();
  await expect(page.getByTestId("teacher-row-teacher1")).toHaveCount(0);
});
