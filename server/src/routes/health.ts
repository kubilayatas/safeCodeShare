import { Router } from 'express';

export function healthRouter(version: string): Router {
  const router = Router();
  router.get('/health', (_req, res) => {
    res.json({ ok: true, version });
  });
  return router;
}