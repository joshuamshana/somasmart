import { invokeRoute } from '../core/runtime.mjs';

export const platformProjectsCreate = {
  path: '/platform/projects',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/platform/projects', req, res)
};

export const platformProjectsList = {
  path: '/platform/projects',
  method: 'get',
  onRequest: (req, res) => invokeRoute('get', '/platform/projects', req, res)
};

export const platformProjectsPatch = {
  path: '/platform/projects/:projectId',
  method: 'patch',
  onRequest: (req, res) => invokeRoute('patch', '/platform/projects/:projectId', req, res)
};

export const platformProjectsSuspend = {
  path: '/platform/projects/:projectId/suspend',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/platform/projects/:projectId/suspend', req, res)
};

export const platformProjectsActivate = {
  path: '/platform/projects/:projectId/activate',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/platform/projects/:projectId/activate', req, res)
};
