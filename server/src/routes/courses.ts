import { Router } from 'express';
import archiver from 'archiver';
import {
  CreateCourseSchema,
  ReorderSchema,
  UpdateCourseSchema,
  languageExtension
} from '@safecodeshare/shared';
import type { TreeCourse, TreeResponse } from '@safecodeshare/shared';
import type { DB } from '../db';
import { requireAuth } from '../auth/middleware';
import { sendError } from '../util/errors';
import { newCourseViewToken, randomId } from '../util/tokens';
import { safeFilename, safeSlug } from '../util/filename';
import { padSummary } from '../util/rows';
import type { CourseRow, PadRow, TopicRow } from '../util/rows';

export function coursesRouter(db: DB): Router {
  const router = Router();
  router.use(['/courses', '/tree', '/reorder'], requireAuth());

  // ---- GET /tree ----
  router.get('/tree', (req, res) => {
    const user = req.user!;
    const isAdmin = user.role === 'admin';

    const courseRows = (
      isAdmin
        ? db.prepare('SELECT * FROM courses WHERE archived = 0 ORDER BY sort_order, created_at').all()
        : db
            .prepare('SELECT * FROM courses WHERE owner_id = ? AND archived = 0 ORDER BY sort_order, created_at')
            .all(user.id)
    ) as CourseRow[];

    const topicRows = db.prepare('SELECT * FROM topics ORDER BY sort_order, created_at').all() as TopicRow[];

    const padRows = (
      isAdmin
        ? db.prepare('SELECT * FROM pads ORDER BY sort_order, created_at').all()
        : db.prepare('SELECT * FROM pads WHERE owner_id = ? ORDER BY sort_order, created_at').all(user.id)
    ) as PadRow[];

    const courseIds = new Set(courseRows.map((c) => c.id));

    const topicsByCourse = new Map<string, TopicRow[]>();
    for (const t of topicRows) {
      if (!courseIds.has(t.course_id)) continue;
      const arr = topicsByCourse.get(t.course_id) ?? [];
      arr.push(t);
      topicsByCourse.set(t.course_id, arr);
    }

    const padsByTopic = new Map<string, PadRow[]>();
    const loosePadsByCourse = new Map<string, PadRow[]>();
    const unassigned: PadRow[] = [];

    for (const p of padRows) {
      if (p.topic_id) {
        const arr = padsByTopic.get(p.topic_id) ?? [];
        arr.push(p);
        padsByTopic.set(p.topic_id, arr);
      } else if (p.course_id && courseIds.has(p.course_id)) {
        const arr = loosePadsByCourse.get(p.course_id) ?? [];
        arr.push(p);
        loosePadsByCourse.set(p.course_id, arr);
      } else {
        unassigned.push(p);
      }
    }

    const result: TreeResponse = {
      courses: courseRows.map<TreeCourse>((c) => ({
        course: {
          id: c.id,
          ownerId: c.owner_id,
          title: c.title,
          description: c.description,
          viewToken: c.view_token,
          pageEnabled: !!c.page_enabled,
          defaultCopyProtect: !!c.default_copy_protect,
          sortOrder: c.sort_order,
          archived: !!c.archived,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        },
        topics: (topicsByCourse.get(c.id) ?? []).map((t) => ({
          topic: {
            id: t.id,
            courseId: t.course_id,
            title: t.title,
            sortOrder: t.sort_order,
            createdAt: t.created_at
          },
          pads: (padsByTopic.get(t.id) ?? []).map(padSummary)
        })),
        loosePads: (loosePadsByCourse.get(c.id) ?? []).map(padSummary)
      })),
      unassigned: unassigned.map(padSummary)
    };

    res.json(result);
  });

  // ---- POST /courses ----
  router.post('/courses', (req, res) => {
    const parsed = CreateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'Başlık gerekli ve en fazla 80 karakter olmalı', 'INVALID_INPUT');
      return;
    }
    const user = req.user!;
    const id = randomId(16);
    const now = Date.now();
    const viewToken = newCourseViewToken();
    const { title, description } = parsed.data;

    const maxSort = db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM courses WHERE owner_id = ?')
      .get(user.id) as { m: number };

    db.prepare(
      `INSERT INTO courses(id, owner_id, title, description, view_token, page_enabled, default_copy_protect,
                            sort_order, archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, 1, ?, 0, ?, ?)`
    ).run(id, user.id, title, description ?? '', viewToken, maxSort.m + 1, now, now);

    const row = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as CourseRow;
    res.status(201).json({
      course: {
        id: row.id,
        ownerId: row.owner_id,
        title: row.title,
        description: row.description,
        viewToken: row.view_token,
        pageEnabled: !!row.page_enabled,
        defaultCopyProtect: !!row.default_copy_protect,
        sortOrder: row.sort_order,
        archived: !!row.archived,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  });

  // ---- PATCH /courses/:id ----
  router.patch('/courses/:id', (req, res) => {
    const parsed = UpdateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'Geçersiz alanlar', 'INVALID_INPUT');
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

    const updates: string[] = [];
    const values: Array<string | number> = [];
    const d = parsed.data;

    if (d.title !== undefined) {
      updates.push('title = ?');
      values.push(d.title);
    }
    if (d.description !== undefined) {
      updates.push('description = ?');
      values.push(d.description);
    }
    if (d.pageEnabled !== undefined) {
      updates.push('page_enabled = ?');
      values.push(d.pageEnabled ? 1 : 0);
    }
    if (d.archived !== undefined) {
      updates.push('archived = ?');
      values.push(d.archived ? 1 : 0);
    }
    if (d.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(d.sortOrder);
    }
    if (d.defaultCopyProtect !== undefined) {
      updates.push('default_copy_protect = ?');
      values.push(d.defaultCopyProtect ? 1 : 0);
    }

    if (updates.length === 0) {
      res.json({ ok: true });
      return;
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(req.params.id);

    db.prepare(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ ok: true });
  });

  // ---- DELETE /courses/:id ----
  router.delete('/courses/:id', (req, res) => {
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

    db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // ---- POST /courses/:id/rotate-token ----
  router.post('/courses/:id/rotate-token', (req, res) => {
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

    const newToken = newCourseViewToken();
    db.prepare('UPDATE courses SET view_token = ?, updated_at = ? WHERE id = ?').run(
      newToken,
      Date.now(),
      req.params.id
    );
    res.json({ viewToken: newToken });
  });

  // ---- POST /reorder ----
  router.post('/reorder', (req, res) => {
    const parsed = ReorderSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'Geçersiz sıralama isteği', 'INVALID_INPUT');
      return;
    }
    const user = req.user!;
    const { kind, ids } = parsed.data;
    const now = Date.now();

    const tx = db.transaction(() => {
      ids.forEach((id, index) => {
        if (kind === 'course') {
          const row = db.prepare('SELECT owner_id FROM courses WHERE id = ?').get(id) as
            | { owner_id: string }
            | undefined;
          if (!row) return;
          if (user.role !== 'admin' && row.owner_id !== user.id) return;
          db.prepare('UPDATE courses SET sort_order = ?, updated_at = ? WHERE id = ?').run(index, now, id);
        } else if (kind === 'topic') {
          const row = db
            .prepare(
              'SELECT c.owner_id AS owner_id FROM topics t JOIN courses c ON c.id = t.course_id WHERE t.id = ?'
            )
            .get(id) as { owner_id: string } | undefined;
          if (!row) return;
          if (user.role !== 'admin' && row.owner_id !== user.id) return;
          db.prepare('UPDATE topics SET sort_order = ? WHERE id = ?').run(index, id);
        } else {
          const row = db.prepare('SELECT owner_id FROM pads WHERE id = ?').get(id) as
            | { owner_id: string }
            | undefined;
          if (!row) return;
          if (user.role !== 'admin' && row.owner_id !== user.id) return;
          db.prepare('UPDATE pads SET sort_order = ?, updated_at = ? WHERE id = ?').run(index, now, id);
        }
      });
    });

    tx();
    res.json({ ok: true });
  });

  // ---- GET /courses/:id/export.zip ----
  // Ders → Konu → Pad hiyerarşisini zip olarak indirir.
  // Dosya adları güvenli slug olarak üretilir (Türkçe karakter dönüşümü dahil).
  router.get('/courses/:id/export.zip', async (req, res, next) => {
    try {
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

      const topics = db
        .prepare('SELECT * FROM topics WHERE course_id = ? ORDER BY sort_order, created_at')
        .all(course.id) as TopicRow[];

      const pads = db
        .prepare('SELECT * FROM pads WHERE course_id = ? ORDER BY sort_order, created_at')
        .all(course.id) as PadRow[];

      const padsByTopic = new Map<string, PadRow[]>();
      const loosePads: PadRow[] = [];
      for (const p of pads) {
        if (p.topic_id) {
          const arr = padsByTopic.get(p.topic_id) ?? [];
          arr.push(p);
          padsByTopic.set(p.topic_id, arr);
        } else {
          loosePads.push(p);
        }
      }

      const zipName = `${safeSlug(course.title)}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`
      );

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => next(err));
      archive.pipe(res);

      const usedNames = new Set<string>();
      function uniqueName(dir: string, base: string): string {
        let name = base;
        let i = 2;
        while (usedNames.has(`${dir}/${name}`)) {
          const dot = base.lastIndexOf('.');
          name = dot > 0 ? `${base.slice(0, dot)}-${i}${base.slice(dot)}` : `${base}-${i}`;
          i += 1;
        }
        usedNames.add(`${dir}/${name}`);
        return name;
      }

      for (const t of topics) {
        const dir = safeSlug(t.title) || `konu-${t.id.slice(0, 6)}`;
        const list = padsByTopic.get(t.id) ?? [];
        for (const p of list) {
          const base = safeFilename(p.title, languageExtension(p.language));
          const name = uniqueName(dir, base);
          archive.append(p.content_text.length > 0 ? p.content_text : '\n', {
            name: `${dir}/${name}`
          });
        }
      }

      if (loosePads.length > 0) {
        const dir = 'konusuz';
        for (const p of loosePads) {
          const base = safeFilename(p.title, languageExtension(p.language));
          const name = uniqueName(dir, base);
          archive.append(p.content_text.length > 0 ? p.content_text : '\n', {
            name: `${dir}/${name}`
          });
        }
      }

      await archive.finalize();
    } catch (err) {
      next(err);
    }
  });

  return router;
}