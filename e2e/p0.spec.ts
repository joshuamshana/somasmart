import { test, expect } from "@playwright/test";

test("P0: student registers -> opens lesson -> completes quiz", async ({ page, context }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Student One");
  await page.getByLabel("Username").fill(`student_${Date.now()}`);
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("Role").selectOption("student");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Lessons", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Lessons", exact: true }).click();
  const seededLesson = page.getByRole("link", { name: /Introduction to Numbers/i }).first();
  await expect(seededLesson).toBeVisible();

  // simulate offline (PWA-style) for catalog navigation
  await context.setOffline(true);
  await seededLesson.click();
  await expect(page.getByText("Self Test Quiz")).toBeVisible();
  await page.getByText("4").click();
  await page.getByRole("button", { name: "Submit Quiz" }).click();
  await expect(page.getByText("Correct")).toBeVisible();
});

test("P0: teacher registers -> admin approves -> teacher submits lesson -> admin approves -> student sees it", async ({
  page
}) => {
  const teacherUsername = `teacher_${Date.now()}`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Teacher Two");
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("Role").selectOption("teacher");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("button", { name: "Login" })).toBeVisible();

  // admin approves teacher
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Teachers", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Teachers", exact: true }).click();
  const row = page.getByTestId(`teacher-row-${teacherUsername}`);
  await expect(row).toBeVisible();
  await row.getByTestId("teacher-approve").click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(row.getByTestId("teacher-status")).toHaveText("active");
  await page.getByRole("button", { name: "Logout" }).click();

  // teacher submits a minimal lesson
  await page.goto("/login");
  await page.getByLabel("Username").fill(teacherUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Upload Lesson", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Upload Lesson", exact: true }).click();
  await page.getByLabel("Title").fill("Teacher Lesson 1");
  await page.getByLabel("Subject").fill("Science");
  await page.getByLabel("Tags (comma separated; include 'trial' for free lessons)").fill("trial");
  await page.getByLabel("Description").fill("A teacher-created lesson.");
  await page.getByRole("button", { name: "Add text" }).click();
  await page.getByLabel("Text block 1").fill("Lesson content");
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await expect(page.getByText("Submitted for approval.")).toBeVisible();
  await page.getByRole("button", { name: "Logout" }).click();

  // admin approves lesson
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Lessons", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Lessons", exact: true }).click();
  await page.getByText("Teacher Lesson 1").first().click();
  await page.getByRole("button", { name: "Approve" }).click();
});

test("P0: student unlocks content via coupon", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Student Two");
  await page.getByLabel("Username").fill(`student_${Date.now()}`);
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("Role").selectOption("student");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Payments", exact: true })).toBeVisible();

  await page.goto("/student/payments");
  await page.getByLabel("Code").fill("FREE30");
  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(page.getByText("Access unlocked offline.")).toBeVisible();
});
