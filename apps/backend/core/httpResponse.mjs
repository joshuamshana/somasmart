import { randomUUID } from 'node:crypto';
import { internalErrorBody } from './errors.mjs';

export function getRequestPath(req) {
  const fromReqPath = typeof req.path === 'string' && req.path ? req.path : null;
  if (fromReqPath) return fromReqPath;

  const raw = typeof req.originalUrl === 'string' ? req.originalUrl : (typeof req.url === 'string' ? req.url : '/');
  const queryIndex = raw.indexOf('?');
  return queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
}

export function normalizePath(path) {
  if (!path) return '/';
  const cleaned = path.replace(/\/+$/, '');
  return cleaned || '/';
}

export function getTraceId(req) {
  const fromHeader = req?.headers?.['x-trace-id'];
  if (typeof fromHeader === 'string' && fromHeader.trim()) return fromHeader.trim();
  return randomUUID();
}

export function sendJson(res, statusCode, body) {
  return res.status(statusCode).json(body);
}

export function sendInternalError(res) {
  return sendJson(res, 500, internalErrorBody());
}

export function toHeaderMap(headers) {
  const result = {};
  if (!headers || typeof headers !== 'object') return result;
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      result[key.toLowerCase()] = value;
      continue;
    }
    if (Array.isArray(value) && value.length > 0) {
      result[key.toLowerCase()] = String(value[0]);
      continue;
    }
    if (value != null) {
      result[key.toLowerCase()] = String(value);
    }
  }
  return result;
}
