import { test, expect } from "@playwright/test";

test("School admin: create student and grant sponsored access", async ({ page }) => {
  const device = `school_${Date.now()}`;
  const studentUsername = `school_student_${Date.now()}`;

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill("schooladmin");
  await page.getByLabel("Password").fill("school123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByTestId("school-layout")).toBeVisible({ timeout: 30_000 });

  await expect(page.getByText("SomaSmart Demo School")).toBeVisible();
  await expect(page.getByText("Students")).toBeVisible();
  await expect(page.getByText("Teachers")).toBeVisible();
  await page.goto(`/school/analytics?device=${device}`);
  await expect(page.getByText("Students")).toBeVisible();
  await expect(page.getByText("Active (7d)")).toBeVisible();
  await expect(page.getByText("Avg quiz score")).toBeVisible();
  await expect(page.getByText("Lessons completed")).toBeVisible();
  await page.goto(`/school/users?device=${device}`);

  await page.getByLabel("Role").selectOption("student");
  await page.getByLabel("Full name").fill("School Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Student created.")).toBeVisible();

  await page.getByTestId("school-sidebar-panel").getByRole("link", { name: "Licenses", exact: true }).click();
  await page
    .getByLabel("Student")
    .selectOption({ label: `School Student (${studentUsername})` });
  await page.getByRole("button", { name: "Grant access" }).click();
  await expect(page.getByText("Sponsored access granted.")).toBeVisible();

  await page.getByTestId("school-sidebar-logout").click();

  await page.goto(`/login?device=${device}`);
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Payments", exact: true })).toBeVisible();

  await page.goto(`/student/payments?device=${device}`);
  await expect(page.getByText(/Active grants:\s*1/)).toBeVisible();
});
