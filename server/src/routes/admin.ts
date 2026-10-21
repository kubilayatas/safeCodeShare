// Admin paneli uçları (spesifikasyon §7 Admin bölümü).
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { CreateUserSchema, UpdateUserSchema } from '@safecodeshare/shared';
import type { DB } from '../db';
import { requireAdmin } from '../auth/middleware';
import { hashPassword } from '../auth/passwords';
import { toPublicUser } from '../auth/middleware';
import { sendError } from '../util/errors';
import { randomId } from '../util/tokens';
import { runBackup } from '../jobs/backup';
import type { AppConfig } from '../config';

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: 'admin' | 'teacher';
  created_at: number;
};

function listUsers(db: DB): ReturnType<typeof toPublicUser>[] {
  const rows = db
    .prepare('SELECT * FROM users ORDER BY created_at ASC')
    .all() as UserRow[];
  return rows.map(toPublicUser);
}

export function adminRouter(db: DB, cfg: AppConfig): Router {
  const router = Router();
  router.use(requireAdmin());

  // ---- GET /api/admin/users ----
  router.get('/admin/users', (_req, res) => {
    res.json({ users: listUsers(db) });
  });

  // ---- POST /api/admin/users ----
  router.post('/admin/users', async (req, res, next) => {
    try {
      const parsed = CreateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'Geçersiz kullanıcı bilgisi', 'INVALID_INPUT');
        return;
      }
      const { email, name, password, role } = parsed.data;

      const exists = db
        .prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE')
        .get(email) as { id: string } | undefined;
      if (exists) {
        sendError(res, 409, 'Bu e-posta zaten kayıtlı', 'EMAIL_TAKEN');
        return;
      }

      const id = randomId(16);
      const hash = await hashPassword(password);
      db.prepare(
        'INSERT INTO users(id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, email.toLowerCase(), name, hash, role, Date.now());

      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
      res.status(201).json({ user: toPublicUser(row) });
    } catch (err) {
      next(err);
    }
  });

  // ---- PATCH /api/admin/users/:id ----
  router.patch('/admin/users/:id', async (req, res, next) => {
    try {
      const parsed = UpdateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'Geçersiz alanlar', 'INVALID_INPUT');
        return;
      }
      const target = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(req.params.id) as UserRow | undefined;
      if (!target) {
        sendError(res, 404, 'Kullanıcı bulunamadı', 'NOT_FOUND');
        return;
      }

      const updates: string[] = [];
      const values: Array<string | number> = [];
      const d = parsed.data;

      if (d.name !== undefined) {
        updates.push('name = ?');
        values.push(d.name);
      }
      if (d.role !== undefined) {
        // Son admin düşürülemesin
        if (target.role === 'admin' && d.role !== 'admin') {
          const adminCount = db
            .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'")
            .get() as { n: number };
          if (adminCount.n <= 1) {
            sendError(res, 400, 'Son admin düşürülemez', 'LAST_ADMIN');
            return;
          }
        }
        updates.push('role = ?');
        values.push(d.role);
      }
      if (d.password !== undefined) {
        const hash = await hashPassword(d.password);
        updates.push('password_hash = ?');
        values.push(hash);
      }

      if (updates.length === 0) {
        res.json({ ok: true });
        return;
      }
      values.push(req.params.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

      const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow;
      res.json({ user: toPublicUser(updated) });
    } catch (err) {
      next(err);
    }
  });

  // ---- DELETE /api/admin/users/:id ----
  router.delete('/admin/users/:id', (req, res) => {
    if (req.user!.id === req.params.id) {
      sendError(res, 400, 'Kendinizi silemezsiniz', 'CANNOT_DELETE_SELF');
      return;
    }
    const target = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(req.params.id) as UserRow | undefined;
    if (!target) {
      sendError(res, 404, 'Kullanıcı bulunamadı', 'NOT_FOUND');
      return;
    }
    if (target.role === 'admin') {
      const adminCount = db
        .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'")
        .get() as { n: number };
      if (adminCount.n <= 1) {
        sendError(res, 400, 'Son admin silinemez', 'LAST_ADMIN');
        return;
      }
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // ---- GET /api/admin/backup ----
  router.get('/admin/backup', async (_req, res, next) => {
    try {
      const result = await runBackup(db, cfg);
      if (!result.path || !fs.existsSync(result.path)) {
        sendError(res, 500, 'Yedek oluşturulamadı', 'BACKUP_FAILED');
        return;
      }
      const filename = path.basename(result.path);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
      );
      fs.createReadStream(result.path).pipe(res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}