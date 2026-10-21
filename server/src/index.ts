import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { loadConfig } from './config';
import { openDatabase } from './db';
import { hashPassword } from './auth/passwords';
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
import { errorHandler, HttpError } from './util/errors';
import { randomId } from './util/tokens';
import { cleanupExpiredSessions } from './auth/sessions';
import { startCleanupJob } from './jobs/cleanup';
import { startBackupJob } from './jobs/backup';
import { buildCollabServer, attachCollabToHttp } from './collab/hocuspocus';
import { startHubTicker, stopHubTicker } from './protect/hub';

const VERSION = '1.0.0';

async function seedAdminIfEmpty(
  db: ReturnType<typeof openDatabase>,
  cfg: ReturnType<typeof loadConfig>
): Promise<void> {
  const row = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  if (row.n > 0) return;

  if (!cfg.ADMIN_EMAIL || !cfg.ADMIN_PASSWORD || !cfg.ADMIN_NAME) {
    throw new Error(
      'Kullanıcı tablosu boş ve ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME tanımlı değil. ' +
        'İlk açılış için bu değişkenleri .env dosyasına ekleyin.'
    );
  }

  const hash = await hashPassword(cfg.ADMIN_PASSWORD);
  db.prepare(
    'INSERT INTO users(id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomId(16), cfg.ADMIN_EMAIL.toLowerCase(), cfg.ADMIN_NAME, hash, 'admin', Date.now());

  console.log(`[seed] admin oluşturuldu: ${cfg.ADMIN_EMAIL}`);
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  const db = openDatabase(cfg.DATA_DIR);

  await seedAdminIfEmpty(db, cfg);
  cleanupExpiredSessions(db);

  const app = express();
  app.set('trust proxy', 1);

  // /embed/* için CSP frame-ancestors *, diğer her yerde 'self'.
  app.use((req, res, next) => {
    const isEmbed = req.path.startsWith('/embed/');
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
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
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

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(loadUserFromSession(db, cfg));

  app.use((req, _res, next) => {
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      const ct = req.headers['content-type'] ?? '';
      if (req.path.startsWith('/api') && !ct.includes('application/json')) {
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
  app.use('/api', coursesRouter(db));
  app.use('/api', topicsRouter(db));
  app.use('/api', padsRouter(db));
  app.use('/api', versionsRouter(db));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Bulunamadı', code: 'NOT_FOUND' });
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

  const server = http.createServer(app);

  const collab = buildCollabServer(db, cfg);
  attachCollabToHttp(server, collab, cfg);
  startHubTicker();

  server.listen(cfg.PORT, () => {
    console.log(`[server] ${cfg.APP_NAME} — http://localhost:${cfg.PORT} (${cfg.NODE_ENV})`);
    console.log(`[collab] WebSocket — ws://localhost:${cfg.PORT}/collab`);
  });

  startCleanupJob(db);
  startBackupJob(db, cfg);

  const shutdown = (): void => {
    console.log('[server] kapatılıyor...');
    stopHubTicker();
    collab.destroy();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[server] başlatma hatası:', err);
  process.exit(1);
});