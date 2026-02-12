import { createApp } from "../src/app";

export async function setupTestApp() {
  const app = await createApp({ logger: false });
  return app;
}

export async function platformLogin(app: Awaited<ReturnType<typeof createApp>>) {
  const res = await app.inject({
    method: "POST",
    url: "/platform/auth/login",
    payload: {
      username: "platform_admin",
      password: "platform12345"
    }
  });
  if (res.statusCode !== 200) {
    throw new Error(`Platform login failed: ${res.statusCode} ${res.body}`);
  }
  return res.json() as { accessToken: string; refreshToken: string };
}

export async function tenantRegisterAndLogin(
  app: Awaited<ReturnType<typeof createApp>>,
  options?: { projectKey?: string; username?: string; password?: string; displayName?: string }
) {
  const projectKey = options?.projectKey ?? "somasmart";
  const username = options?.username ?? "student1";
  const password = options?.password ?? "student12345";
  const displayName = options?.displayName ?? "Student One";

  const registerRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      projectKey,
      username,
      password,
      displayName,
      role: "student"
    }
  });

  if (![201, 409].includes(registerRes.statusCode)) {
    throw new Error(`Tenant register failed: ${registerRes.statusCode} ${registerRes.body}`);
  }

  const loginRes = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      projectKey,
      username,
      password,
      deviceId: "device_a"
    }
  });

  if (loginRes.statusCode !== 200) {
    throw new Error(`Tenant login failed: ${loginRes.statusCode} ${loginRes.body}`);
  }

  return loginRes.json() as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; projectId: string; projectKey: string; username: string };
  };
}
