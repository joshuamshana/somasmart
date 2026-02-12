import { afterEach, describe, expect, it } from "vitest";
import { setupTestApp, tenantRegisterAndLogin } from "./helpers";

describe("blob project scope", () => {
  let app: Awaited<ReturnType<typeof setupTestApp>> | null = null;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = null;
    }
  });

  it("isolates blob manifests and blob fetches by project", async () => {
    app = await setupTestApp();

    const somaProject = await app.store.getProjectByKey("somasmart");
    const rafikiProject = await app.store.getProjectByKey("rafikiplus");
    expect(somaProject).not.toBeNull();
    expect(rafikiProject).not.toBeNull();

    const cid = "cid_shared_asset_1";
    await app.store.upsertBlobManifest({
      projectId: somaProject!.id,
      cid,
      mime: "application/octet-stream",
      size: 3,
      bytes: Buffer.from([1, 2, 3]),
      createdAt: new Date().toISOString()
    });

    const soma = await tenantRegisterAndLogin(app, { projectKey: "somasmart", username: "blob_soma" });
    const rafiki = await tenantRegisterAndLogin(app, { projectKey: "rafikiplus", username: "blob_rafiki" });

    const somaNeed = await app.inject({
      method: "POST",
      url: "/sync/blobs/need",
      headers: { authorization: `Bearer ${soma.accessToken}` },
      payload: { cids: [cid, "cid_missing"] }
    });
    expect(somaNeed.statusCode).toBe(200);
    expect((somaNeed.json() as { missing: string[] }).missing).toEqual(["cid_missing"]);

    const rafikiNeed = await app.inject({
      method: "POST",
      url: "/sync/blobs/need",
      headers: { authorization: `Bearer ${rafiki.accessToken}` },
      payload: { cids: [cid] }
    });
    expect(rafikiNeed.statusCode).toBe(200);
    expect((rafikiNeed.json() as { missing: string[] }).missing).toEqual([cid]);

    const somaBlob = await app.inject({
      method: "GET",
      url: `/sync/blob/${cid}`,
      headers: { authorization: `Bearer ${soma.accessToken}` }
    });
    expect(somaBlob.statusCode).toBe(200);
    expect(somaBlob.headers["x-blob-cid"]).toBe(cid);

    const rafikiBlob = await app.inject({
      method: "GET",
      url: `/sync/blob/${cid}`,
      headers: { authorization: `Bearer ${rafiki.accessToken}` }
    });
    expect(rafikiBlob.statusCode).toBe(404);
    expect((rafikiBlob.json() as { code: string }).code).toBe("BLOB_NOT_FOUND");
  });
});
