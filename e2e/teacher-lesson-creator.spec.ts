import { test, expect } from "@playwright/test";

test("Teacher lesson creator: metadata gating -> blocks -> submit", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible({ timeout: 30_000 });

  await page.goto("/teacher/lessons/new");
  const next = page.getByRole("button", { name: "Next" });
  await expect(next).toBeDisabled();

  const title = `Wizard Lesson ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Level").selectOption({ label: "Primary" });
  await page.getByLabel("Class").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject").selectOption({ label: "ICT" });
  await page.getByLabel("Tags (comma separated; include 'trial' for free lessons)").fill("trial");
  await page.getByLabel("Description").fill("Created via the teacher wizard.");

  await expect(next).toBeEnabled();
  await next.click();

  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text block 1").fill("Lesson content from the wizard.");

  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page).toHaveURL(/\/teacher\/lessons/);
  await expect(page.getByText(title)).toBeVisible();
});
