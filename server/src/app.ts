// Express uygulamasının tamamı burada kurulur. index.ts (gerçek sunucu) ve testler
// AYNI kurulumu kullanır; böylece testler gerçek yönlendirmeyi doğrular.
import path from 'node:path';
import fs from 'node:fs';
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { AppConfig } from './config';
import type { DB } from './db';
import { loadUserFromSession } from './auth/middleware';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { coursesRouter } from './routes/courses';
import { topicsRouter } from './routes/topics';
import { padsRouter } from './routes/pads';
import { versionsRouter } from './routes/versions';
import { publicRouter } from './routes/public';
import { formatRouter } from './routes/format';
import { healthRouter } from './routes/health';
import { billingRouter, billingWebhookHandler } from './routes/billing';
import { errorHandler, HttpError, sendError } from './util/errors';
import { getEntitlements } from './account/entitlements';

export const VERSION = '3.1.0';

export function createApp(db: DB, cfg: AppConfig): Express {
  const app = express();
  app.set('trust proxy', 1);

  // /embed/* için CSP frame-ancestors *, diğer her yerde 'self'.
  // Gömme (iframe) yalnızca planında bu özellik olan kullanıcıların paylaşımlarında
  // başka sitelere açılır. Aksi halde tarayıcı iframe'i yüklemeyi reddeder.
  const embedAllowed = (viewToken: string): boolean => {
    const row = db.prepare('SELECT owner_id FROM pads WHERE view_token = ?').get(viewToken) as
      | { owner_id: string }
      | undefined;
    if (!row) return false;
    try {
      const ent = getEntitlements(db, row.owner_id);
      return ent.unlimited || ent.limits.embed;
    } catch {
      return false;
    }
  };

  app.use((req, res, next) => {
    const isEmbed = req.path.startsWith('/embed/') && embedAllowed(req.path.slice('/embed/'.length));
    helmet({
      contentSecurityPolicy: cfg.isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              connectSrc: [
                "'self'",
                'wss:',
                'ws:',
                'https://*.googlesyndication.com',
                'https://*.doubleclick.net',
                'https://pagead2.googlesyndication.com'
              ],
              imgSrc: ["'self'", 'data:', 'https://*.googlesyndication.com', 'https://*.doubleclick.net'],
              fontSrc: ["'self'", 'data:'],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                'https://pagead2.googlesyndication.com',
                'https://*.googlesyndication.com',
                'https://adservice.google.com'
              ],
              frameSrc: [
                "'self'",
                'https://googleads.g.doubleclick.net',
                'https://*.google.com',
                'https://*.googlesyndication.com'
              ],
              frameAncestors: isEmbed ? ["*"] : ["'self'"]
            }
          }
        : false,
      frameguard: isEmbed ? false : { action: 'sameorigin' }
    })(req, res, next);
  });

  // Lemon Squeezy webhook'u ham gövdeyle imzalanır; JSON ayrıştırıcıdan önce gelmeli.
  app.post('/api/billing/webhook', ...billingWebhookHandler(db, cfg));

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(loadUserFromSession(db, cfg));

  app.use((req, _res, next) => {
    // CSRF savunması: başka sitedeki bir HTML formu JSON gönderemez. Gövdesiz istekler
    // (çıkış, silme, çoğaltma...) Content-Type göndermeyebilir; onlar serbest. Ama bir
    // Content-Type varsa JSON olmak zorunda (form gönderimleri her zaman başlık taşır).
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      const ct = req.headers['content-type'];
      if (req.path.startsWith('/api') && ct !== undefined && !ct.includes('application/json')) {
        next(new HttpError(415, 'Content-Type application/json olmalı', 'UNSUPPORTED_MEDIA_TYPE'));
        return;
      }
    }
    next();
  });

  app.use('/api', healthRouter(VERSION));
  app.use('/api', publicRouter(db, cfg));
  app.use('/api', formatRouter(db, cfg));
  app.use('/api/auth', authRouter(db, cfg));
  app.use('/api/admin', adminRouter(db, cfg));
  app.use('/api', billingRouter(db, cfg));
  app.use('/api', coursesRouter(db));
  app.use('/api', topicsRouter(db));
  app.use('/api', padsRouter(db));
  app.use('/api', versionsRouter(db));

  app.use('/api', (_req, res) => {
    sendError(res, 404, 'Bulunamadı', 'NOT_FOUND');
  });

  if (cfg.isProd) {
    const candidates = [
      path.resolve(process.cwd(), '..', 'server', 'public'),
      path.resolve(process.cwd(), 'server', 'public'),
      path.resolve(process.cwd(), 'public')
    ];
    const publicDir = candidates.find((p) => fs.existsSync(p));
    if (publicDir) {
      app.use(express.static(publicDir, { index: false }));
      app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api') || req.path.startsWith('/collab')) return next();
        res.sendFile(path.join(publicDir, 'index.html'));
      });
    } else {
      console.warn('[static] istemci çıktı klasörü bulunamadı.');
    }
  }

  app.use(errorHandler);

  return app;
}
