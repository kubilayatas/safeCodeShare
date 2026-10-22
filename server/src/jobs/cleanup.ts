import type { DB } from '../db';
import { cleanupExpiredSessions } from '../auth/sessions';
import { cleanupBillingEvents } from '../billing/subscriptions';

const ONE_HOUR = 60 * 60 * 1000;
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// Her saat: süresi dolmuş oturumları sil; süresi 30 günden fazla önce dolmuş padleri sil.
export function startCleanupJob(db: DB): NodeJS.Timeout {
  const tick = (): void => {
    try {
      const sessions = cleanupExpiredSessions(db);
      if (sessions > 0) console.log(`[cleanup] ${sessions} süresi dolmuş oturum silindi.`);

      const cutoff = Date.now() - THIRTY_DAYS;
      const res = db
        .prepare('DELETE FROM pads WHERE expires_at IS NOT NULL AND expires_at < ?')
        .run(cutoff);
      if (res.changes > 0) console.log(`[cleanup] ${res.changes} süresi geçmiş pad silindi.`);

      cleanupBillingEvents(db);
    } catch (err) {
      console.error('[cleanup] hata:', err);
    }
  };

  tick();
  const timer = setInterval(tick, ONE_HOUR);
  timer.unref();
  return timer;
}