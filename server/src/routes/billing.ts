// Ödeme uçları (Lemon Squeezy).
//   GET  /api/billing/config    → planlar sayfası: ödeme açık mı, fiyatlar
//   POST /api/billing/checkout  → ödeme sayfası adresi (giriş gerekli)
//   GET  /api/billing/portal    → abonelik yönetim sayfası adresi (giriş gerekli)
//   POST /api/billing/webhook   → Lemon Squeezy bildirimleri (ham gövde, imzalı)
import express, { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import type { BillingConfig, BillingInterval } from '@safecodeshare/shared';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { requireAuth } from '../auth/middleware';
import { sendError } from '../util/errors';
import { tReq } from '../i18n';
import {
  BillingApiError,
  billingEnabled,
  createCheckout,
  getCustomerPortalUrl,
  getStoreCurrency,
  getVariantPrice,
  variantFor
} from '../billing/lemonsqueezy';
import { applyWebhook, latestSubscription, logBillingEvent, toBillingInfo, verifySignature } from '../billing/subscriptions';
import { notifyAccessChange } from '../collab/accessNotify';

const PRICE_CACHE_MS = 15 * 60 * 1000;

// Webhook: express.json'dan ÖNCE bağlanmalı (imza ham gövde üzerinden hesaplanır).
export function billingWebhookHandler(db: DB, cfg: AppConfig) {
  return [
    express.raw({ type: '*/*', limit: '1mb' }),
    (req: Request, res: Response): void => {
      const secret = cfg.LEMONSQUEEZY_WEBHOOK_SECRET;
      if (!secret) {
        res.status(503).json({ error: 'billing disabled', code: 'BILLING_DISABLED' });
        return;
      }
      const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (!verifySignature(raw, req.get('X-Signature'), secret)) {
        res.status(401).json({ error: 'invalid signature', code: 'INVALID_SIGNATURE' });
        return;
      }
      let body: unknown;
      try {
        body = JSON.parse(raw.toString('utf8'));
      } catch {
        res.status(400).json({ error: 'invalid json', code: 'INVALID_INPUT' });
        return;
      }
      const eventName = String((body as { meta?: { event_name?: unknown } })?.meta?.event_name ?? 'unknown');
      try {
        const out = applyWebhook(db, cfg, body);
        logBillingEvent(db, eventName, out.subscriptionId ?? null, out.result, raw.toString('utf8'));
        if (out.result === 'unlinked') {
          console.warn(`[billing] ${eventName}: abonelik ${out.subscriptionId} hiçbir hesaba bağlanamadı (custom_data.user_id yok).`);
        }
        // Pro bitti/başladıysa öğretmenin açık paylaşımları yeni haklara göre yeniden değerlendirilsin.
        if (out.result === 'applied' && out.userId) {
          const pads = db.prepare('SELECT id FROM pads WHERE owner_id = ?').all(out.userId) as Array<{ id: string }>;
          for (const p of pads) notifyAccessChange(p.id);
        }
        res.json({ ok: true, result: out.result });
      } catch (err) {
        // 500 dönersek Lemon Squeezy tekrar dener.
        console.error('[billing] webhook işlenemedi:', err);
        logBillingEvent(db, eventName, null, 'error', raw.toString('utf8'));
        res.status(500).json({ error: 'processing failed', code: 'INTERNAL' });
      }
    }
  ];
}

export function billingRouter(db: DB, cfg: AppConfig): Router {
  const router = Router();
  let cache: { at: number; value: BillingConfig } | null = null;

  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: (req: Request) => ({ error: tReq(req, 'Çok fazla deneme'), code: 'RATE_LIMIT' })
  });

  const handleApiError = (res: Response, err: unknown): void => {
    console.error('[billing]', err instanceof BillingApiError ? err.message : err);
    sendError(res, 502, 'Ödeme sağlayıcısına şu anda ulaşılamıyor. Lütfen biraz sonra tekrar deneyin.', 'BILLING_UNAVAILABLE');
  };

  router.get('/billing/config', async (_req, res) => {
    if (!billingEnabled(cfg)) {
      res.json({ enabled: false, intervals: [], currency: 'USD', prices: { month: null, year: null } } satisfies BillingConfig);
      return;
    }
    if (cache && Date.now() - cache.at < PRICE_CACHE_MS) {
      res.json(cache.value);
      return;
    }
    const value: BillingConfig = {
      enabled: true,
      intervals: (['month', 'year'] as const).filter((i) => Boolean(variantFor(cfg, i))),
      currency: 'USD',
      prices: { month: null, year: null }
    };
    try {
      value.currency = await getStoreCurrency(cfg);
      for (const interval of ['month', 'year'] as const) {
        const v = variantFor(cfg, interval);
        if (v) value.prices[interval] = await getVariantPrice(cfg, v);
      }
      cache = { at: Date.now(), value };
    } catch (err) {
      // Fiyat okunamasa da satın alma düğmeleri çalışır; fiyatı ödeme sayfası gösterir.
      console.error('[billing] fiyatlar okunamadı:', err instanceof Error ? err.message : err);
    }
    res.json(value);
  });

  router.post('/billing/checkout', requireAuth(), limiter, async (req, res) => {
    const user = req.user!;
    if (!billingEnabled(cfg)) {
      sendError(res, 503, 'Ödeme sistemi henüz yapılandırılmadı', 'BILLING_DISABLED');
      return;
    }
    if (user.role === 'admin') {
      sendError(res, 400, 'Yönetici hesaplarında sınır yoktur; abonelik gerekmez', 'NOT_NEEDED');
      return;
    }
    const interval = (req.body as { interval?: unknown } | undefined)?.interval;
    const variant = interval === 'month' || interval === 'year' ? variantFor(cfg, interval as BillingInterval) : undefined;
    if (!variant) {
      sendError(res, 400, 'Geçersiz ödeme dönemi', 'INVALID_INPUT');
      return;
    }
    const current = latestSubscription(db, user.id);
    if (current && toBillingInfo(current).hasAccess) {
      sendError(res, 409, 'Zaten etkin bir aboneliğiniz var', 'ALREADY_SUBSCRIBED');
      return;
    }
    try {
      const url = await createCheckout(cfg, {
        variantId: variant,
        userId: user.id,
        email: user.email,
        name: user.name,
        redirectUrl: `${cfg.PUBLIC_URL.replace(/\/$/, '')}/profile?billing=success`
      });
      res.json({ url });
    } catch (err) {
      handleApiError(res, err);
    }
  });

  router.get('/billing/portal', requireAuth(), limiter, async (req, res) => {
    if (!billingEnabled(cfg)) {
      sendError(res, 503, 'Ödeme sistemi henüz yapılandırılmadı', 'BILLING_DISABLED');
      return;
    }
    const sub = latestSubscription(db, req.user!.id);
    if (!sub) {
      sendError(res, 404, 'Abonelik bulunamadı', 'NOT_FOUND');
      return;
    }
    try {
      res.json({ url: await getCustomerPortalUrl(cfg, sub.id) });
    } catch (err) {
      handleApiError(res, err);
    }
  });

  return router;
}
