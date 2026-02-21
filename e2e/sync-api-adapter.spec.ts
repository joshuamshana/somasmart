import { test, expect, type Route } from "@playwright/test";

test("Sync API mode sends push/pull requests to backend endpoints", async ({ page }) => {
  const deviceId = `api_sync_${Date.now()}`;
  const customPushBodies: Array<Record<string, unknown>> = [];
  const customPullBodies: Array<Record<string, unknown>> = [];
  const defaultPushBodies: Array<Record<string, unknown>> = [];
  const defaultPullBodies: Array<Record<string, unknown>> = [];
  const authHeaders: string[] = [];
  const loginResponse = {
    accessToken: "auth_access_token",
    refreshToken: "auth_refresh_token"
  };
  const meResponse = {
    id: "user_teacher_e2e",
    projectId: "project_somasmart",
    projectKey: "somasmart",
    username: "teacher1",
    displayName: "Teacher One",
    role: "teacher",
    status: "active"
  };

  async function fulfillPush(route: Route) {
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    const accepted = Array.isArray(body.events)
      ? (body.events as Array<{ eventId?: string }>).map((evt) => evt.eventId).filter(Boolean)
      : [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        replayed: false,
        accepted,
        rejected: [],
        serverWatermark: 11
      })
    });
  }

  await page.route((url) => url.pathname.endsWith("/customapi/sync/push"), async (route) => {
    authHeaders.push(route.request().headers().authorization ?? "");
    customPushBodies.push((route.request().postDataJSON() ?? {}) as Record<string, unknown>);
    await fulfillPush(route);
  });
  await page.route((url) => url.pathname.endsWith("/customapi/sync/pull"), async (route) => {
    authHeaders.push(route.request().headers().authorization ?? "");
    customPullBodies.push((route.request().postDataJSON() ?? {}) as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scope: "default",
        changes: [],
        nextCheckpoints: { default: 12 }
      })
    });
  });
  await page.route((url) => url.pathname.endsWith("/sync/push") && !url.pathname.includes("/customapi/"), async (route) => {
    authHeaders.push(route.request().headers().authorization ?? "");
    defaultPushBodies.push((route.request().postDataJSON() ?? {}) as Record<string, unknown>);
    await fulfillPush(route);
  });
  await page.route((url) => url.pathname.endsWith("/sync/pull") && !url.pathname.includes("/customapi/"), async (route) => {
    authHeaders.push(route.request().headers().authorization ?? "");
    defaultPullBodies.push((route.request().postDataJSON() ?? {}) as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scope: "default",
        changes: [],
        nextCheckpoints: { default: 20 }
      })
    });
  });
  await page.route((url) => url.pathname.endsWith("/customapi/auth/login"), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(loginResponse)
    });
  });
  await page.route((url) => url.pathname.endsWith("/customapi/auth/me"), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(meResponse)
    });
  });
  await page.route((url) => url.pathname.endsWith("/auth/login") && !url.pathname.includes("/customapi/"), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(loginResponse)
    });
  });
  await page.route((url) => url.pathname.endsWith("/auth/me") && !url.pathname.includes("/customapi/"), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(meResponse)
    });
  });

  async function enqueueSettingsPushOutboxEvent() {
    await page.evaluate(async (id) => {
      const dbName = `somasmart_${id}`;
      await new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open(dbName);
        openRequest.onerror = () => reject(openRequest.error ?? new Error("indexeddb open failed"));
        openRequest.onsuccess = () => {
          const db = openRequest.result;
          const tx = db.transaction("outboxEvents", "readwrite");
          tx.objectStore("outboxEvents").put({
            id: `evt_settings_push_${Date.now()}`,
            type: "settings_push",
            payload: {},
            createdAt: new Date().toISOString(),
            syncStatus: "queued"
          });
          tx.onerror = () => reject(tx.error ?? new Error("indexeddb write failed"));
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      });
    }, deviceId);
  }

  await page.goto(`/connection-settings?device=${deviceId}`);
  await page.getByLabel("Backend URL").fill("http://localhost:4000/customapi");
  await page.getByLabel("Project key").fill("somasmart");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Connection settings saved.")).toBeVisible();

  await page.goto(`/login?device=${deviceId}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Teacher dashboard" })).toBeVisible({ timeout: 30_000 });

  await enqueueSettingsPushOutboxEvent();

  await page.goto(`/sync?device=${deviceId}`);
  await expect(page.getByText("Sync adapter: api")).toBeVisible();
  await expect(page.getByText("Endpoint:")).toContainText("http://localhost:4000/customapi");
  await page.getByRole("button", { name: "Sync now" }).click();
  await expect(page.getByTestId("sync-status")).toHaveAttribute("data-status", "idle");

  await expect.poll(() => customPushBodies.length).toBeGreaterThan(0);
  await expect.poll(() => customPullBodies.length).toBeGreaterThan(0);
  expect(defaultPushBodies).toHaveLength(0);
  expect(defaultPullBodies).toHaveLength(0);

  const push = customPushBodies[0];
  const pull = customPullBodies[0];
  expect(push.deviceId).toBe(deviceId);
  expect(Array.isArray(push.events)).toBe(true);
  expect((push.events as unknown[]).length).toBeGreaterThan(0);
  expect(pull.deviceId).toBe(deviceId);
  expect((pull.checkpoints as Record<string, number>).default).toBe(0);
  expect(authHeaders.some((value) => value === "Bearer auth_access_token")).toBe(true);

  await page.getByTestId("teacher-sidebar-logout").click();
  await expect(page.getByLabel("Username")).toBeVisible();
  await page.goto(`/connection-settings?device=${deviceId}`);
  await page.getByRole("button", { name: "Reset to defaults" }).click();
  await expect(page.getByText("Connection settings reset to defaults.")).toBeVisible();

  await page.goto(`/login?device=${deviceId}`);
  await page.getByLabel("Username").fill("teacher1");
  await page.getByLabel("Password").fill("teacher123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Teacher dashboard" })).toBeVisible({ timeout: 30_000 });

  await enqueueSettingsPushOutboxEvent();
  await page.goto(`/sync?device=${deviceId}`);
  await expect(page.getByText("Endpoint:")).toContainText("http://localhost:4000");
  await page.getByRole("button", { name: "Sync now" }).click();
});
