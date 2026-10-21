import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { runMigrations } from './migrate';

export type DB = Database.Database;

// DATA_DIR altında tek dosyalık SQLite veritabanı açar, WAL ve foreign_keys pragmalarını uygular.
export function openDatabase(dataDir: string): DB {
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'safecodeshare.db');
  // Eski adla (KodSınıf dönemi) oluşturulmuş veritabanı varsa yeni ada taşı; veri kaybolmasın.
  const legacyPath = path.join(dataDir, 'kodsinif.db');
  if (!fs.existsSync(dbPath) && fs.existsSync(legacyPath)) {
    for (const suffix of ['', '-wal', '-shm']) {
      if (fs.existsSync(legacyPath + suffix)) fs.renameSync(legacyPath + suffix, dbPath + suffix);
    }
    console.log('[db] kodsinif.db → safecodeshare.db olarak yeniden adlandırıldı');
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}