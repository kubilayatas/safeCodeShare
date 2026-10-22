// POST /api/format — dile özgü biçimlendirme.
// Erişim: oturum sahibi VEYA X-Edit-Token header'ında geçerli ve aktif edit token.
import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { FormatSchema } from '@safecodeshare/shared';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { format, FormatError } from '../format';
import { getEntitlements } from '../account/entitlements';
import { sendError } from '../util/errors';
import { tReq } from '../i18n';

type EditTokenRow = {
  id: string;
  owner_id: string;
  edit_enabled: number;
  expires_at: number | null;
};

export function formatRouter(db: DB, cfg: AppConfig): Router {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: cfg.FORMAT_RATE_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: (req: Request) => ({ error: tReq(req, 'Çok sık biçimlendirme isteği'), code: 'RATE_LIMIT' })
  });

  router.post('/format', limiter, async (req, res) => {
    // Erişim kontrolü
    let planOwnerId: string;
    if (req.user) {
      planOwnerId = req.user.id;
    } else {
      const token = req.header('x-edit-token');
      if (!token) {
        sendError(res, 401, 'Giriş yapmalı veya geçerli edit token sağlamalısınız', 'UNAUTHORIZED');
        return;
      }
      const row = db
        .prepare('SELECT id, owner_id, edit_enabled, expires_at FROM pads WHERE edit_token = ?')
        .get(token) as EditTokenRow | undefined;
      if (!row || row.edit_enabled !== 1) {
        sendError(res, 403, 'Bu edit token geçerli değil', 'FORBIDDEN');
        return;
      }
      if (row.expires_at != null && row.expires_at < Date.now()) {
        sendError(res, 403, 'Bu paylaşımın süresi doldu', 'EXPIRED');
        return;
      }
      planOwnerId = row.owner_id;
    }
    const ent = getEntitlements(db, planOwnerId);
    if (!ent.unlimited && !ent.limits.beautify) {
      sendError(res, 403, 'Kod biçimlendirme bu planda yok.', 'PLAN_LIMIT');
      return;
    }

    const parsed = FormatSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, 'Geçersiz biçimlendirme isteği', 'INVALID_INPUT');
      return;
    }

    const { language, code, tabWidth, useTabs } = parsed.data;

    // 1 MB sınır
    if (Buffer.byteLength(code, 'utf8') > 1024 * 1024) {
      sendError(res, 413, 'Kod 1 MB sınırını aşıyor', 'PAYLOAD_TOO_LARGE');
      return;
    }

    try {
      const formatted = await format(language, code, {
        tabWidth: tabWidth ?? 2,
        useTabs: useTabs ?? false
      });
      res.json({ code: formatted });
    } catch (err) {
      if (err instanceof FormatError) {
        // Bilinen mesajlar çevrilir; biçimlendiricinin kendi (İngilizce) hata metni olduğu gibi kalır.
        res.status(422).json({
          error: tReq(req, err.message),
          ...(err.line != null ? { line: err.line } : {}),
          ...(err.column != null ? { column: err.column } : {})
        });
        return;
      }
      const msg = err instanceof Error ? err.message : tReq(req, 'Biçimlendirme başarısız');
      res.status(422).json({ error: msg.slice(0, 300) });
    }
  });

  return router;
}