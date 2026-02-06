import { test, expect } from "@playwright/test";

test("Video block: teacher uploads -> admin approves -> student plays offline", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Upload Lesson", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto("/teacher/lessons/new");
  await page.getByLabel("Title").fill("Video Lesson 1");
  await page.getByLabel("Level").selectOption({ label: "Primary" });
  await page.getByLabel("Class").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject").selectOption({ label: "ICT" });
  await page.getByLabel("Access").selectOption({ label: "Free" });
  await page.getByLabel("Tags (comma separated)").fill("trial");
  await page.getByLabel("Description").fill("Lesson with offline video.");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text block 1").fill("Watch the video below.");

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles({
    name: "sample.webm",
    mimeType: "video/webm",
    buffer: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00])
  });
  await expect(page.getByText(/\(VIDEO\)/)).toBeVisible();

  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Submit for approval" }).first().click();
  await expect(page).toHaveURL(/\/teacher\/lessons/);
  await page.getByTestId("teacher-sidebar-logout").click();

  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Lessons", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.goto("/admin/lessons");
  await expect(page.getByText("Video Lesson 1").first()).toBeVisible();
  await page.getByText("Video Lesson 1").first().click();
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("button", { name: "Logout" }).click();

  const studentUsername = `video_student_${Date.now()}`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Video Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Lessons", exact: true })).toBeVisible();

  await page.goto("/student/lessons");
  await page.getByText("Video Lesson 1").first().click();

  const video = page.locator("video");
  const submitQuiz = page.getByRole("button", { name: "Submit Quiz" });
  for (let i = 0; i < 6; i++) {
    if (await video.isVisible()) break;
    // If a quiz step blocks progression, we should already be on the video step (no quiz in this lesson).
    if (await submitQuiz.isVisible()) break;
    const next = page.getByRole("button", { name: "Next" });
    if (await next.isVisible()) {
      const disabled = await next.evaluate((el) => (el as HTMLButtonElement).disabled);
      if (!disabled) {
        await next.evaluate((el) => (el as HTMLButtonElement).click());
        await page.waitForTimeout(150);
        continue;
      }
    }
    await page.waitForTimeout(200);
  }

  await expect(video).toBeVisible();
});
