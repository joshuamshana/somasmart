export function expectTenantAccess(payload) {
  if (payload.tokenClass !== 'tenant_access') {
    throw new Error('INVALID_TOKEN_CLASS_TENANT');
  }
  return payload;
}

export function expectTenantRefresh(payload) {
  if (payload.tokenClass !== 'tenant_refresh') {
    throw new Error('INVALID_TOKEN_CLASS_TENANT_REFRESH');
  }
  return payload;
}

export function expectPlatformAccess(payload) {
  if (payload.tokenClass !== 'platform_access') {
    throw new Error('INVALID_TOKEN_CLASS_PLATFORM');
  }
  return payload;
}

export function expectPlatformRefresh(payload) {
  if (payload.tokenClass !== 'platform_refresh') {
    throw new Error('INVALID_TOKEN_CLASS_PLATFORM_REFRESH');
  }
  return payload;
}
