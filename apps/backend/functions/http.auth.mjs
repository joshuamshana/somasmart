import { invokeRoute } from '../core/runtime.mjs';

export const authRegister = {
  path: '/auth/register',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/auth/register', req, res)
};

export const authLogin = {
  path: '/auth/login',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/auth/login', req, res)
};

export const authRefresh = {
  path: '/auth/refresh',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/auth/refresh', req, res)
};

export const authLogout = {
  path: '/auth/logout',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/auth/logout', req, res)
};

export const authOfflineEnroll = {
  path: '/auth/offline/enroll',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/auth/offline/enroll', req, res)
};

export const authMe = {
  path: '/auth/me',
  method: 'get',
  onRequest: (req, res) => invokeRoute('get', '/auth/me', req, res)
};
