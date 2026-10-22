import type { NextFunction, Request, Response } from 'express';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { isLocale, type PublicUser, type Role } from '@safecodeshare/shared';
import { findSession, SESSION_COOKIE } from './sessions';
import { sendError } from '../util/errors';
import type { UserRow } from '../util/rows';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as Role,
    createdAt: row.created_at,
    plan: row.plan === 'pro' ? 'pro' : 'free',
    planExpiresAt: row.plan_expires_at ?? null,
    status: row.status === 'suspended' ? 'suspended' : 'active',
    locale: isLocale(row.locale) ? row.locale : null
  };
}

export function loadUserFromSession(db: DB, _cfg: AppConfig) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!sid) return next();
    const session = findSession(db, sid);
    if (!session) return next();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as UserRow | undefined;
    if (!user) return next();
    // Askıya alınmış hesap: oturum geçersiz sayılır.
    if (user.status === 'suspended') return next();
    req.user = toPublicUser(user);
    next();
  };
}

export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'Giriş yapmalısınız', 'UNAUTHORIZED');
      return;
    }
    next();
  };
}

export function requireAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'Giriş yapmalısınız', 'UNAUTHORIZED');
      return;
    }
    if (req.user.role !== 'admin') {
      sendError(res, 403, 'Bu işlem için yetkiniz yok', 'FORBIDDEN');
      return;
    }
    next();
  };
}