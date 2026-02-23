const DEFAULT_MAX_JSON_BODY_BYTES = 1024 * 1024;

function parsePositiveInt(value, fallback) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error("MAX_JSON_BODY_BYTES must be a positive integer.");
  }
  return Math.floor(parsed);
}

function parseBoolean(value, fallback = false) {
  if (value == null || value === "") return fallback;
  const lowered = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(lowered)) return true;
  if (["0", "false", "no", "off"].includes(lowered)) return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

export function loadRuntimeConfig(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || "development").trim().toLowerCase();
  const dataStore = String(env.DATA_STORE || "knex").trim().toLowerCase();
  const maxJsonBodyBytes = parsePositiveInt(env.MAX_JSON_BODY_BYTES, DEFAULT_MAX_JSON_BODY_BYTES);
  const requireHttps = parseBoolean(env.REQUIRE_HTTPS, nodeEnv === "production");

  if (!["development", "test", "staging", "production"].includes(nodeEnv)) {
    throw new Error(`Unsupported NODE_ENV: ${nodeEnv}`);
  }

  if (!["memory", "knex", "prisma"].includes(dataStore)) {
    throw new Error(`Unsupported DATA_STORE: ${dataStore}`);
  }

  const jwtSecret = String(env.JWT_SECRET || "").trim();
  if (nodeEnv === "production") {
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is required in production.");
    }
    if (jwtSecret.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production.");
    }
  }

  if (nodeEnv === "production" && dataStore === "memory") {
    throw new Error("DATA_STORE=memory is not allowed in production.");
  }

  return {
    nodeEnv,
    dataStore,
    maxJsonBodyBytes,
    requireHttps
  };
}
