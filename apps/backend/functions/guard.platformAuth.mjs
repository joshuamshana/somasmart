import { expectPlatformAccess } from '../core/auth/claims.mjs';
import { verifyBearerFromHeaders } from '../core/auth/jwt.mjs';
import { getRequestPath, normalizePath } from '../core/httpResponse.mjs';

const PLATFORM_PUBLIC = new Set(['/platform/auth/login', '/platform/auth/refresh']);

function sendFailure(path, res, code) {
  if (path.startsWith('/platform/projects') || path.startsWith('/platform/jobs')) {
    return res.status(403).json({ code: 'FORBIDDEN_PLATFORM_ONLY' });
  }

  if (code === 'FORBIDDEN_TOKEN_CLASS') {
    return res.status(403).json({ code });
  }

  return res.status(401).json({ code: 'AUTH_INVALID' });
}

export const platformAuth = {
  path: '/platform',
  onGuard: async (req, res, next) => {
    const path = normalizePath(getRequestPath(req));
    if (!path.startsWith('/platform/')) return next();
    if (PLATFORM_PUBLIC.has(path)) return next();

    try {
      const payload = await verifyBearerFromHeaders(req.headers || {});
      expectPlatformAccess(payload);
      return next();
    } catch (error) {
      const code = error instanceof Error && error.message.includes('INVALID_TOKEN_CLASS')
        ? 'FORBIDDEN_TOKEN_CLASS'
        : 'AUTH_INVALID';
      return sendFailure(path, res, code);
    }
  }
};
