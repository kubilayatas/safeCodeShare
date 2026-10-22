import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import {
  ChangePasswordSchema,
  LoginSchema,
  RegisterSchema,
  UpdateProfileSchema,
  type MeResponse
} from '@safecodeshare/shared';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { hashPassword, verifyPassword } from '../auth/passwords';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  deleteUserSessions,
  SESSION_COOKIE,
  setSessionCookie
} from '../auth/sessions';
import { requireAuth, toPublicUser } from '../auth/middleware';
import { sendError } from '../util/errors';
import { randomId } from '../util/tokens';
import type { UserRow } from '../util/rows';
import { getEntitlements, getSiteSettings } from '../account/entitlements';
import { tReq } from '../i18n';

// Zamanlama farkından "bu e-posta kayıtlı mı" bilgisi sızmasın diye, kullanıcı
// bulunamadığında da bir bcrypt karşılaştırması yapılır.
const DUMMY_HASH = '$2a$12$5IeV6hJsSac.MkV2.fvQaurxaLGBHBjUSEWYOZwmoLf6bBUJ1NQ4y';

export function authRouter(db: DB, cfg: AppConfig): Router {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: cfg.LOGIN_RATE_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: (req: Request) => ({ error: tReq(req, 'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin.'), code: 'RATE_LIMIT' })
  });

  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: cfg.REGISTER_RATE_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: (req: Request) => ({ error: tReq(req, 'Bu bağlantıdan çok fazla kayıt denemesi yapıldı. Bir saat sonra tekrar deneyin.'), code: 'RATE_LIMIT' })
  });

  function meBody(userId: string): MeResponse {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow;
    return { user: toPublicUser(row), entitlements: getEntitlements(db, userId) };
  }

  router.post('/login', loginLimiter, async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'E-posta veya parola geçersiz', 'INVALID_INPUT');
      return;
    }
    const { email, password } = parsed.data;

    const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as
      | UserRow
      | undefined;

    const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) {
      sendError(res, 401, 'E-posta veya parola hatalı', 'INVALID_CREDENTIALS');
      return;
    }
    if (user.status === 'suspended') {
      sendError(res, 403, 'Hesabınız askıya alınmış. Site yöneticisiyle iletişime geçin.', 'SUSPENDED');
      return;
    }

    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(Date.now(), user.id);
    const sid = createSession(db, user.id, cfg.SESSION_DAYS);
    setSessionCookie(res, sid, cfg);
    res.json(meBody(user.id));
  });

  // ---- POST /api/auth/register — herkese açık kayıt ----
  router.post('/register', registerLimiter, async (req, res) => {
    const settings = getSiteSettings(db);
    if (!settings.registrationOpen) {
      sendError(res, 403, 'Yeni kayıtlar şu anda kapalı.', 'REGISTRATION_CLOSED');
      return;
    }
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      // Bot tuzağı dolduysa genel bir hata ver (botlara ipucu verme).
      if (first?.path[0] === 'website') {
        sendError(res, 400, 'Kayıt tamamlanamadı', 'INVALID_INPUT');
        return;
      }
      sendError(res, 400, first?.message ?? 'Geçersiz kayıt bilgisi', 'INVALID_INPUT');
      return;
    }
    const { name, email, password } = parsed.data;
    const locale = parsed.data.locale ?? null;
    const exists = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (exists) {
      sendError(res, 409, 'Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.', 'EMAIL_TAKEN');
      return;
    }
    const id = randomId(16);
    const now = Date.now();
    const hash = await hashPassword(password);
    db.prepare(
      `INSERT INTO users(id, email, name, password_hash, role, created_at, plan, status, signup_source, last_login_at, locale)
       VALUES (?, ?, ?, ?, 'teacher', ?, 'free', 'active', 'self', ?, ?)`
    ).run(id, email.toLowerCase(), name, hash, now, now, locale);

    const sid = createSession(db, id, cfg.SESSION_DAYS);
    setSessionCookie(res, sid, cfg);
    res.status(201).json(meBody(id));
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
    res.json(meBody(req.user.id));
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
    if (parsed.data.name !== undefined) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(parsed.data.name, req.user!.id);
    }
    if (parsed.data.locale !== undefined) {
      db.prepare('UPDATE users SET locale = ? WHERE id = ?').run(parsed.data.locale, req.user!.id);
    }
    res.json(meBody(req.user!.id));
  });

  return router;
}
