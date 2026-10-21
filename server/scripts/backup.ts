// Elle/otomatik çalıştırma: `npx tsx scripts/backup.ts`
// Crontab: 0 3 * * * cd /path/to/safecodeshare/server && npx tsx scripts/backup.ts >> /var/log/safecodeshare-backup.log 2>&1
import { loadConfig } from '../src/config';
import { openDatabase } from '../src/db';
import { runBackup } from '../src/jobs/backup';

async function main(): Promise<void> {
  const cfg = loadConfig();
  const db = openDatabase(cfg.DATA_DIR);
  const r = await runBackup(db, cfg);
  if (r.path) {
    console.log(`[backup] tamam: ${r.path}`);
    process.exit(0);
  } else {
    console.error(`[backup] hata: ${r.error ?? 'bilinmeyen'}`);
    process.exit(1);
  }
}

void main();