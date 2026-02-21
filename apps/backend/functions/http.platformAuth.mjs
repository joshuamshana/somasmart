import { invokeRoute } from '../core/runtime.mjs';

export const platformAuthLogin = {
  path: '/platform/auth/login',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/platform/auth/login', req, res)
};

export const platformAuthRefresh = {
  path: '/platform/auth/refresh',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/platform/auth/refresh', req, res)
};

export const platformAuthLogout = {
  path: '/platform/auth/logout',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/platform/auth/logout', req, res)
};
