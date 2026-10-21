import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ChangePasswordSchema, LoginSchema, UpdateProfileSchema } from '@kodsinif/shared';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { hashPassword, verifyPassword } from '../auth/passwords';
import { clearSessionCookie, createSession, deleteSession, deleteUserSessions, SESSION_COOKIE, setSessionCookie } from '../auth/sessions';
import { requireAuth, toPublicUser } from '../auth/middleware';
import { sendError } from '../util/errors';

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'admin' | 'teacher';
  created_at: number;
};

export function authRouter(db: DB, cfg: AppConfig): Router {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: cfg.LOGIN_RATE_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin.', code: 'RATE_LIMIT' }
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'E-posta veya parola geçersiz', 'INVALID_INPUT');
      return;
    }
    const { email, password } = parsed.data;

    const user = db
      .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
      .get(email) as UserRow | undefined;

    if (!user) {
      sendError(res, 401, 'E-posta veya parola hatalı', 'INVALID_CREDENTIALS');
      return;
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      sendError(res, 401, 'E-posta veya parola hatalı', 'INVALID_CREDENTIALS');
      return;
    }

    const sid = createSession(db, user.id, cfg.SESSION_DAYS);
    setSessionCookie(res, sid, cfg);
    res.json({ user: toPublicUser(user) });
  });

  router.post('/logout', (req, res) => {
    const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (sid) deleteSession(db, sid);
    clearSessionCookie(res, cfg);
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => {
    if (!req.user) {
      sendError(res, 401, 'Giriş yapmalısınız', 'UNAUTHORIZED');
      return;
    }
    res.json({ user: req.user });
  });

  router.post('/change-password', requireAuth(), async (req, res) => {
    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'Yeni parola en az 8 karakter olmalı', 'INVALID_INPUT');
      return;
    }
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as UserRow | undefined;
    if (!user) {
      sendError(res, 401, 'Kullanıcı bulunamadı', 'UNAUTHORIZED');
      return;
    }
    const ok = await verifyPassword(parsed.data.current, user.password_hash);
    if (!ok) {
      sendError(res, 400, 'Mevcut parola hatalı', 'INVALID_CREDENTIALS');
      return;
    }
    const hash = await hashPassword(parsed.data.next);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
    // Diğer oturumları kapat, kendi oturumumuzu yenile
    deleteUserSessions(db, user.id);
    const sid = createSession(db, user.id, cfg.SESSION_DAYS);
    setSessionCookie(res, sid, cfg);
    res.json({ ok: true });
  });

  router.patch('/profile', requireAuth(), (req, res) => {
    const parsed = UpdateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'Ad geçersiz', 'INVALID_INPUT');
      return;
    }
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(parsed.data.name, req.user!.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.id) as UserRow;
    res.json({ user: toPublicUser(user) });
  });

  return router;
}