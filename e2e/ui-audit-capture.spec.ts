import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

type AuditViewport = {
  name: "large" | "medium" | "small";
  width: number;
  height: number;
};

const viewports: AuditViewport[] = [
  { name: "large", width: 1440, height: 900 },
  { name: "medium", width: 1024, height: 768 },
  { name: "small", width: 390, height: 844 }
];

const artifactDir = path.resolve("output/playwright/ui-audit");

async function stabilize(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(80);
}

async function capture(page: Page, testInfo: TestInfo, key: string, viewport: AuditViewport) {
  const fileName = `${key}-${viewport.name}.png`;
  await stabilize(page);
  await expect(page).toHaveScreenshot(fileName, { fullPage: true });
  await page.screenshot({ path: path.join(artifactDir, fileName), fullPage: true });
  await testInfo.attach(fileName, {
    path: path.join(artifactDir, fileName),
    contentType: "image/png"
  });
}

async function login(page: Page, creds: { username: string; password: string }, query: string) {
  await page.goto(`/login?${query}`);
  await page.getByLabel("Username").fill(creds.username);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: "Login" }).click();
}

test.beforeAll(() => {
  mkdirSync(artifactDir, { recursive: true });
});

test("UI audit capture: public views", async ({ page }, testInfo) => {
  for (const viewport of viewports) {
    const device = `audit_public_${viewport.name}`;
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto(`/?device=${device}`);
    await expect(page.getByTestId("public-layout")).toBeVisible({ timeout: 30_000 });
    await capture(page, testInfo, "public-learn", viewport);
    if (viewport.name === "small") {
      await page.locator("summary").first().click();
      await capture(page, testInfo, "public-learn-filters", viewport);
    }

    await page.goto(`/login?device=${device}`);
    await expect(page.getByLabel("Username")).toBeVisible();
    await capture(page, testInfo, "public-login", viewport);
  }
});

test("UI audit capture: student lessons", async ({ page }, testInfo) => {
  for (const viewport of viewports) {
    const device = `audit_student_${viewport.name}`;
    const username = `audit_student_${viewport.name}_${randomUUID().slice(0, 8)}`;
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto(`/register?device=${device}`);
    await page.getByLabel("Full name").fill("Audit Student");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Register" }).click();
    await page.waitForLoadState("networkidle");
    if (page.url().includes("/login")) {
      await login(page, { username, password: "password123" }, `device=${device}`);
    }

    await page.goto(`/student/lessons?device=${device}`);
    await expect(page.getByTestId("student-layout")).toBeVisible();
    await capture(page, testInfo, "student-lessons", viewport);
  }
});

test("UI audit capture: teacher builder", async ({ page }, testInfo) => {
  for (const viewport of viewports) {
    const server = `audit_teacher_server_${viewport.name}`;
    const device = `audit_teacher_${viewport.name}`;
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await login(page, { username: "teacher1", password: "teacher123" }, `device=${device}&server=${server}`);
    await expect(page.getByTestId("teacher-layout")).toBeVisible({ timeout: 30_000 });

    await page.goto(`/teacher/lessons/new?device=${device}&server=${server}`);
    await expect(page.getByRole("heading", { name: /Create lesson/i })).toBeVisible();
    await capture(page, testInfo, "teacher-builder-metadata", viewport);

    await page.getByRole("button", { name: "2. Blocks" }).click();
    await expect(page.getByText("Block editor")).toBeVisible();
    await capture(page, testInfo, "teacher-builder-blocks", viewport);
  }
});

test("UI audit capture: admin lessons", async ({ page }, testInfo) => {
  for (const viewport of viewports) {
    const device = `audit_admin_${viewport.name}`;
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await login(page, { username: "admin", password: "admin123" }, `device=${device}`);
    await expect(page.getByTestId("admin-layout")).toBeVisible({ timeout: 30_000 });

    await page.goto(`/admin/lessons?device=${device}`);
    await expect(page.getByRole("heading", { name: "Lessons" })).toBeVisible();
    await capture(page, testInfo, "admin-lessons", viewport);

    const selectable = page.locator('[data-testid^="lesson-item-"]').first();
    if ((await selectable.count()) > 0) {
      await selectable.click();
      await capture(page, testInfo, "admin-lessons-selected", viewport);
    }
  }
});
