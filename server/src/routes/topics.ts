import { Router } from 'express';
import { CreateTopicSchema, UpdateTopicSchema } from '@safecodeshare/shared';
import type { DB } from '../db';
import { requireAuth } from '../auth/middleware';
import { sendError } from '../util/errors';
import { randomId } from '../util/tokens';
import type { CourseRow, TopicRow } from '../util/rows';

type TopicWithOwner = TopicRow & { course_owner: string };

export function topicsRouter(db: DB): Router {
  const router = Router();
  router.use(['/topics', '/courses'], requireAuth());

  // ---- POST /courses/:id/topics ----
  router.post('/courses/:id/topics', (req, res) => {
    const parsed = CreateTopicSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'Başlık gerekli ve en fazla 80 karakter olmalı', 'INVALID_INPUT');
      return;
    }
    const user = req.user!;
    const course = db
      .prepare('SELECT * FROM courses WHERE id = ?')
      .get(req.params.id) as CourseRow | undefined;

    if (!course) {
      sendError(res, 404, 'Ders bulunamadı', 'NOT_FOUND');
      return;
    }
    if (user.role !== 'admin' && course.owner_id !== user.id) {
      sendError(res, 403, 'Bu derse erişim yetkiniz yok', 'FORBIDDEN');
      return;
    }

    const id = randomId(16);
    const now = Date.now();
    const maxSort = db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM topics WHERE course_id = ?')
      .get(course.id) as { m: number };

    db.prepare('INSERT INTO topics(id, course_id, title, sort_order, created_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      course.id,
      parsed.data.title,
      maxSort.m + 1,
      now
    );

    res.status(201).json({
      topic: {
        id,
        courseId: course.id,
        title: parsed.data.title,
        sortOrder: maxSort.m + 1,
        createdAt: now
      }
    });
  });

  // ---- PATCH /topics/:id ----
  router.patch('/topics/:id', (req, res) => {
    const parsed = UpdateTopicSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'Geçersiz alanlar', 'INVALID_INPUT');
      return;
    }
    const user = req.user!;
    const row = db
      .prepare(
        'SELECT t.*, c.owner_id AS course_owner FROM topics t JOIN courses c ON c.id = t.course_id WHERE t.id = ?'
      )
      .get(req.params.id) as TopicWithOwner | undefined;

    if (!row) {
      sendError(res, 404, 'Konu bulunamadı', 'NOT_FOUND');
      return;
    }
    if (user.role !== 'admin' && row.course_owner !== user.id) {
      sendError(res, 403, 'Bu konuya erişim yetkiniz yok', 'FORBIDDEN');
      return;
    }

    const updates: string[] = [];
    const values: Array<string | number> = [];
    if (parsed.data.title !== undefined) {
      updates.push('title = ?');
      values.push(parsed.data.title);
    }
    if (parsed.data.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(parsed.data.sortOrder);
    }
    if (updates.length === 0) {
      res.json({ ok: true });
      return;
    }
    values.push(req.params.id);
    db.prepare(`UPDATE topics SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ ok: true });
  });

  // ---- DELETE /topics/:id ----
  // Padler silinmez; topic_id NULL'a düşer, ders bağlantısı korunur.
  router.delete('/topics/:id', (req, res) => {
    const user = req.user!;
    const row = db
      .prepare(
        'SELECT t.*, c.owner_id AS course_owner FROM topics t JOIN courses c ON c.id = t.course_id WHERE t.id = ?'
      )
      .get(req.params.id) as TopicWithOwner | undefined;

    if (!row) {
      sendError(res, 404, 'Konu bulunamadı', 'NOT_FOUND');
      return;
    }
    if (user.role !== 'admin' && row.course_owner !== user.id) {
      sendError(res, 403, 'Bu konuya erişim yetkiniz yok', 'FORBIDDEN');
      return;
    }

    db.prepare('DELETE FROM topics WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return router;
}