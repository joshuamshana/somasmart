import { expectTenantAccess } from '../core/auth/claims.mjs';
import { verifyBearerFromHeaders } from '../core/auth/jwt.mjs';
import { getRequestPath, normalizePath } from '../core/httpResponse.mjs';

const TENANT_AUTH_PROTECTED = new Set(['/auth/me', '/auth/logout', '/auth/offline/enroll']);

export const tenantAuth = {
  path: '/',
  onGuard: async (req, res, next) => {
    const path = normalizePath(getRequestPath(req));
    const needsTenantToken = path.startsWith('/sync/') || TENANT_AUTH_PROTECTED.has(path);
    if (!needsTenantToken) return next();

    try {
      const payload = await verifyBearerFromHeaders(req.headers || {});
      expectTenantAccess(payload);
      return next();
    } catch (error) {
      if (path.startsWith('/sync/')) {
        return res.status(403).json({ code: 'FORBIDDEN_TENANT_ONLY' });
      }
      const code = error instanceof Error && error.message.includes('INVALID_TOKEN_CLASS')
        ? 'FORBIDDEN_TOKEN_CLASS'
        : 'AUTH_INVALID';
      return res.status(code === 'FORBIDDEN_TOKEN_CLASS' ? 403 : 401).json({ code });
    }
  }
};
