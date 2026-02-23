import { describe, expect, it } from "vitest";
import { registerPlatformProjectRoutes } from "../core/services/platformProjects.mjs";

type RegisteredRoute = {
  method: "post" | "get" | "patch";
  path: string;
  handler: (request: any, reply: any) => Promise<any>;
};

function createReplyCollector() {
  const state: { statusCode: number; body?: unknown } = { statusCode: 200 };
  return {
    state,
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    send(payload?: unknown) {
      state.body = payload;
      return this;
    }
  };
}

async function setupRoutesWithStore(store: Record<string, any>) {
  const routes: RegisteredRoute[] = [];
  const app = {
    store,
    post(path: string, handler: RegisteredRoute["handler"]) {
      routes.push({ method: "post", path, handler });
    },
    get(path: string, handler: RegisteredRoute["handler"]) {
      routes.push({ method: "get", path, handler });
    },
    patch(path: string, handler: RegisteredRoute["handler"]) {
      routes.push({ method: "patch", path, handler });
    }
  };

  await registerPlatformProjectRoutes(app as never);

  return {
    handler(method: RegisteredRoute["method"], path: string) {
      const match = routes.find((r) => r.method === method && r.path === path);
      if (!match) throw new Error(`route not found: ${method} ${path}`);
      return match.handler;
    }
  };
}

function platformReq(overrides?: Record<string, unknown>) {
  return {
    body: {},
    headers: { "x-trace-id": "trace_projects_unit" },
    params: {},
    async jwtVerify() {
      return { tokenClass: "platform_access", sub: "padm_1" };
    },
    ...overrides
  };
}

describe("platformProjects route branches", () => {
  it("returns PROJECT_ID_REQUIRED for patch/suspend/activate when param is missing", async () => {
    const routes = await setupRoutesWithStore({
      listProjects: async () => [],
      createProject: async () => ({}),
      appendPlatformAudit: async () => ({})
    });

    const patchReply = createReplyCollector();
    await routes.handler("patch", "/platform/projects/:projectId")(platformReq({ params: {} }), patchReply);
    expect(patchReply.state.statusCode).toBe(400);
    expect(patchReply.state.body).toEqual({ code: "PROJECT_ID_REQUIRED" });

    const suspendReply = createReplyCollector();
    await routes.handler("post", "/platform/projects/:projectId/suspend")(platformReq({ params: {} }), suspendReply);
    expect(suspendReply.state.statusCode).toBe(400);
    expect(suspendReply.state.body).toEqual({ code: "PROJECT_ID_REQUIRED" });

    const activateReply = createReplyCollector();
    await routes.handler("post", "/platform/projects/:projectId/activate")(platformReq({ params: {} }), activateReply);
    expect(activateReply.state.statusCode).toBe(400);
    expect(activateReply.state.body).toEqual({ code: "PROJECT_ID_REQUIRED" });
  });

  it("returns 404 when before exists but update returns null", async () => {
    const store = {
      getProjectById: async () => ({ id: "prj_1", key: "k", name: "n", status: "active" }),
      updateProject: async () => null,
      appendPlatformAudit: async () => ({})
    };

    const routes = await setupRoutesWithStore(store);

    const patchReply = createReplyCollector();
    await routes.handler("patch", "/platform/projects/:projectId")(
      platformReq({ params: { projectId: "prj_1" }, body: { status: "suspended" } }),
      patchReply
    );
    expect(patchReply.state.statusCode).toBe(404);
    expect(patchReply.state.body).toEqual({ code: "PROJECT_NOT_FOUND" });

    const suspendReply = createReplyCollector();
    await routes.handler("post", "/platform/projects/:projectId/suspend")(
      platformReq({ params: { projectId: "prj_1" } }),
      suspendReply
    );
    expect(suspendReply.state.statusCode).toBe(404);
    expect(suspendReply.state.body).toEqual({ code: "PROJECT_NOT_FOUND" });

    const activateReply = createReplyCollector();
    await routes.handler("post", "/platform/projects/:projectId/activate")(
      platformReq({ params: { projectId: "prj_1" } }),
      activateReply
    );
    expect(activateReply.state.statusCode).toBe(404);
    expect(activateReply.state.body).toEqual({ code: "PROJECT_NOT_FOUND" });
  });

  it("returns 400 on invalid patch payload and propagates unexpected create errors", async () => {
    const routes = await setupRoutesWithStore({
      getProjectById: async () => ({ id: "prj_1", key: "k", name: "n", status: "active" }),
      updateProject: async () => ({ id: "prj_1", key: "k", name: "n", status: "active" }),
      appendPlatformAudit: async () => ({}),
      createProject: async () => {
        throw new Error("DB_OFFLINE");
      }
    });

    const patchReply = createReplyCollector();
    await routes.handler("patch", "/platform/projects/:projectId")(
      platformReq({ params: { projectId: "prj_1" }, body: {} }),
      patchReply
    );
    expect(patchReply.state.statusCode).toBe(400);
    expect((patchReply.state.body as { code?: string }).code).toBe("VALIDATION_FAILED");

    const createReply = createReplyCollector();
    await expect(
      routes.handler("post", "/platform/projects")(
        platformReq({ body: { key: "newkey", name: "New Name" } }),
        createReply
      )
    ).rejects.toThrow("DB_OFFLINE");
  });
});
