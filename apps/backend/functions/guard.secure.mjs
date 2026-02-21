import { getTraceId } from '../core/httpResponse.mjs';

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
    const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : null;
    const allowed = getAllowedOrigins();

    if (origin && (allowed.includes('*') || allowed.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-trace-id');
    res.setHeader('Access-Control-Max-Age', '600');

    const traceId = getTraceId(req);
    res.setHeader('x-trace-id', traceId);

    if (String(req.method || '').toUpperCase() === 'OPTIONS') {
      return res.status(204).end();
    }

    return next();
  }
};
