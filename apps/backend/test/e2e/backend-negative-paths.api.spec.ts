import { afterEach, describe, expect, it } from "vitest";
import { signRawToken } from "../../core/auth/tokens.mjs";
import { platformLogin, setupTestApp, tenantRegisterAndLogin, TEST_SEED } from "../helpers";

describe("backend api negative paths", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("covers platform auth/project/data error branches", async () => {
    app = await setupTestApp();
    const tenant = await tenantRegisterAndLogin(app, { username: "neg_student_1" });
    const platform = await platformLogin(app);

    const invalidPlatformLogin = await app.inject({
      method: "POST",
      url: "/platform/auth/login",
      payload: { username: "x", password: "short" }
    });
    expect(invalidPlatformLogin.statusCode).toBe(400);

    const wrongPlatformPassword = await app.inject({
      method: "POST",
      url: "/platform/auth/login",
      payload: { username: TEST_SEED.platformAdminUsername, password: "not-correct-password" }
    });
    expect(wrongPlatformPassword.statusCode).toBe(401);

    const refreshMissingToken = await app.inject({ method: "POST", url: "/platform/auth/refresh", payload: {} });
    expect(refreshMissingToken.statusCode).toBe(400);

    const refreshInvalidToken = await app.inject({
      method: "POST",
      url: "/platform/auth/refresh",
      payload: { refreshToken: "not-a-jwt" }
    });
    expect(refreshInvalidToken.statusCode).toBe(401);

    const forbiddenClassRefresh = await app.inject({
      method: "POST",
      url: "/platform/auth/refresh",
      payload: { refreshToken: tenant.refreshToken }
    });
    expect(forbiddenClassRefresh.statusCode).toBe(403);

    const platformLogoutInvalid = await app.inject({ method: "POST", url: "/platform/auth/logout" });
    expect(platformLogoutInvalid.statusCode).toBe(401);

    const platformLogoutForbiddenClass = await app.inject({
      method: "POST",
      url: "/platform/auth/logout",
      headers: { authorization: `Bearer ${tenant.accessToken}` }
    });
    expect(platformLogoutForbiddenClass.statusCode).toBe(403);

    const tenantOnPlatform = await app.inject({
      method: "GET",
      url: "/platform/projects",
      headers: { authorization: `Bearer ${tenant.accessToken}` }
    });
    expect(tenantOnPlatform.statusCode).toBe(403);

    const createProject = await app.inject({
      method: "POST",
      url: "/platform/projects",
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: { key: "dupproj", name: "Dup Project" }
    });
    expect(createProject.statusCode).toBe(201);

    const createProjectDup = await app.inject({
      method: "POST",
      url: "/platform/projects",
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: { key: "dupproj", name: "Dup Project 2" }
    });
    expect(createProjectDup.statusCode).toBe(409);

    const patchMissingProject = await app.inject({
      method: "PATCH",
      url: "/platform/projects/prj_missing",
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: { status: "suspended" }
    });
    expect(patchMissingProject.statusCode).toBe(404);

    const suspendMissingProject = await app.inject({
      method: "POST",
      url: "/platform/projects/prj_missing/suspend",
      headers: { authorization: `Bearer ${platform.accessToken}` }
    });
    expect(suspendMissingProject.statusCode).toBe(404);

    const activateMissingProject = await app.inject({
      method: "POST",
      url: "/platform/projects/prj_missing/activate",
      headers: { authorization: `Bearer ${platform.accessToken}` }
    });
    expect(activateMissingProject.statusCode).toBe(404);

    const exportMissingProject = await app.inject({
      method: "POST",
      url: "/platform/projects/prj_missing/data/export",
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: { reasonCode: "audit", ticketRef: "INC-100" }
    });
    expect(exportMissingProject.statusCode).toBe(404);

    const mutationsMissingProject = await app.inject({
      method: "POST",
      url: "/platform/projects/prj_missing/data/mutations",
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: {
        reasonCode: "audit",
        ticketRef: "INC-101",
        ops: [{ type: "tenant.record.upsert", entityType: "progress", entityId: "p1", data: {} }]
      }
    });
    expect(mutationsMissingProject.statusCode).toBe(404);

    const reindexMissingProject = await app.inject({
      method: "POST",
      url: "/platform/projects/prj_missing/data/reindex",
      headers: { authorization: `Bearer ${platform.accessToken}` },
      payload: { reasonCode: "audit", ticketRef: "INC-102", targets: ["users"] }
    });
    expect(reindexMissingProject.statusCode).toBe(404);

    const getMissingJob = await app.inject({
      method: "GET",
      url: "/platform/jobs/job_missing",
      headers: { authorization: `Bearer ${platform.accessToken}` }
    });
    expect(getMissingJob.statusCode).toBe(404);

    const tenantGetPlatformJob = await app.inject({
      method: "GET",
      url: "/platform/jobs/job_missing",
      headers: { authorization: `Bearer ${tenant.accessToken}` }
    });
    expect(tenantGetPlatformJob.statusCode).toBe(403);
  });

  it("covers tenant auth/sync error branches and runtime not-found", async () => {
    app = await setupTestApp();
    const platform = await platformLogin(app);

    const registerUnavailableProject = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        projectKey: "unknown_project",
        username: "no_project_user",
        password: "student12345",
        displayName: "No Project"
      }
    });
    expect(registerUnavailableProject.statusCode).toBe(404);

    const registered = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        projectKey: TEST_SEED.projectKey,
        username: "neg_student_2",
        password: "student12345",
        displayName: "Neg Student"
      }
    });
    expect(registered.statusCode).toBe(201);

    const duplicateRegister = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        projectKey: TEST_SEED.projectKey,
        username: "neg_student_2",
        password: "student12345",
        displayName: "Neg Student"
      }
    });
    expect(duplicateRegister.statusCode).toBe(409);

    const wrongPassword = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        projectKey: TEST_SEED.projectKey,
        username: "neg_student_2",
        password: "bad-password",
        deviceId: "device_a"
      }
    });
    expect(wrongPassword.statusCode).toBe(401);

    const unknownUser = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        projectKey: TEST_SEED.projectKey,
        username: "missing_user",
        password: "student12345",
        deviceId: "device_a"
      }
    });
    expect(unknownUser.statusCode).toBe(401);

    const tenant = await tenantRegisterAndLogin(app, { username: "neg_student_3" });

    const tenantRefreshMissing = await app.inject({ method: "POST", url: "/auth/refresh", payload: {} });
    expect(tenantRefreshMissing.statusCode).toBe(400);

    const tenantRefreshInvalid = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: "invalid" }
    });
    expect(tenantRefreshInvalid.statusCode).toBe(401);

    const tenantRefreshForbiddenClass = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      payload: { refreshToken: platform.refreshToken }
    });
    expect(tenantRefreshForbiddenClass.statusCode).toBe(403);

    const tenantLogoutInvalid = await app.inject({ method: "POST", url: "/auth/logout" });
    expect(tenantLogoutInvalid.statusCode).toBe(401);

    const tenantLogoutForbiddenClass = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { authorization: `Bearer ${platform.accessToken}` }
    });
    expect(tenantLogoutForbiddenClass.statusCode).toBe(403);

    const offlineEnrollInvalid = await app.inject({ method: "POST", url: "/auth/offline/enroll" });
    expect(offlineEnrollInvalid.statusCode).toBe(401);

    const offlineEnrollForbiddenClass = await app.inject({
      method: "POST",
      url: "/auth/offline/enroll",
      headers: { authorization: `Bearer ${platform.accessToken}` }
    });
    expect(offlineEnrollForbiddenClass.statusCode).toBe(403);

    const meInvalid = await app.inject({ method: "GET", url: "/auth/me" });
    expect(meInvalid.statusCode).toBe(401);

    const project = await app.store.getProjectByKey(TEST_SEED.projectKey);
    expect(project).not.toBeNull();

    const missingUserToken = await signRawToken(
      {
        sub: "usr_missing",
        sid: "tsess_missing",
        projectId: project!.id,
        projectKey: project!.key,
        role: "student",
        username: "ghost",
        tokenClass: "tenant_access"
      },
      "15m"
    );

    const meMissingUser = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: `Bearer ${missingUserToken}` }
    });
    expect(meMissingUser.statusCode).toBe(404);

    const pushForbidden = await app.inject({ method: "POST", url: "/sync/push", payload: {} });
    expect(pushForbidden.statusCode).toBe(403);

    const pushValidation = await app.inject({
      method: "POST",
      url: "/sync/push",
      headers: { authorization: `Bearer ${tenant.accessToken}` },
      payload: { deviceId: "x", batchId: "y", events: [] }
    });
    expect(pushValidation.statusCode).toBe(400);

    const pullForbidden = await app.inject({ method: "POST", url: "/sync/pull", payload: {} });
    expect(pullForbidden.statusCode).toBe(403);

    const pullValidation = await app.inject({
      method: "POST",
      url: "/sync/pull",
      headers: { authorization: `Bearer ${tenant.accessToken}` },
      payload: { deviceId: "x" }
    });
    expect(pullValidation.statusCode).toBe(400);

    const needForbidden = await app.inject({ method: "POST", url: "/sync/blobs/need", payload: {} });
    expect(needForbidden.statusCode).toBe(403);

    const needValidation = await app.inject({
      method: "POST",
      url: "/sync/blobs/need",
      headers: { authorization: `Bearer ${tenant.accessToken}` },
      payload: { cids: [123] }
    });
    expect(needValidation.statusCode).toBe(400);

    const blobForbidden = await app.inject({ method: "GET", url: "/sync/blob/cid_missing" });
    expect(blobForbidden.statusCode).toBe(403);

    const blobMissing = await app.inject({
      method: "GET",
      url: "/sync/blob/cid_missing",
      headers: { authorization: `Bearer ${tenant.accessToken}` }
    });
    expect(blobMissing.statusCode).toBe(404);

    const notFound = await app.inject({ method: "GET", url: "/not/a/real/route" });
    expect(notFound.statusCode).toBe(404);
    expect((notFound.json() as { code: string }).code).toBe("NOT_FOUND");
  });
});
