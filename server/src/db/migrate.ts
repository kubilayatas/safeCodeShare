import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, 'migrations');

// `NNN_*.sql` dosyalarını sırayla çalıştırır, uygulananları schema_migrations'ta tutar.
export function runMigrations(db: Database.Database): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: string }>;
  const applied = new Set(appliedRows.map((r) => r.version));

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const tx = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)').run(version, Date.now());
    });
    try {
      tx();
      console.log(`[db] migration uygulandı: ${version}`);
    } catch (err) {
      console.error(`[db] migration hatası: ${version}`, err);
      throw err;
    }
  }
}