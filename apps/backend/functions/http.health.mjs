export const health = {
  path: '/health',
  method: 'get',
  onRequest: (_req, res) => {
    res.json({ ok: true, service: 'somasmart-backend-functions', now: new Date().toISOString() });
  }
};
