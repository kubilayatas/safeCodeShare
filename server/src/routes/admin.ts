// Yönetici paneli uçları. Router /api/admin altına bağlanır; buradaki yollar ona göredir.
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  CreateUserSchema,
  SiteSettingsSchema,
  UpdateUserSchema,
  type AdminStats,
  type AdminUser
} from '@safecodeshare/shared';
import type { DB } from '../db';
import { requireAdmin, toPublicUser } from '../auth/middleware';
import { hashPassword } from '../auth/passwords';
import { deleteUserSessions } from '../auth/sessions';
import { sendError } from '../util/errors';
import { randomId } from '../util/tokens';
import type { UserRow } from '../util/rows';
import { runBackup } from '../jobs/backup';
import type { AppConfig } from '../config';
import { effectivePlan, getSiteSettings, parseOverride, saveSiteSettings } from '../account/entitlements';
import { notifyAccessChange } from '../collab/accessNotify';
import { latestSubscription, PRO_SQL, toBillingInfo } from '../billing/subscriptions';
import { billingEnabled, cancelSubscription } from '../billing/lemonsqueezy';

type UserWithUsage = UserRow & { course_count: number; pad_count: number; billing_until: number | null };

function toAdminUser(db: DB, r: UserWithUsage): AdminUser {
  const now = Date.now();
  const sub = latestSubscription(db, r.id, now);
  return {
    ...toPublicUser(r),
    effectivePlan: r.role === 'admin' ? 'pro' : effectivePlan(r, now, r.billing_until ?? 0),
    usage: { courses: r.course_count, pads: r.pad_count },
    lastLoginAt: r.last_login_at ?? null,
    signupSource: r.signup_source === 'self' ? 'self' : 'admin',
    adminNote: r.admin_note ?? '',
    limitsOverride: parseOverride(r.limits_override),
    billing: sub ? { ...toBillingInfo(sub, now), subscriptionId: sub.id } : null
  };
}

const USER_COLUMNS = `u.*,
  (SELECT COUNT(*) FROM courses c WHERE c.owner_id = u.id) AS course_count,
  (SELECT COUNT(*) FROM pads p WHERE p.owner_id = u.id) AS pad_count,
  (SELECT MAX(s.access_until) FROM subscriptions s WHERE s.user_id = u.id) AS billing_until`;

function loadAdminUser(db: DB, id: string): AdminUser | null {
  const r = db.prepare(`SELECT ${USER_COLUMNS} FROM users u WHERE u.id = ?`).get(id) as UserWithUsage | undefined;
  return r ? toAdminUser(db, r) : null;
}

function adminCount(db: DB): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'").get() as { n: number }).n;
}

// Kullanıcının bütün paylaşımlarına bağlı izleyicileri düşür (askıya alma / silme sonrası).
function dropUserConnections(db: DB, userId: string): void {
  const ids = db.prepare('SELECT id FROM pads WHERE owner_id = ?').all(userId) as Array<{ id: string }>;
  for (const { id } of ids) notifyAccessChange(id);
}

export function adminRouter(db: DB, cfg: AppConfig): Router {
  const router = Router();
  router.use(requireAdmin());

  // ---- GET /api/admin/stats ----
  router.get('/stats', (_req, res) => {
    const now = Date.now();
    const one = (sql: string, ...p: unknown[]): number => (db.prepare(sql).get(...p) as { n: number }).n;
    const stats: AdminStats = {
      users: one('SELECT COUNT(*) AS n FROM users'),
      activeUsers30d: one('SELECT COUNT(*) AS n FROM users WHERE last_login_at > ?', now - 30 * 86400000),
      proUsers: one(`SELECT COUNT(*) AS n FROM users u WHERE ${PRO_SQL}`, now, now),
      suspendedUsers: one("SELECT COUNT(*) AS n FROM users WHERE status = 'suspended'"),
      courses: one('SELECT COUNT(*) AS n FROM courses'),
      pads: one('SELECT COUNT(*) AS n FROM pads'),
      signups7d: one('SELECT COUNT(*) AS n FROM users WHERE created_at > ?', now - 7 * 86400000)
    };
    res.json(stats);
  });

  // ---- GET /api/admin/users?q=&plan=&status=&page= ----
  router.get('/users', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const plan = typeof req.query.plan === 'string' ? req.query.plan : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = 50;

    const where: string[] = [];
    const params: Array<string | number> = [];
    if (q) {
      where.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (plan === 'pro') {
      where.push(PRO_SQL);
      params.push(Date.now(), Date.now());
    } else if (plan === 'free') {
      where.push(`u.role = 'teacher' AND NOT ${PRO_SQL}`);
      params.push(Date.now(), Date.now());
    } else if (plan === 'admin') {
      where.push("u.role = 'admin'");
    }
    if (status === 'active' || status === 'suspended') {
      where.push('u.status = ?');
      params.push(status);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = (db.prepare(`SELECT COUNT(*) AS n FROM users u ${w}`).get(...params) as { n: number }).n;
    const rows = db
      .prepare(`SELECT ${USER_COLUMNS} FROM users u ${w} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize) as UserWithUsage[];
    res.json({ users: rows.map((r) => toAdminUser(db, r)), total, page, pageSize });
  });

  // ---- GET /api/admin/users/:id — ayrıntı + içerik özeti ----
  router.get('/users/:id', (req, res) => {
    const user = loadAdminUser(db, req.params.id);
    if (!user) {
      sendError(res, 404, 'Kullanıcı bulunamadı', 'NOT_FOUND');
      return;
    }
    const courses = db
      .prepare(
        `SELECT c.id, c.title, c.created_at AS createdAt,
                (SELECT COUNT(*) FROM pads p WHERE p.course_id = c.id) AS padCount
           FROM courses c WHERE c.owner_id = ? ORDER BY c.created_at DESC`
      )
      .all(user.id);
    const pads = db
      .prepare(
        `SELECT p.id, p.title, p.language, p.line_count AS lineCount, p.updated_at AS updatedAt,
                p.copy_protect AS copyProtect, p.view_enabled AS viewEnabled, c.title AS courseTitle
           FROM pads p LEFT JOIN courses c ON c.id = p.course_id
          WHERE p.owner_id = ? ORDER BY p.updated_at DESC LIMIT 200`
      )
      .all(user.id);
    res.json({ user, courses, pads });
  });

  // ---- POST /api/admin/users ----
  router.post('/users', async (req, res) => {
    const parsed = CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0]?.message ?? 'Geçersiz kullanıcı bilgisi', 'INVALID_INPUT');
      return;
    }
    const { email, name, password, role } = parsed.data;
    // Yöneticinin elle eklediği öğretmenler varsayılan olarak Pro olur.
    const plan = parsed.data.plan ?? 'pro';
    const exists = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (exists) {
      sendError(res, 409, 'Bu e-posta zaten kayıtlı', 'EMAIL_TAKEN');
      return;
    }
    const id = randomId(16);
    const hash = await hashPassword(password);
    db.prepare(
      `INSERT INTO users(id, email, name, password_hash, role, created_at, plan, status, signup_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'admin')`
    ).run(id, email.toLowerCase(), name, hash, role, Date.now(), plan);
    res.status(201).json({ user: loadAdminUser(db, id) });
  });

  // ---- PATCH /api/admin/users/:id ----
  router.patch('/users/:id', async (req, res) => {
    const parsed = UpdateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0]?.message ?? 'Geçersiz alanlar', 'INVALID_INPUT');
      return;
    }
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined;
    if (!target) {
      sendError(res, 404, 'Kullanıcı bulunamadı', 'NOT_FOUND');
      return;
    }
    const d = parsed.data;
    const isSelf = target.id === req.user!.id;

    if (target.role === 'admin' && ((d.role && d.role !== 'admin') || d.status === 'suspended')) {
      if (isSelf) {
        sendError(res, 400, 'Kendi yönetici yetkinizi kaldıramaz veya kendinizi askıya alamazsınız', 'CANNOT_MODIFY_SELF');
        return;
      }
      if (adminCount(db) <= 1) {
        sendError(res, 400, 'Son yönetici düşürülemez veya askıya alınamaz', 'LAST_ADMIN');
        return;
      }
    }

    const updates: string[] = [];
    const values: Array<string | number | null> = [];
    const set = (col: string, v: string | number | null): void => {
      updates.push(`${col} = ?`);
      values.push(v);
    };
    if (d.name !== undefined) set('name', d.name);
    if (d.role !== undefined) set('role', d.role);
    if (d.password !== undefined) set('password_hash', await hashPassword(d.password));
    if (d.plan !== undefined) set('plan', d.plan);
    if (d.planExpiresAt !== undefined) set('plan_expires_at', d.planExpiresAt);
    if (d.status !== undefined) set('status', d.status);
    if (d.limitsOverride !== undefined) {
      const o = d.limitsOverride;
      set('limits_override', o && Object.keys(o).length > 0 ? JSON.stringify(o) : null);
    }
    if (d.adminNote !== undefined) set('admin_note', d.adminNote);

    if (updates.length > 0) {
      values.push(target.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    // Askıya alma veya parola sıfırlama: açık oturumları kapat.
    if (d.status === 'suspended' || d.password !== undefined) deleteUserSessions(db, target.id);
    // Askıya alma/geri açma: paylaşımlara bağlı izleyiciler yeni duruma göre yeniden değerlendirilsin.
    if (d.status !== undefined && d.status !== target.status) dropUserConnections(db, target.id);

    res.json({ user: loadAdminUser(db, target.id) });
  });

  // ---- DELETE /api/admin/users/:id ----
  router.delete('/users/:id', async (req, res) => {
    if (req.user!.id === req.params.id) {
      sendError(res, 400, 'Kendinizi silemezsiniz', 'CANNOT_DELETE_SELF');
      return;
    }
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow | undefined;
    if (!target) {
      sendError(res, 404, 'Kullanıcı bulunamadı', 'NOT_FOUND');
      return;
    }
    if (target.role === 'admin' && adminCount(db) <= 1) {
      sendError(res, 400, 'Son yönetici silinemez', 'LAST_ADMIN');
      return;
    }
    // Ücret almaya devam eden abonelik varsa önce iptal edilmeli; yoksa silinen kişiden para çekilmeye devam eder.
    const billable = db
      .prepare(
        "SELECT id FROM subscriptions WHERE user_id = ? AND status IN ('active', 'on_trial', 'past_due', 'paused', 'unpaid')"
      )
      .all(target.id) as Array<{ id: string }>;
    if (billable.length) {
      if (!billingEnabled(cfg)) {
        sendError(res, 409, 'Bu kullanıcının devam eden bir aboneliği var. Önce Lemon Squeezy panelinden iptal edin.', 'HAS_SUBSCRIPTION');
        return;
      }
      try {
        for (const b of billable) await cancelSubscription(cfg, b.id);
      } catch (err) {
        console.error('[admin] abonelik iptal edilemedi:', err instanceof Error ? err.message : err);
        sendError(res, 409, 'Bu kullanıcının devam eden bir aboneliği var. Önce Lemon Squeezy panelinden iptal edin.', 'HAS_SUBSCRIPTION');
        return;
      }
    }
    dropUserConnections(db, target.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
    res.json({ ok: true, cancelledSubscriptions: billable.length });
  });

  // ---- GET/PATCH /api/admin/settings ----
  router.get('/settings', (_req, res) => {
    res.json(getSiteSettings(db));
  });

  router.patch('/settings', (req, res) => {
    const parsed = SiteSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.errors[0]?.message ?? 'Geçersiz ayar', 'INVALID_INPUT');
      return;
    }
    res.json(saveSiteSettings(db, parsed.data));
  });

  // ---- GET /api/admin/backup ----
  router.get('/backup', async (_req, res, next) => {
    try {
      const result = await runBackup(db, cfg);
      if (!result.path || !fs.existsSync(result.path)) {
        sendError(res, 500, 'Yedek oluşturulamadı', 'BACKUP_FAILED');
        return;
      }
      const filename = path.basename(result.path);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      fs.createReadStream(result.path).pipe(res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
