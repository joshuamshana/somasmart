import { test, expect } from "@playwright/test";

test("Teacher lessons: delete requires confirmation; cancel keeps lesson", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible({ timeout: 30_000 });

  const title = `Delete Me ${Date.now()}`;
  await page.goto("/teacher/lessons/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Level").selectOption({ label: "Primary" });
  await page.getByLabel("Class").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject").selectOption({ label: "ICT" });
  await page.getByLabel("Access").selectOption({ label: "Free" });
  await page.getByLabel("Tags (comma separated)").fill("trial");
  await page.getByLabel("Description").fill("Lesson for delete confirmation test.");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text block 1").fill("Hello");
  await page.getByRole("button", { name: "Save draft" }).click();

  await page.goto("/teacher/lessons");
  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row).toBeVisible();

  // Open navigates to the edit builder and pre-fills metadata.
  await row.getByRole("button", { name: "Open" }).click();
  await expect(page).toHaveURL(/\/teacher\/lessons\/.+\/edit/);
  await expect(page.getByRole("heading", { name: "Edit lesson" })).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveValue(title);
  await page.getByRole("link", { name: "My Lessons", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My lessons" })).toBeVisible();

  await row.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Delete" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText(title)).toHaveCount(0);
});
