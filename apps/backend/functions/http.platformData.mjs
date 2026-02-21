import { invokeRoute } from '../core/runtime.mjs';

export const platformDataExport = {
  path: '/platform/projects/:projectId/data/export',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/platform/projects/:projectId/data/export', req, res)
};

export const platformDataMutations = {
  path: '/platform/projects/:projectId/data/mutations',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/platform/projects/:projectId/data/mutations', req, res)
};

export const platformDataReindex = {
  path: '/platform/projects/:projectId/data/reindex',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/platform/projects/:projectId/data/reindex', req, res)
};

export const platformJobById = {
  path: '/platform/jobs/:jobId',
  method: 'get',
  onRequest: (req, res) => invokeRoute('get', '/platform/jobs/:jobId', req, res)
};
