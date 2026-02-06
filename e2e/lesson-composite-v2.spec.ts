import path from "node:path";
import { test, expect } from "@playwright/test";

test("Lesson creator v2: composite blocks + inline quiz gate + PDF pages", async ({ page }) => {
  const title = `Composite V2 ${Date.now()}`;
  const studentUsername = `composite_student_${Date.now()}`;
  const imageFile = path.resolve(process.cwd(), "public/icons/icon-192.svg");
  const pdfFile = path.resolve(process.cwd(), "SomaSmart_250704_165712.pdf");

  await page.goto("/login");
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Upload Lesson", exact: true })).toBeVisible();

  await page.goto("/teacher/lessons/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Level").selectOption({ label: "Primary" });
  await page.getByLabel("Class").selectOption({ label: "Class 1" });
  await page.getByLabel("Subject").selectOption({ label: "ICT" });
  await page.getByLabel("Access").selectOption({ label: "Free" });
  await page.getByLabel("Tags (comma separated)").fill("trial");
  await page.getByLabel("Description").fill("Composite lesson with gate and pdf.");
  await page.getByRole("button", { name: "Next" }).click();

  // Block 1: text + image
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.locator("textarea[aria-label^='Text block']").first().fill("Composite intro text");
  await page.locator("label:has-text('Upload Media') input[type='file']").setInputFiles(imageFile);

  // Block 2: upload + quiz gate
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByRole("button", { name: "Remove component" }).first().click();
  await page.locator("label:has-text('Upload Media') input[type='file']").setInputFiles(imageFile);
  await page.getByRole("checkbox", { name: "Require quiz to continue" }).check();
  await page.getByRole("button", { name: "Add question" }).click();
  await page.getByLabel("Prompt").fill("What is 2 + 2?");
  await page.getByLabel("Option 1").fill("3");
  await page.getByLabel("Option 2").fill("4");
  await page.getByLabel("Option 3").fill("5");
  await page.getByLabel("Option 4").fill("6");
  await page.getByLabel("Correct option").selectOption("1");
  await page.getByLabel("Explanation").fill("2 + 2 is 4.");

  // Block 3: PDF-only
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByRole("button", { name: "Remove component" }).first().click();
  await page.locator("label:has-text('Upload Media') input[type='file']").setInputFiles(pdfFile);
  await expect(page.getByText("PDF pages:")).toBeVisible();

  // Submit
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /4\. Submit/ }).click();
  await page.getByRole("button", { name: "Submit for approval" }).first().click();
  await expect(page).toHaveURL(/\/teacher\/lessons/);
  await expect(page.getByRole("table").getByText(title)).toBeVisible();

  // Admin approves
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto("/login");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await page.getByRole("link", { name: "Lessons", exact: true }).click();
  await page.getByText(title).first().click();
  await page.getByRole("button", { name: "Approve" }).click();

  // Student consumes: gate blocks Next until pass, then PDF moves page-by-page.
  await page.getByRole("button", { name: "Logout" }).click();
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Composite Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).not.toHaveURL(/\/register$/);
  if (/\/login$/.test(page.url())) {
    await page.getByLabel("Username").fill(studentUsername);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Login" }).click();
  }
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

  await page.goto("/student/lessons");
  await expect(page.getByText(title).first()).toBeVisible();
  await page.getByText(title).first().click();

  await page.getByRole("button", { name: "Next" }).click(); // leave block 1

  const nextBtn = page.getByRole("button", { name: "Next" });
  await expect(nextBtn).toBeDisabled();
  await page.getByRole("radio", { name: /^4$/ }).check();
  await page.getByRole("button", { name: "Submit Quiz" }).click();
  await expect(nextBtn).toBeEnabled();
  await nextBtn.click(); // leave gated block

  await expect(page.getByText(/Page 1/i)).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/Page 2/i)).toBeVisible();
});
