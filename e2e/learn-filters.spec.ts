import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

function visibleSelectByLabel(page: Page, label: string) {
  return page.locator("label:visible", { hasText: label }).locator("..").locator("select");
}

test("Learn landing filters: level → class → subject cascade and filters lessons (public)", async ({ page }) => {
  const device = `learnFilters_${Date.now()}`;
  await page.goto(`/?device=${device}`);

  await expect(page.getByText("Learn (Public)")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Introduction to Numbers")).toBeVisible();

  const level = visibleSelectByLabel(page, "Level");
  const klass = visibleSelectByLabel(page, "Class");
  const subject = visibleSelectByLabel(page, "Subject");

  await expect(klass).toBeDisabled();
  await expect(subject).toBeDisabled();

  await level.selectOption({ label: "Primary" });
  await expect(klass).toBeEnabled();

  await klass.selectOption({ label: "Class 1" });
  await expect(subject).toBeEnabled();

  await subject.selectOption({ label: "ICT" });
  await expect(page.getByText("No lessons found.")).toBeVisible();

  await subject.selectOption({ label: "Math" });
  await expect(page.getByText("Introduction to Numbers")).toBeVisible();
});
