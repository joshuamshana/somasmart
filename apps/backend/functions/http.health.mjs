import { checkBackendReadiness } from "../core/runtime.mjs";

export const health = {
  path: '/health',
  method: "get",
  onRequest: async (_req, res) => {
    const readiness = await checkBackendReadiness();
    const statusCode = readiness.ok ? 200 : 503;
    res.status(statusCode).json({
      ok: readiness.ok,
      service: "somasmart-backend-functions",
      store: readiness.store,
      message: readiness.message,
      now: new Date().toISOString()
    });
  }
};
