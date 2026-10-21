// POST /api/format — dile özgü biçimlendirme.
// Erişim: oturum sahibi VEYA X-Edit-Token header'ında geçerli ve aktif edit token.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { FormatSchema } from '@safecodeshare/shared';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { format, FormatError } from '../format';
import { getEntitlements } from '../account/entitlements';

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
    message: { error: 'Çok sık biçimlendirme isteği', code: 'RATE_LIMIT' }
  });

  router.post('/format', limiter, async (req, res) => {
    // Erişim kontrolü
    let planOwnerId: string;
    if (req.user) {
      planOwnerId = req.user.id;
    } else {
      const token = req.header('x-edit-token');
      if (!token) {
        res.status(401).json({ error: 'Giriş yapmalı veya geçerli edit token sağlamalısınız', code: 'UNAUTHORIZED' });
        return;
      }
      const row = db
        .prepare('SELECT id, owner_id, edit_enabled, expires_at FROM pads WHERE edit_token = ?')
        .get(token) as EditTokenRow | undefined;
      if (!row || row.edit_enabled !== 1) {
        res.status(403).json({ error: 'Bu edit token geçerli değil', code: 'FORBIDDEN' });
        return;
      }
      if (row.expires_at != null && row.expires_at < Date.now()) {
        res.status(403).json({ error: 'Bu paylaşımın süresi doldu', code: 'EXPIRED' });
        return;
      }
      planOwnerId = row.owner_id;
    }
    const ent = getEntitlements(db, planOwnerId);
    if (!ent.unlimited && !ent.limits.beautify) {
      res.status(403).json({ error: 'Kod biçimlendirme bu planda yok.', code: 'PLAN_LIMIT' });
      return;
    }

    const parsed = FormatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Geçersiz biçimlendirme isteği', code: 'INVALID_INPUT' });
      return;
    }

    const { language, code, tabWidth, useTabs } = parsed.data;

    // 1 MB sınır
    if (Buffer.byteLength(code, 'utf8') > 1024 * 1024) {
      res.status(413).json({ error: 'Kod 1 MB sınırını aşıyor', code: 'PAYLOAD_TOO_LARGE' });
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
        res.status(422).json({
          error: err.message,
          ...(err.line != null ? { line: err.line } : {}),
          ...(err.column != null ? { column: err.column } : {})
        });
        return;
      }
      const msg = err instanceof Error ? err.message : 'Biçimlendirme başarısız';
      res.status(422).json({ error: msg.slice(0, 300) });
    }
  });

  return router;
}