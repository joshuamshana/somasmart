import { test, expect } from "@playwright/test";

test("Teacher lesson creator: text block variants render in preview", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible({ timeout: 30_000 });

  await page.goto("/teacher/lessons/new");
  const title = `Variant Lesson ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Level").selectOption({ label: "Primary" });
  await page.getByLabel("Class").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject").selectOption({ label: "ICT" });
  await page.getByLabel("Tags (comma separated; include 'trial' for free lessons)").fill("trial");
  await page.getByLabel("Description").fill("Lesson to verify text variants.");
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text type (block 1)").selectOption("title");
  await page.getByLabel("Text block 1").fill("My Lesson Title");

  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text type (block 2)").selectOption("body");
  await page.getByLabel("Text block 2").fill("This is normal body text.");

  // Blocks -> Quiz -> Preview
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await expect(page.getByRole("heading", { name: "My Lesson Title" })).toBeVisible();
  await expect(page.getByText("This is normal body text.")).toBeVisible();
});

