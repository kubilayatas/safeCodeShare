import http from 'node:http';
import { loadConfig } from './config';
import { openDatabase } from './db';
import { hashPassword } from './auth/passwords';
import { randomId } from './util/tokens';
import { cleanupExpiredSessions } from './auth/sessions';
import { startCleanupJob } from './jobs/cleanup';
import { startBackupJob } from './jobs/backup';
import { buildCollabServer, attachCollabToHttp } from './collab/hocuspocus';
import { startHubTicker, stopHubTicker } from './protect/hub';
import { createApp } from './app';



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

  const app = createApp(db, cfg);

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