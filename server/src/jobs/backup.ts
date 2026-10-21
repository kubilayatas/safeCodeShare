// Yedekleme: `DATA_DIR/backups/safecodeshare-YYYY-MM-DD.db` oluşturur, son 14 dosyayı tutar.
// Ayrıca günlük 03:00'te otomatik çalışacak job'u sağlar.
import fs from 'node:fs';
import path from 'node:path';
import type { DB } from '../db';
import type { AppConfig } from '../config';

const KEEP = 14;
const RUN_HOUR = 3;

function backupsDir(dataDir: string): string {
  return path.join(dataDir, 'backups');
}

function todayStamp(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type BackupResult = { path: string | null; error?: string };

// Tek seferlik yedek çalıştırır. Var olan aynı güne ait dosyayı önce siler.
export async function runBackup(db: DB, cfg: AppConfig): Promise<BackupResult> {
  try {
    const dir = backupsDir(cfg.DATA_DIR);
    fs.mkdirSync(dir, { recursive: true });

    const target = path.join(dir, `safecodeshare-${todayStamp()}.db`);
    if (fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch {
        /* yut */
      }
    }

    // better-sqlite3 v11: db.backup(dest) → Promise<{ totalPages, remainingPages }>
    // Tip olarak tanımlı değilse "unknown" olabilir; güvenli cast.
    const raw = db as unknown as { backup: (dest: string) => Promise<unknown> };
    await raw.backup(target);

    pruneOld(dir);

    return { path: target };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[backup] hata:', msg);
    return { path: null, error: msg };
  }
}

function pruneOld(dir: string): void {
  try {
    const entries = fs
      .readdirSync(dir)
      .filter((f) => /^(safecodeshare|kodsinif)-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      .map((f) => ({ name: f, full: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    for (const e of entries.slice(KEEP)) {
      try {
        fs.unlinkSync(e.full);
      } catch {
        /* yut */
      }
    }
  } catch (err) {
    console.warn('[backup] temizleme hatası:', err);
  }
}

// Uygulama içinde saatlik tetikleyici: 03:00'ü geçtiyse ve bugün yedek alınmadıysa çalıştır.
export function startBackupJob(db: DB, cfg: AppConfig): NodeJS.Timeout {
  const tick = (): void => {
    try {
      const now = new Date();
      if (now.getHours() < RUN_HOUR) return;
      const dir = backupsDir(cfg.DATA_DIR);
      const target = path.join(dir, `safecodeshare-${todayStamp()}.db`);
      if (fs.existsSync(target)) return;
      void runBackup(db, cfg);
    } catch (err) {
      console.warn('[backup] job hatası:', err);
    }
  };

  // Açılışta bir kontrol
  tick();
  const timer = setInterval(tick, 60 * 60 * 1000);
  timer.unref();
  return timer;
}