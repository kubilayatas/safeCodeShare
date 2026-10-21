import type { Response } from 'express';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { newSessionId } from '../util/tokens';

export type SessionRow = {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
};

export const SESSION_COOKIE = 'sid';

export function createSession(db: DB, userId: string, days: number): string {
  const id = newSessionId();
  const now = Date.now();
  const expiresAt = now + days * 24 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions(id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    userId,
    expiresAt,
    now
  );
  return id;
}

export function findSession(db: DB, id: string): SessionRow | null {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined;
  if (!row) return null;
  if (row.expires_at <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return null;
  }
  return row;
}

export function deleteSession(db: DB, id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function deleteUserSessions(db: DB, userId: string): void {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function cleanupExpiredSessions(db: DB): number {
  const res = db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
  return res.changes;
}

export function setSessionCookie(res: Response, sid: string, cfg: AppConfig): void {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cfg.isProd,
    maxAge: cfg.SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/'
  });
}

export function clearSessionCookie(res: Response, cfg: AppConfig): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cfg.isProd,
    path: '/'
  });
}