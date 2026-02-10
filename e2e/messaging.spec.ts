import { test, expect } from "@playwright/test";
import { fillStudentRegisterKyc } from "./helpers/kyc";

test("Optional: offline messaging student <-> teacher", async ({ page }) => {
  const studentUsername = `msg_student_${Date.now()}`;

  await page.goto("/register");
  await page.getByLabel("Full name").fill("Messaging Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("School code (optional)").fill("SOMA001");
  await fillStudentRegisterKyc(page);
  await page.getByRole("button", { name: "Register" }).click();

  await page.getByRole("link", { name: "Support", exact: true }).click();
  await page.getByLabel("Teacher").selectOption({ label: "Teacher One (teacher1)" });
  await page.getByPlaceholder("Type a message…").fill("Hello teacher");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Hello teacher")).toBeVisible();

  await page.getByRole("button", { name: "Logout" }).click();

  await page.goto("/login");
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "Support inbox", exact: true }).click();
  await page.getByLabel("Student").selectOption({ label: `Messaging Student (${studentUsername})` });
  await expect(page.getByText("Hello teacher")).toBeVisible();
});
