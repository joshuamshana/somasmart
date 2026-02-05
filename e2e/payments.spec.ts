import { test, expect } from "@playwright/test";

test("Payments: student mobile money pending -> admin verifies -> student pulls unlock", async ({ page }) => {
  const studentUsername = `pay_student_${Date.now()}`;
  const server = `srv_pay_${Date.now()}`;

  // Device A: student records a mobile money payment and pushes it
  await page.goto(`/register?device=studPayA&server=${server}`);
  await page.getByLabel("Full name").fill("Pay Student");
  await page.getByLabel("Username").fill(studentUsername);
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("Role").selectOption("student");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Payments", exact: true })).toBeVisible();

  await page.goto(`/student/payments?device=studPayA&server=${server}`);
  await page.getByLabel("Transaction reference").fill("TX123");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/pending verification/i)).toBeVisible();

  await page.goto(`/sync?device=studPayA&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  // Device B: admin pulls payment and verifies it
  await page.goto(`/login?device=adminPayB&server=${server}`);
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("admin123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("link", { name: "Payments", exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/sync?device=adminPayB&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  await page.goto(`/admin/payments?device=adminPayB&server=${server}`);
  await page.getByText("Ref: TX123").first().click();
  await page.getByRole("button", { name: "Verify" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText("Payment verified and access granted.")).toBeVisible();

  await page.goto(`/sync?device=adminPayB&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  // Device A: student pulls verified payment + license grant
  await page.goto(`/sync?device=studPayA&server=${server}`);
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-last-sync")).not.toContainText("Never");
  await expect(page.getByTestId("sync-failed")).toContainText("0");

  await page.goto(`/student/payments?device=studPayA&server=${server}`);
  await expect(page.getByText(/Active grants:\s*1/)).toBeVisible();
});
