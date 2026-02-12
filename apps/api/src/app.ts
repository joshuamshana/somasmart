import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import type { DataStore } from "./data/store";
import { MemoryStore } from "./data/memoryStore";
import { registerPlatformAuthRoutes } from "./routes/platformAuth";
import { registerPlatformProjectRoutes } from "./routes/platformProjects";
import { registerPlatformDataRoutes } from "./routes/platformData";
import { registerTenantAuthRoutes } from "./routes/tenantAuth";
import { registerTenantSyncRoutes } from "./routes/tenantSync";

declare module "fastify" {
  interface FastifyInstance {
    store: DataStore;
  }
}

export async function createApp({ store, logger = true }: { store?: DataStore; logger?: boolean } = {}) {
  const app = Fastify({ logger });

  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET ?? "dev-only-jwt-secret-change-me"
  });

  const selectedStore = store ?? new MemoryStore();
  await selectedStore.ensureBootstrap();
  app.decorate("store", selectedStore);

  app.get("/health", async () => ({ ok: true, service: "somasmart-blackbox-api", now: new Date().toISOString() }));

  await registerPlatformAuthRoutes(app);
  await registerPlatformProjectRoutes(app);
  await registerPlatformDataRoutes(app);
  await registerTenantAuthRoutes(app);
  await registerTenantSyncRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if (reply.sent) return;
    reply.status(500).send({ code: "INTERNAL_ERROR", message: "Unexpected server error." });
  });

  return app;
}
