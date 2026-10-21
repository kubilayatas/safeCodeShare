// Hesapsız erişim uçları + korumalı SSE akışı.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { UnlockSchema, languageExtension } from '@safecodeshare/shared';
import type { PublicCourseInfo, PublicEditInfo, PublicViewInfo } from '@safecodeshare/shared';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { resolveAccess } from '../access/resolveAccess';
import type { PadAccessRow } from '../access/resolveAccess';
import {
  collectUnlockPadIds,
  parseCookieHeader,
  setUnlockCookie
} from '../util/cookies';
import { safeFilename } from '../util/filename';
import { sendError } from '../util/errors';
import { SESSION_COOKIE, findSession } from '../auth/sessions';
import { verifyPassword } from '../auth/passwords';
import {
  registerSubscriber,
  unregisterSubscriber,
  markDirty,
  type SSEWriter
} from '../protect/hub';

type CourseRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  view_token: string;
  page_enabled: number;
  default_copy_protect: number;
  sort_order: number;
  archived: number;
  created_at: number;
  updated_at: number;
};

type TopicRow = {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
  created_at: number;
};

function loadPadByViewToken(db: DB, viewToken: string): PadAccessRow | null {
  return (
    (db
      .prepare('SELECT * FROM pads WHERE view_token = ?')
      .get(viewToken) as PadAccessRow | undefined) ?? null
  );
}

function loadPadByEditToken(db: DB, editToken: string): PadAccessRow | null {
  return (
    (db
      .prepare('SELECT * FROM pads WHERE edit_token = ?')
      .get(editToken) as PadAccessRow | undefined) ?? null
  );
}

function loadPadRow(
  db: DB,
  id: string
): {
  title: string;
  language: string;
  content_text: string;
  line_count: number;
  updated_at: number;
  course_id: string | null;
} | null {
  return (
    (db
      .prepare(
        'SELECT title, language, content_text, line_count, updated_at, course_id FROM pads WHERE id = ?'
      )
      .get(id) as
      | {
          title: string;
          language: string;
          content_text: string;
          line_count: number;
          updated_at: number;
          course_id: string | null;
        }
      | undefined) ?? null
  );
}

function sessionUserFromReq(
  db: DB,
  cookies: Record<string, string> | undefined
): { id: string; role: 'admin' | 'teacher' } | null {
  const sid = cookies?.[SESSION_COOKIE];
  if (!sid) return null;
  const session = findSession(db, sid);
  if (!session) return null;
  const u = db
    .prepare('SELECT id, role FROM users WHERE id = ?')
    .get(session.user_id) as { id: string; role: 'admin' | 'teacher' } | undefined;
  return u ?? null;
}

export function publicRouter(db: DB, cfg: AppConfig): Router {
  const router = Router();

  const unlockLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: cfg.UNLOCK_RATE_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Çok fazla deneme', code: 'RATE_LIMIT' }
  });

  // ---- GET /api/public/view/:viewToken ----
  router.get('/public/view/:viewToken', (req, res) => {
    const row = loadPadByViewToken(db, req.params.viewToken);
    if (!row) {
      sendError(res, 404, 'Paylaşım bulunamadı', 'NOT_FOUND');
      return;
    }
    const cookies = req.cookies as Record<string, string> | undefined;
    const unlocked = collectUnlockPadIds(cookies, cfg.COOKIE_SECRET, row);
    const sessionUser = sessionUserFromReq(db, cookies);

    const access = resolveAccess(row, {
      sessionUser,
      token: req.params.viewToken,
      unlockedPadIds: unlocked,
      now: Date.now()
    });

    if (access.level === 'none') {
      const requiresPassword = access.reason === 'Şifre gerekli';
      res.status(403).json({
        error: access.reason ?? 'Bu paylaşıma erişilemiyor',
        code: requiresPassword ? 'PASSWORD_REQUIRED' : 'FORBIDDEN',
        requiresPassword,
        protected: row.copy_protect === 1
      });
      return;
    }

    const info = loadPadRow(db, row.id);
    if (!info) {
      sendError(res, 404, 'Paylaşım bulunamadı', 'NOT_FOUND');
      return;
    }

    let courseTitle: string | undefined;
    if (info.course_id) {
      const c = db.prepare('SELECT title FROM courses WHERE id = ?').get(info.course_id) as
        | { title: string }
        | undefined;
      courseTitle = c?.title;
    }

    const body: PublicViewInfo = {
      padId: row.id,
      title: info.title,
      language: info.language,
      courseTitle,
      requiresPassword: row.password_hash != null,
      protected: row.copy_protect === 1,
      locked: false,
      lineCount: info.line_count,
      updatedAt: info.updated_at
    };
    res.json(body);
  });

  // ---- GET /api/public/view/:viewToken/stream (SSE) ----
  router.get('/public/view/:viewToken/stream', (req, res) => {
    const row = loadPadByViewToken(db, req.params.viewToken);
    if (!row) {
      sendError(res, 404, 'Paylaşım bulunamadı', 'NOT_FOUND');
      return;
    }
    const cookies = req.cookies as Record<string, string> | undefined;
    const unlocked = collectUnlockPadIds(cookies, cfg.COOKIE_SECRET, row);
    const sessionUser = sessionUserFromReq(db, cookies);

    const access = resolveAccess(row, {
      sessionUser,
      token: req.params.viewToken,
      unlockedPadIds: unlocked,
      now: Date.now()
    });
    if (access.level === 'none') {
      sendError(res, 403, access.reason ?? 'Erişim yok', 'FORBIDDEN');
      return;
    }
    if (row.copy_protect !== 1) {
      sendError(
        res,
        409,
        'Bu payda kopyalama koruması kapalı; normal görüntüleyiciyi kullanın',
        'NOT_PROTECTED'
      );
      return;
    }

    // SSE başlıkları
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const writer: SSEWriter = {
      send: (chunk) => {
        try {
          res.write(chunk);
        } catch {
          /* yut */
        }
      },
      close: () => {
        try {
          res.end();
        } catch {
          /* yut */
        }
      }
    };

    // İlk dirty sinyali
    markDirty(row.id);
    registerSubscriber(row.id, writer);

    const ping = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        /* yut */
      }
    }, 20_000);
    ping.unref?.();

    const cleanup = (): void => {
      clearInterval(ping);
      unregisterSubscriber(row.id, writer);
    };

    req.on('close', cleanup);
    req.on('aborted', cleanup);
    res.on('close', cleanup);
  });

  // ---- POST /api/public/view/:viewToken/unlock ----
  router.post('/public/view/:viewToken/unlock', unlockLimiter, async (req, res) => {
    const row = loadPadByViewToken(db, req.params.viewToken as string);
    if (!row) {
      sendError(res, 404, 'Paylaşım bulunamadı', 'NOT_FOUND');
      return;
    }
    if (row.password_hash == null) {
      sendError(res, 400, 'Bu paylaşım şifreli değil', 'NOT_PASSWORD_PROTECTED');
      return;
    }
    if (row.view_enabled !== 1) {
      sendError(res, 403, 'Bu paylaşım kapalı', 'FORBIDDEN');
      return;
    }
    if (row.expires_at != null && row.expires_at < Date.now()) {
      sendError(res, 403, 'Bu paylaşımın süresi doldu', 'EXPIRED');
      return;
    }

    const parsed = UnlockSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'Şifre gerekli', 'INVALID_INPUT');
      return;
    }

    const ok = await verifyPassword(parsed.data.password, row.password_hash);
    if (!ok) {
      sendError(res, 401, 'Şifre hatalı', 'INVALID_PASSWORD');
      return;
    }

    setUnlockCookie(res, row.id, row.password_hash, cfg.COOKIE_SECRET, cfg.isProd);
    res.json({ ok: true });
  });

  // ---- GET /api/public/edit/:editToken ----
  router.get('/public/edit/:editToken', (req, res) => {
    const row = loadPadByEditToken(db, req.params.editToken);
    if (!row) {
      sendError(res, 404, 'Paylaşım bulunamadı', 'NOT_FOUND');
      return;
    }
    const access = resolveAccess(row, {
      sessionUser: null,
      token: req.params.editToken,
      unlockedPadIds: new Set<string>(),
      now: Date.now()
    });
    if (access.level !== 'edit' && access.level !== 'owner') {
      sendError(res, 403, access.reason ?? 'Düzenleme kapalı', 'FORBIDDEN');
      return;
    }
    const info = loadPadRow(db, row.id);
    if (!info) {
      sendError(res, 404, 'Paylaşım bulunamadı', 'NOT_FOUND');
      return;
    }
    const body: PublicEditInfo = {
      padId: row.id,
      title: info.title,
      language: info.language
    };
    res.json(body);
  });

  // ---- GET /api/public/view/:viewToken/raw ----
  router.get('/public/view/:viewToken/raw', (req, res) => {
    const row = loadPadByViewToken(db, req.params.viewToken);
    if (!row) {
      sendError(res, 404, 'Paylaşım bulunamadı', 'NOT_FOUND');
      return;
    }
    const cookies = req.cookies as Record<string, string> | undefined;
    const unlocked = collectUnlockPadIds(cookies, cfg.COOKIE_SECRET, row);

    const access = resolveAccess(row, {
      sessionUser: null,
      token: req.params.viewToken,
      unlockedPadIds: unlocked,
      now: Date.now()
    });
    if (access.level === 'none') {
      sendError(res, 403, access.reason ?? 'Erişim yok', 'FORBIDDEN');
      return;
    }
    if (row.copy_protect === 1) {
      sendError(res, 403, 'Bu kod kopyalamaya kapalıdır', 'COPY_PROTECTED');
      return;
    }
    const info = loadPadRow(db, row.id);
    if (!info) {
      sendError(res, 404, 'Paylaşım bulunamadı', 'NOT_FOUND');
      return;
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(info.content_text);
  });

  // ---- GET /api/public/view/:viewToken/download ----
  router.get('/public/view/:viewToken/download', (req, res) => {
    const row = loadPadByViewToken(db, req.params.viewToken);
    if (!row) {
      sendError(res, 404, 'Paylaşım bulunamadı', 'NOT_FOUND');
      return;
    }
    const cookies = req.cookies as Record<string, string> | undefined;
    const unlocked = collectUnlockPadIds(cookies, cfg.COOKIE_SECRET, row);

    const access = resolveAccess(row, {
      sessionUser: null,
      token: req.params.viewToken,
      unlockedPadIds: unlocked,
      now: Date.now()
    });
    if (access.level === 'none') {
      sendError(res, 403, access.reason ?? 'Erişim yok', 'FORBIDDEN');
      return;
    }
    if (row.copy_protect === 1) {
      sendError(res, 403, 'Bu kod kopyalamaya kapalıdır', 'COPY_PROTECTED');
      return;
    }
    const info = loadPadRow(db, row.id);
    if (!info) {
      sendError(res, 404, 'Paylaşım bulunamadı', 'NOT_FOUND');
      return;
    }
    const ext = languageExtension(info.language);
    const filename = safeFilename(info.title, ext);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.send(info.content_text);
  });

  // ---- GET /api/public/course/:courseViewToken ----
  router.get('/public/course/:courseViewToken', (req, res) => {
    const course = db
      .prepare('SELECT * FROM courses WHERE view_token = ?')
      .get(req.params.courseViewToken) as CourseRow | undefined;
    if (!course) {
      sendError(res, 404, 'Ders bulunamadı', 'NOT_FOUND');
      return;
    }
    if (course.page_enabled !== 1) {
      res.status(403).json({ error: 'Bu ders sayfası kapalı', code: 'PAGE_DISABLED' });
      return;
    }

    const now = Date.now();
    const topics = db
      .prepare('SELECT * FROM topics WHERE course_id = ? ORDER BY sort_order, created_at')
      .all(course.id) as TopicRow[];

    const padRows = db
      .prepare('SELECT * FROM pads WHERE course_id = ? ORDER BY sort_order, created_at')
      .all(course.id) as Array<
      PadAccessRow & {
        title: string;
        language: string;
        updated_at: number;
        line_count: number;
        course_id: string | null;
        topic_id: string | null;
      }
    >;

    const visiblePads = padRows.filter((p) => {
      if (p.view_enabled !== 1) return false;
      if (p.visible_from != null && p.visible_from > now) return false;
      if (p.expires_at != null && p.expires_at < now) return false;
      return true;
    });

    const padsByTopic = new Map<string, typeof visiblePads>();
    const loosePads: typeof visiblePads = [];
    for (const p of visiblePads) {
      if (p.topic_id) {
        const arr = padsByTopic.get(p.topic_id) ?? [];
        arr.push(p);
        padsByTopic.set(p.topic_id, arr);
      } else {
        loosePads.push(p);
      }
    }

    const body: PublicCourseInfo = {
      course: { title: course.title, description: course.description },
      topics: topics.map((t) => ({
        title: t.title,
        pads: (padsByTopic.get(t.id) ?? []).map((p) => ({
          title: p.title,
          language: p.language,
          viewToken: p.view_token,
          updatedAt: p.updated_at,
          lineCount: p.line_count,
          hasPassword: p.password_hash != null,
          copyProtect: p.copy_protect === 1
        }))
      })),
      loosePads: loosePads.map((p) => ({
        title: p.title,
        language: p.language,
        viewToken: p.view_token,
        updatedAt: p.updated_at,
        lineCount: p.line_count,
        hasPassword: p.password_hash != null,
        copyProtect: p.copy_protect === 1
      }))
    };
    res.json(body);
  });

  return router;
}

export const __test_parseCookieHeader = parseCookieHeader;