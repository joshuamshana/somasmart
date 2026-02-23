import "./config/loadEnv.mjs";
import { MemoryStore } from './data/memoryStore.mjs';
import { KnexStore } from './data/knexStore.mjs';
import { signJwtToken, verifyBearerFromHeaders, verifyJwtToken } from './auth/jwt.mjs';
import { loadRuntimeConfig } from './config/runtimeConfig.mjs';
import { registerPlatformAuthRoutes } from './services/platformAuth.mjs';
import { registerPlatformProjectRoutes } from './services/platformProjects.mjs';
import { registerPlatformDataRoutes } from './services/platformData.mjs';
import { registerTenantAuthRoutes } from './services/tenantAuth.mjs';
import { registerTenantSyncRoutes } from './services/tenantSync.mjs';
import { getRequestPath, normalizePath, sendInternalError, toHeaderMap } from './httpResponse.mjs';

function splitPath(path) {
  return normalizePath(path).split('/').filter(Boolean);
}

function matchPath(pattern, actualPath) {
  const patternParts = splitPath(pattern);
  const actualParts = splitPath(actualPath);
  if (patternParts.length !== actualParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const patternPart = patternParts[i];
    const actualPart = actualParts[i];
    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(actualPart);
      continue;
    }
    if (patternPart !== actualPart) return null;
  }

  return params;
}

function createReplyAdapter(res) {
  let statusCode = 200;
  let sent = false;

  return {
    get sent() {
      return sent;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    header(name, value) {
      res.setHeader(name, value);
      return this;
    },
    async jwtSign(payload, options) {
      return signJwtToken(payload, options?.expiresIn ?? '15m');
    },
    send(payload) {
      if (sent) return this;
      sent = true;

      res.status(statusCode);
      if (payload === undefined) {
        res.end();
        return this;
      }
      if (Buffer.isBuffer(payload) || payload instanceof Uint8Array) {
        res.send(Buffer.from(payload));
        return this;
      }
      if (typeof payload === 'string') {
        res.send(payload);
        return this;
      }
      res.json(payload);
      return this;
    }
  };
}

function createRuntimeApp(store) {
  const routes = [];

  const app = {
    store,
    jwt: {
      verify: verifyJwtToken
    },
    post(path, handler) {
      routes.push({ method: 'post', path, handler });
    },
    get(path, handler) {
      routes.push({ method: 'get', path, handler });
    },
    patch(path, handler) {
      routes.push({ method: 'patch', path, handler });
    },
    put(path, handler) {
      routes.push({ method: 'put', path, handler });
    },
    delete(path, handler) {
      routes.push({ method: 'delete', path, handler });
    },
    all(path, handler) {
      routes.push({ method: 'all', path, handler });
    },
    routes
  };

  return app;
}

async function buildRuntime() {
  const config = loadRuntimeConfig();
  const store = config.dataStore === 'memory' ? new MemoryStore() : new KnexStore();
  await store.ensureBootstrap();

  const app = createRuntimeApp(store);

  await registerPlatformAuthRoutes(app);
  await registerPlatformProjectRoutes(app);
  await registerPlatformDataRoutes(app);
  await registerTenantAuthRoutes(app);
  await registerTenantSyncRoutes(app);

  if (typeof store.checkReadiness === 'function') {
    const readiness = await store.checkReadiness();
    if (!readiness?.ready) {
      throw new Error(readiness?.message || 'DATA_STORE_UNAVAILABLE');
    }
  }

  return { app, config };
}

let runtimePromise;

async function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = buildRuntime();
  }
  return runtimePromise;
}

export function resetRuntimeForTests() {
  runtimePromise = undefined;
}

export async function getBackendStore() {
  const runtime = await getRuntime();
  return runtime.app.store;
}

export async function checkBackendReadiness() {
  try {
    const runtime = await getRuntime();
    const store = runtime.app.store;
    if (typeof store.checkReadiness === 'function') {
      const readiness = await store.checkReadiness();
      return {
        ok: Boolean(readiness?.ready),
        store: readiness?.store ?? runtime.config.dataStore,
        message: readiness?.message
      };
    }
    return {
      ok: true,
      store: runtime.config.dataStore
    };
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : '';
    const message = rawMessage && rawMessage.trim() ? rawMessage : 'Runtime initialization failed';
    const rawStore = String(process.env.DATA_STORE || 'knex').toLowerCase();
    const normalizedStore = rawStore === 'prisma' ? 'knex' : rawStore;
    return {
      ok: false,
      store: normalizedStore,
      message
    };
  }
}

export async function invokeRoute(method, pattern, req, res) {
  let runtime;
  try {
    runtime = await getRuntime();
  } catch {
    return res.status(503).json({ code: 'SERVICE_UNAVAILABLE' });
  }
  const { app, config } = runtime;
  const methodKey = String(method || req.method || 'all').toLowerCase();
  const requestPath = normalizePath(getRequestPath(req));

  const route = app.routes.find((candidate) => {
    if (candidate.method !== 'all' && candidate.method !== methodKey) return false;
    if (pattern && candidate.path !== pattern) return false;
    return Boolean(matchPath(candidate.path, requestPath));
  });

  if (!route) {
    return res.status(404).json({ code: 'NOT_FOUND' });
  }

  const params = req.params && typeof req.params === 'object' ? req.params : matchPath(route.path, requestPath) || {};
  const headers = toHeaderMap(req.headers);
  let body = req.body;
  if (body != null) {
    try {
      const serialized = JSON.stringify(body);
      if (serialized && Buffer.byteLength(serialized, 'utf8') > config.maxJsonBodyBytes) {
        return res.status(413).json({ code: 'PAYLOAD_TOO_LARGE' });
      }
    } catch {
      body = undefined;
    }
  }
  const request = {
    body,
    params,
    headers,
    method: req.method,
    url: req.url,
    path: requestPath,
    async jwtVerify() {
      return verifyBearerFromHeaders(headers);
    }
  };

  const reply = createReplyAdapter(res);

  try {
    await route.handler(request, reply);
    if (!reply.sent) {
      reply.send();
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    if (!reply.sent) {
      sendInternalError(res);
    }
  }
}
