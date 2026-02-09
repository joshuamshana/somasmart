import { test, expect } from "@playwright/test";

test("Teacher can author quiz blocks and questions in lesson builder", async ({ page }) => {
  const device = `teacherQuiz_${Date.now()}`;
  const title = `Quiz Authored ${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("teacher-sidebar-logout")).toBeVisible({ timeout: 30_000 });

  await page.goto(`/teacher/lessons/new?device=${device}`);
  await expect(page.getByTestId("teacher-sidebar")).toBeVisible();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Level").selectOption({ label: "Primary" });
  await page.getByLabel("Class").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject").selectOption({ label: "ICT" });
  await page.getByLabel("Access").selectOption({ label: "Free" });
  await page.getByLabel("Description").fill("Lesson with teacher-authored quiz.");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/step=blocks/);

  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text block 1").fill("Quiz content intro.");
  await page.getByLabel("Require quiz to continue").check();
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByLabel("Prompt").first().fill("What is 2 + 2?");
  await page.getByLabel("Option 1").first().fill("3");
  await page.getByLabel("Option 2").first().fill("4");
  await page.getByLabel("Option 3").first().fill("5");
  await page.getByLabel("Option 4").first().fill("6");
  await page.getByLabel("Correct option").first().selectOption("1");
  await page.getByLabel("Explanation").first().fill("2 + 2 equals 4.");

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Student preview")).toBeVisible();
  if ((await page.getByText("What is 2 + 2?").count()) === 0) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText("What is 2 + 2?")).toBeVisible();
});
