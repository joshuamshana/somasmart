import { invokeRoute } from '../core/runtime.mjs';

export const syncPush = {
  path: '/sync/push',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/sync/push', req, res)
};

export const syncPull = {
  path: '/sync/pull',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/sync/pull', req, res)
};

export const syncBlobsNeed = {
  path: '/sync/blobs/need',
  method: 'post',
  onRequest: (req, res) => invokeRoute('post', '/sync/blobs/need', req, res)
};

export const syncBlobByCid = {
  path: '/sync/blob/:cid',
  method: 'get',
  onRequest: (req, res) => invokeRoute('get', '/sync/blob/:cid', req, res)
};
