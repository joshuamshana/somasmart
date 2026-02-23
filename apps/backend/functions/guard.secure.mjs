import { getTraceId } from '../core/httpResponse.mjs';
import { loadRuntimeConfig } from '../core/config/runtimeConfig.mjs';

const DEFAULT_CORS = 'http://localhost:3000,http://localhost:4000,http://localhost:5173,http://localhost:4173';

function getAllowedOrigins() {
  return (process.env.CORS_ORIGINS || DEFAULT_CORS)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const secure = {
  path: '/',
  onGuard: (req, res, next) => {
    const config = loadRuntimeConfig();
    const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : null;
    const allowed = getAllowedOrigins();
    const forwardedProto = typeof req.headers?.['x-forwarded-proto'] === 'string' ? req.headers['x-forwarded-proto'] : '';
    const isHttps = String(forwardedProto).toLowerCase() === 'https' || Boolean(req.connection?.encrypted);

    if (config.nodeEnv === 'production' && config.requireHttps && !isHttps) {
      return res.status(403).json({ code: 'HTTPS_REQUIRED' });
    }

    if (origin && (allowed.includes('*') || allowed.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-trace-id');
    res.setHeader('Access-Control-Max-Age', '600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    if (isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    const traceId = getTraceId(req);
    res.setHeader('x-trace-id', traceId);

    if (String(req.method || '').toUpperCase() === 'OPTIONS') {
      return res.status(204).end();
    }

    return next();
  }
};
