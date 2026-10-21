import { Router } from 'express';
import {
  CreatePadSchema,
  RotateTokensSchema,
  UpdatePadSchema,
  languageExtension
} from '@safecodeshare/shared';
import type { PadFull, PadSummary } from '@safecodeshare/shared';
import type { DB } from '../db';
import { requireAuth } from '../auth/middleware';
import { hashPassword } from '../auth/passwords';
import { sendError } from '../util/errors';
import { newEditToken, newPadId, newViewToken } from '../util/tokens';
import { safeFilename } from '../util/filename';
import { padSummary } from '../util/rows';
import type { CourseRow, PadRow, TopicRow } from '../util/rows';
import { notifyAccessChange } from '../collab/accessNotify';
import { getCollabServer } from '../collab/singleton';
import { updateMeta } from '../collab/directEdit';

// Doküman şu an açıksa (birileri bağlıysa) başlık/dil değişikliğini canlı Yjs meta'sına da yaz.
// Böylece açık editörler anında görür ve bir sonraki otomatik kayıt eski değeri geri yazmaz.
async function syncLiveMeta(padId: string, meta: { title?: string; language?: string }): Promise<void> {
  const server = getCollabServer();
  if (!server) return;
  const docs = (server as unknown as { documents?: Map<string, unknown> }).documents;
  if (!docs?.has(padId)) return;
  try {
    await updateMeta(server, padId, meta);
  } catch (err) {
    console.warn(`[pads] canlı meta güncellenemedi (${padId}):`, err);
  }
}

function padFull(row: PadRow): PadFull {
  return {
    ...padSummary(row),
    ownerId: row.owner_id,
    description: row.description,
    editToken: row.edit_token,
    viewToken: row.view_token,
    contentText: row.content_text,
    createdAt: row.created_at
  };
}

function canManagePad(userRole: 'admin' | 'teacher', userId: string, row: PadRow): boolean {
  return userRole === 'admin' || row.owner_id === userId;
}

export function padsRouter(db: DB): Router {
  const router = Router();
  router.use('/pads', requireAuth());

  // ---- POST /pads ----
  router.post('/pads', (req, res) => {
    const parsed = CreatePadSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'Geçersiz kod bilgisi', 'INVALID_INPUT');
      return;
    }
    const user = req.user!;
    const d = parsed.data;

    let courseId: string | null = d.courseId ?? null;
    let topicId: string | null = d.topicId ?? null;

    if (topicId) {
      const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(topicId) as TopicRow | undefined;
      if (!topic) {
        sendError(res, 400, 'Konu bulunamadı', 'INVALID_TOPIC');
        return;
      }
      if (courseId && courseId !== topic.course_id) {
        sendError(res, 400, 'Konu ile ders uyuşmuyor', 'TOPIC_COURSE_MISMATCH');
        return;
      }
      courseId = topic.course_id;
    }

    if (courseId) {
      const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as CourseRow | undefined;
      if (!course) {
        sendError(res, 400, 'Ders bulunamadı', 'INVALID_COURSE');
        return;
      }
      if (user.role !== 'admin' && course.owner_id !== user.id) {
        sendError(res, 403, 'Bu derse erişim yetkiniz yok', 'FORBIDDEN');
        return;
      }
    }

    let copyProtect = 1;
    if (courseId) {
      const row = db
        .prepare('SELECT default_copy_protect FROM courses WHERE id = ?')
        .get(courseId) as { default_copy_protect: number } | undefined;
      copyProtect = row?.default_copy_protect ?? 1;
    }

    const id = newPadId();
    const now = Date.now();
    const editToken = newEditToken();
    const viewToken = newViewToken();
    const content = d.content ?? '';
    const lineCount = content.length === 0 ? 0 : content.split('\n').length;

    const maxSort = db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM pads WHERE owner_id = ?')
      .get(user.id) as { m: number };

    db.prepare(
      `INSERT INTO pads(id, owner_id, course_id, topic_id, title, description, language, sort_order,
                        edit_token, view_token, edit_enabled, view_enabled, visible_in_course,
                        visible_from, expires_at, password_hash, ydoc, content_text, line_count,
                        copy_protect, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, 0, 1, 1, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)`
    ).run(
      id,
      user.id,
      courseId,
      topicId,
      d.title,
      d.language,
      maxSort.m + 1,
      editToken,
      viewToken,
      content,
      lineCount,
      copyProtect,
      now,
      now
    );

    const row = db.prepare('SELECT * FROM pads WHERE id = ?').get(id) as PadRow;
    res.status(201).json({ pad: padFull(row) });
  });

  // ---- GET /pads ----
  router.get('/pads', (req, res) => {
    const user = req.user!;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const courseId = typeof req.query.courseId === 'string' ? req.query.courseId : '';
    const language = typeof req.query.language === 'string' ? req.query.language : '';

    const conditions: string[] = [];
    const params: Array<string> = [];

    if (user.role !== 'admin') {
      conditions.push('owner_id = ?');
      params.push(user.id);
    }
    if (courseId) {
      conditions.push('course_id = ?');
      params.push(courseId);
    }
    if (language) {
      conditions.push('language = ?');
      params.push(language);
    }
    if (q) {
      conditions.push('(title LIKE ? OR content_text LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = db
      .prepare(`SELECT * FROM pads ${where} ORDER BY sort_order, updated_at DESC LIMIT 100`)
      .all(...params) as PadRow[];

    const summaries: PadSummary[] = rows.map(padSummary);
    res.json({ pads: summaries });
  });

  // ---- GET /pads/:id ----
  router.get('/pads/:id', (req, res) => {
    const user = req.user!;
    const row = db.prepare('SELECT * FROM pads WHERE id = ?').get(req.params.id) as PadRow | undefined;
    if (!row) {
      sendError(res, 404, 'Kod bulunamadı', 'NOT_FOUND');
      return;
    }
    if (!canManagePad(user.role, user.id, row)) {
      sendError(res, 403, 'Bu koda erişim yetkiniz yok', 'FORBIDDEN');
      return;
    }
    res.json({ pad: padFull(row) });
  });

  // ---- PATCH /pads/:id ----
  router.patch('/pads/:id', async (req, res, next) => {
    try {
      const parsed = UpdatePadSchema.safeParse(req.body);
      if (!parsed.success) {
        sendError(res, 400, 'Geçersiz alanlar', 'INVALID_INPUT');
        return;
      }
      const user = req.user!;
      const row = db.prepare('SELECT * FROM pads WHERE id = ?').get(req.params.id) as PadRow | undefined;
      if (!row) {
        sendError(res, 404, 'Kod bulunamadı', 'NOT_FOUND');
        return;
      }
      if (!canManagePad(user.role, user.id, row)) {
        sendError(res, 403, 'Bu koda erişim yetkiniz yok', 'FORBIDDEN');
        return;
      }

      const d = parsed.data;

      let nextCourseId: string | null | undefined = d.courseId;
      const nextTopicId: string | null | undefined = d.topicId;

      if (nextTopicId) {
        const topic = db.prepare('SELECT * FROM topics WHERE id = ?').get(nextTopicId) as TopicRow | undefined;
        if (!topic) {
          sendError(res, 400, 'Konu bulunamadı', 'INVALID_TOPIC');
          return;
        }
        if (nextCourseId !== undefined && nextCourseId !== null && nextCourseId !== topic.course_id) {
          sendError(res, 400, 'Konu ile ders uyuşmuyor', 'TOPIC_COURSE_MISMATCH');
          return;
        }
        nextCourseId = topic.course_id;
      }

      if (nextCourseId) {
        const course = db
          .prepare('SELECT * FROM courses WHERE id = ?')
          .get(nextCourseId) as CourseRow | undefined;
        if (!course) {
          sendError(res, 400, 'Ders bulunamadı', 'INVALID_COURSE');
          return;
        }
        if (user.role !== 'admin' && course.owner_id !== user.id) {
          sendError(res, 403, 'Bu derse erişim yetkiniz yok', 'FORBIDDEN');
          return;
        }
      }

      const updates: string[] = [];
      const values: Array<string | number | null> = [];
      let accessAffecting = false;

      if (d.title !== undefined) {
        updates.push('title = ?');
        values.push(d.title);
      }
      if (d.description !== undefined) {
        updates.push('description = ?');
        values.push(d.description);
      }
      if (d.language !== undefined) {
        updates.push('language = ?');
        values.push(d.language);
      }
      if (nextCourseId !== undefined) {
        updates.push('course_id = ?');
        values.push(nextCourseId);
      }
      if (nextTopicId !== undefined) {
        updates.push('topic_id = ?');
        values.push(nextTopicId);
      }
      if (d.editEnabled !== undefined) {
        updates.push('edit_enabled = ?');
        values.push(d.editEnabled ? 1 : 0);
        accessAffecting = true;
      }
      if (d.viewEnabled !== undefined) {
        updates.push('view_enabled = ?');
        values.push(d.viewEnabled ? 1 : 0);
        accessAffecting = true;
      }
      if (d.visibleInCourse !== undefined) {
        updates.push('visible_in_course = ?');
        values.push(d.visibleInCourse ? 1 : 0);
      }
      if (d.visibleFrom !== undefined) {
        updates.push('visible_from = ?');
        values.push(d.visibleFrom);
        accessAffecting = true;
      }
      if (d.expiresAt !== undefined) {
        updates.push('expires_at = ?');
        values.push(d.expiresAt);
        accessAffecting = true;
      }
      if (d.copyProtect !== undefined) {
        updates.push('copy_protect = ?');
        values.push(d.copyProtect ? 1 : 0);
        // copyProtect değişimi kanal değiştirir; erişim seviyesini etkilemez ama
        // kanal değişimi için bağlantıları kapatmamız gerekiyor (EK §E).
        accessAffecting = true;
      }

      if (d.password !== undefined) {
        if (d.password === null) {
          updates.push('password_hash = ?');
          values.push(null);
        } else {
          const hash = await hashPassword(d.password);
          updates.push('password_hash = ?');
          values.push(hash);
        }
        accessAffecting = true;
      }

      if (updates.length === 0) {
        res.json({ ok: true });
        return;
      }

      updates.push('updated_at = ?');
      values.push(Date.now());
      values.push(req.params.id);

      db.prepare(`UPDATE pads SET ${updates.join(', ')} WHERE id = ?`).run(...values);

      if (d.title !== undefined || d.language !== undefined) {
        await syncLiveMeta(req.params.id, { title: d.title, language: d.language });
      }

      if (accessAffecting) {
        notifyAccessChange(req.params.id);
      }

      const updated = db.prepare('SELECT * FROM pads WHERE id = ?').get(req.params.id) as PadRow;
      res.json({ pad: padFull(updated) });
    } catch (err) {
      next(err);
    }
  });

  // ---- DELETE /pads/:id ----
  router.delete('/pads/:id', (req, res) => {
    const user = req.user!;
    const row = db.prepare('SELECT * FROM pads WHERE id = ?').get(req.params.id) as PadRow | undefined;
    if (!row) {
      sendError(res, 404, 'Kod bulunamadı', 'NOT_FOUND');
      return;
    }
    if (!canManagePad(user.role, user.id, row)) {
      sendError(res, 403, 'Bu koda erişim yetkiniz yok', 'FORBIDDEN');
      return;
    }
    db.prepare('DELETE FROM pads WHERE id = ?').run(req.params.id);
    notifyAccessChange(req.params.id);
    res.json({ ok: true });
  });

  // ---- POST /pads/:id/duplicate ----
  router.post('/pads/:id/duplicate', (req, res) => {
    const user = req.user!;
    const src = db.prepare('SELECT * FROM pads WHERE id = ?').get(req.params.id) as PadRow | undefined;
    if (!src) {
      sendError(res, 404, 'Kod bulunamadı', 'NOT_FOUND');
      return;
    }
    if (!canManagePad(user.role, user.id, src)) {
      sendError(res, 403, 'Bu koda erişim yetkiniz yok', 'FORBIDDEN');
      return;
    }

    const id = newPadId();
    const now = Date.now();
    const editToken = newEditToken();
    const viewToken = newViewToken();
    const newTitle = `${src.title} (kopya)`.slice(0, 120);

    db.prepare(
      `INSERT INTO pads(id, owner_id, course_id, topic_id, title, description, language, sort_order,
                        edit_token, view_token, edit_enabled, view_enabled, visible_in_course,
                        visible_from, expires_at, password_hash, ydoc, content_text, line_count,
                        copy_protect, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?)`
    ).run(
      id,
      user.id,
      src.course_id,
      src.topic_id,
      newTitle,
      src.description,
      src.language,
      src.sort_order + 1,
      editToken,
      viewToken,
      src.visible_in_course,
      src.visible_from,
      src.content_text,
      src.line_count,
      src.copy_protect,
      now,
      now
    );

    const row = db.prepare('SELECT * FROM pads WHERE id = ?').get(id) as PadRow;
    res.status(201).json({ pad: padFull(row) });
  });

  // ---- POST /pads/:id/rotate-tokens ----
  router.post('/pads/:id/rotate-tokens', (req, res) => {
    const parsed = RotateTokensSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'which alanı edit|view|both olmalı', 'INVALID_INPUT');
      return;
    }
    const user = req.user!;
    const row = db.prepare('SELECT * FROM pads WHERE id = ?').get(req.params.id) as PadRow | undefined;
    if (!row) {
      sendError(res, 404, 'Kod bulunamadı', 'NOT_FOUND');
      return;
    }
    if (!canManagePad(user.role, user.id, row)) {
      sendError(res, 403, 'Bu koda erişim yetkiniz yok', 'FORBIDDEN');
      return;
    }

    const { which } = parsed.data;
    const updates: string[] = [];
    const values: Array<string | number> = [];

    if (which === 'edit' || which === 'both') {
      updates.push('edit_token = ?');
      values.push(newEditToken());
    }
    if (which === 'view' || which === 'both') {
      updates.push('view_token = ?');
      values.push(newViewToken());
    }
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(req.params.id);

    db.prepare(`UPDATE pads SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    notifyAccessChange(req.params.id);

    const updated = db.prepare('SELECT * FROM pads WHERE id = ?').get(req.params.id) as PadRow;
    res.json({ pad: padFull(updated) });
  });

  // ---- GET /pads/:id/download ----
  router.get('/pads/:id/download', (req, res) => {
    const user = req.user!;
    const row = db.prepare('SELECT * FROM pads WHERE id = ?').get(req.params.id) as PadRow | undefined;
    if (!row) {
      sendError(res, 404, 'Kod bulunamadı', 'NOT_FOUND');
      return;
    }
    if (!canManagePad(user.role, user.id, row)) {
      sendError(res, 403, 'Bu koda erişim yetkiniz yok', 'FORBIDDEN');
      return;
    }
    const ext = languageExtension(row.language);
    const filename = safeFilename(row.title, ext);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.send(row.content_text);
  });

  return router;
}