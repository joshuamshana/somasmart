import { test, expect } from "@playwright/test";

test("Teacher upload UX: responsive layouts and predictive guidance", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible({ timeout: 30_000 });

  await page.goto("/teacher");
  await expect(page.getByText("Suggested next step")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create lesson" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/teacher/lessons");
  await expect(page.getByText("Suggested next step")).toBeVisible();
  await expect(page.getByRole("button", { name: /^All \(/ })).toBeVisible();

  await page.goto("/teacher/lessons/new");
  await expect(page.getByTestId("teacher-sidebar")).toBeHidden();
  await expect(page.getByTestId("teacher-mobile-header")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Create lesson/ })).toBeVisible();
  await expect(page.getByTestId("lesson-section-tabs")).toBeVisible();
  await page.getByLabel("Title").fill(`UX Lesson ${Date.now()}`);
  await page.getByLabel("Level").selectOption({ label: "Primary" });
  await page.getByLabel("Class").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject").selectOption({ label: "ICT" });
  await page.getByLabel("Access").selectOption({ label: "Free" });
  await page.getByLabel("Tags (comma separated)").fill("trial");
  await page.getByLabel("Description").fill("Responsive upload experience check.");
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page).toHaveURL(/step=blocks/);
  await expect(page.getByTestId("lesson-context-action-strip")).toBeVisible();
  await expect(page.getByText("Predictive hint")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add text" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload + Quiz" })).toBeVisible();
});
