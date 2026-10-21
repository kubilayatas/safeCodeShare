// Sürüm geçmişi uçları: liste, içerik, manuel oluştur, geri yükle, kopya.
//
// Erişim:
// - Oturum sahibi (pad sahibi veya admin) tam yetkili.
// - X-Edit-Token başlığı ile gelen: pad.edit_enabled=1 olmalı.
// - Diğer: 401/403.

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { CreateVersionSchema, languageExtension } from '@safecodeshare/shared';
import type { VersionFull, VersionSummary } from '@safecodeshare/shared';
import type { DB } from '../db';
import { sendError } from '../util/errors';
import { newEditToken, newPadId, newViewToken } from '../util/tokens';
import { getCollabServer } from '../collab/singleton';
import { applyTextDiff } from '../collab/directEdit';
import { notifyAccessChange } from '../collab/accessNotify';
import type { PadRow } from '../util/rows';
import { safeFilename } from '../util/filename';

type VersionRow = {
  id: number;
  pad_id: string;
  content_text: string;
  ydoc: Buffer;
  language: string;
  label: string | null;
  is_auto: number;
  created_by: string | null;
  created_at: number;
};


// İsteğe bağlı olarak oturum sahibini veya edit token'ı doğrulayarak pad'i yükler.
function loadPadForAccess(req: Request, db: DB): PadRow | { error: number; msg: string } {
  const padId = req.params.id;

  // Oturum sahibi yolu
  if (req.user) {
    const row = db.prepare('SELECT * FROM pads WHERE id = ?').get(padId) as PadRow | undefined;
    if (!row) return { error: 404, msg: 'Kod bulunamadı' };
    if (req.user.role !== 'admin' && row.owner_id !== req.user.id) {
      return { error: 403, msg: 'Bu koda erişim yetkiniz yok' };
    }
    return row;
  }

  // Edit token yolu
  const token = req.header('x-edit-token');
  if (!token) return { error: 401, msg: 'Giriş yapmalı veya geçerli edit token sağlamalısınız' };
  const row = db
    .prepare('SELECT * FROM pads WHERE id = ? AND edit_token = ?')
    .get(padId, token) as PadRow | undefined;
  if (!row) return { error: 403, msg: 'Edit token bu koda ait değil' };
  if (row.edit_enabled !== 1) return { error: 403, msg: 'Düzenleme kapalı' };
  if (row.expires_at != null && row.expires_at < Date.now()) {
    return { error: 403, msg: 'Bu paylaşımın süresi doldu' };
  }
  return row;
}

function toSummary(v: VersionRow): VersionSummary {
  return {
    id: v.id,
    padId: v.pad_id,
    label: v.label,
    isAuto: v.is_auto === 1,
    language: v.language,
    createdBy: v.created_by,
    createdAt: v.created_at
  };
}

function toFull(v: VersionRow): VersionFull {
  return { ...toSummary(v), contentText: v.content_text };
}

export function versionsRouter(db: DB): Router {
  const router = Router();

  // ---- GET /api/pads/:id/versions ----
  router.get('/pads/:id/versions', (req: Request, res: Response) => {
    const access = loadPadForAccess(req, db);
    if ('error' in access) {
      sendError(res, access.error, access.msg, 'FORBIDDEN');
      return;
    }
    const rows = db
      .prepare(
        'SELECT * FROM pad_versions WHERE pad_id = ? ORDER BY created_at DESC LIMIT 500'
      )
      .all(access.id) as VersionRow[];
    res.json({ versions: rows.map(toSummary) });
  });

  // ---- GET /api/pads/:id/versions/:vid ----
  router.get('/pads/:id/versions/:vid', (req: Request, res: Response) => {
    const access = loadPadForAccess(req, db);
    if ('error' in access) {
      sendError(res, access.error, access.msg, 'FORBIDDEN');
      return;
    }
    const vid = Number(req.params.vid);
    if (!Number.isInteger(vid)) {
      sendError(res, 400, 'Geçersiz sürüm id', 'INVALID_INPUT');
      return;
    }
    const row = db
      .prepare('SELECT * FROM pad_versions WHERE id = ? AND pad_id = ?')
      .get(vid, access.id) as VersionRow | undefined;
    if (!row) {
      sendError(res, 404, 'Sürüm bulunamadı', 'NOT_FOUND');
      return;
    }
    res.json({ version: toFull(row) });
  });

  // ---- POST /api/pads/:id/versions ----
  router.post('/pads/:id/versions', (req: Request, res: Response) => {
    const access = loadPadForAccess(req, db);
    if ('error' in access) {
      sendError(res, access.error, access.msg, 'FORBIDDEN');
      return;
    }
    const parsed = CreateVersionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendError(res, 400, 'Geçersiz etiket', 'INVALID_INPUT');
      return;
    }

    const now = Date.now();
    const content = access.content_text;
    const ydoc = access.ydoc ?? Buffer.alloc(0);
    const createdBy = req.user?.id ?? null;

    const info = db
      .prepare(
        `INSERT INTO pad_versions(pad_id, content_text, ydoc, language, label, is_auto, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .run(access.id, content, ydoc, access.language, parsed.data.label ?? null, createdBy, now);

    const inserted = db
      .prepare('SELECT * FROM pad_versions WHERE id = ?')
      .get(info.lastInsertRowid as number) as VersionRow;

    res.status(201).json({ version: toFull(inserted) });
  });

  // ---- POST /api/pads/:id/versions/:vid/restore ----
  // 1) Mevcut hali "Geri yükleme öncesi" etiketiyle manuel sürüm olarak kaydedilir.
  // 2) Sürüm içeriği fast-diff ile dokümanına uygulanır (açık istemciler anında görür).
  router.post('/pads/:id/versions/:vid/restore', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const access = loadPadForAccess(req, db);
      if ('error' in access) {
        sendError(res, access.error, access.msg, 'FORBIDDEN');
        return;
      }
      const vid = Number(req.params.vid);
      if (!Number.isInteger(vid)) {
        sendError(res, 400, 'Geçersiz sürüm id', 'INVALID_INPUT');
        return;
      }
      const target = db
        .prepare('SELECT * FROM pad_versions WHERE id = ? AND pad_id = ?')
        .get(vid, access.id) as VersionRow | undefined;
      if (!target) {
        sendError(res, 404, 'Sürüm bulunamadı', 'NOT_FOUND');
        return;
      }

      const now = Date.now();
      const createdBy = req.user?.id ?? null;

      // 1) Mevcut hali kaydet
      db.prepare(
        `INSERT INTO pad_versions(pad_id, content_text, ydoc, language, label, is_auto, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
      ).run(
        access.id,
        access.content_text,
        access.ydoc ?? Buffer.alloc(0),
        access.language,
        'Geri yükleme öncesi',
        createdBy,
        now
      );

      // 2) Hedef sürümün Yjs durumunu doğrudan dokümana uygula (varsa)
      const collab = getCollabServer();
      if (collab) {
        try {
          await applyTextDiff(
            collab as unknown as Parameters<typeof applyTextDiff>[0],
            access.id,
            target.content_text
          );
        } catch (err) {
          console.warn(`[versions] direct edit hatası (${access.id}):`, err);
        }
      }

      // 3) DB'yi hemen güncelle (onStoreDocument debounce beklemeden, hızlı görünürlük için)
      db.prepare(
        'UPDATE pads SET content_text = ?, updated_at = ? WHERE id = ?'
      ).run(target.content_text, now, access.id);

      // Öğretmen dokümanı da kapat: dil değişimi yoksa gerek yok ama tutarlılık için işaretle
      notifyAccessChange(access.id);

      res.json({ ok: true, restoredFrom: target.id });
    } catch (err) {
      next(err);
    }
  });

  // ---- POST /api/pads/:id/versions/:vid/duplicate ----
  // Sürüm içeriğini yeni bir pad olarak oluşturur (yeni token'lar).
  router.post('/pads/:id/versions/:vid/duplicate', (req: Request, res: Response) => {
    const access = loadPadForAccess(req, db);
    if ('error' in access) {
      sendError(res, access.error, access.msg, 'FORBIDDEN');
      return;
    }
    const vid = Number(req.params.vid);
    const v = db
      .prepare('SELECT * FROM pad_versions WHERE id = ? AND pad_id = ?')
      .get(vid, access.id) as VersionRow | undefined;
    if (!v) {
      sendError(res, 404, 'Sürüm bulunamadı', 'NOT_FOUND');
      return;
    }

    const owner = access.owner_id;
    const id = newPadId();
    const now = Date.now();
    const editToken = newEditToken();
    const viewToken = newViewToken();
    const newTitle = `${access.title} — sürüm ${new Date(v.created_at).toLocaleString('tr-TR')}`.slice(
      0,
      120
    );
    const content = v.content_text;
    const lineCount = content.length === 0 ? 0 : content.split('\n').length;

    db.prepare(
      `INSERT INTO pads(id, owner_id, course_id, topic_id, title, description, language, sort_order,
                        edit_token, view_token, edit_enabled, view_enabled, visible_in_course,
                        visible_from, expires_at, password_hash, ydoc, content_text, line_count,
                        copy_protect, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, 1, 1, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)`
    ).run(
      id,
      owner,
      access.course_id,
      access.topic_id,
      newTitle,
      access.description,
      v.language,
      editToken,
      viewToken,
      content,
      lineCount,
      access.copy_protect,
      now,
      now
    );

    res.status(201).json({
      pad: {
        id,
        title: newTitle,
        language: v.language,
        editToken,
        viewToken
      }
    });
  });

  // ---- GET /api/pads/:id/versions/:vid/download ----
  router.get('/pads/:id/versions/:vid/download', (req: Request, res: Response) => {
    const access = loadPadForAccess(req, db);
    if ('error' in access) {
      sendError(res, access.error, access.msg, 'FORBIDDEN');
      return;
    }
    const vid = Number(req.params.vid);
    const v = db
      .prepare('SELECT * FROM pad_versions WHERE id = ? AND pad_id = ?')
      .get(vid, access.id) as VersionRow | undefined;
    if (!v) {
      sendError(res, 404, 'Sürüm bulunamadı', 'NOT_FOUND');
      return;
    }
    const ext = languageExtension(v.language);
    const filename = safeFilename(`${access.title}-v${v.id}`, ext);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.send(v.content_text);
  });

  return router;
}