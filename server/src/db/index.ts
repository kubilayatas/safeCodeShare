import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { runMigrations } from './migrate';

export type DB = Database.Database;

// DATA_DIR altında tek dosyalık SQLite veritabanı açar, WAL ve foreign_keys pragmalarını uygular.
export function openDatabase(dataDir: string): DB {
  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'kodsinif.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}