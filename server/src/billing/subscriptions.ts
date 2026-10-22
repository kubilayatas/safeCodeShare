// Lemon Squeezy aboneliklerinin veritabanındaki karşılığı ve Pro hakkının hesaplanması.
//
// Kural: Kullanıcı, access_until > şimdi olan bir aboneliği varsa Pro'dur.
// access_until her webhook'ta yeniden hesaplanır ve bilerek "kendiliğinden biten" bir
// tarihtir: yenilenen bir abonelik için bir sonraki ödeme tarihi + birkaç gün.
// Yenileme olunca Lemon Squeezy yeni tarihle tekrar haber verir. Bir webhook kaçsa bile
// erişim sonsuza kadar açık kalmaz.
import crypto from 'node:crypto';
import { BILLING_STATUSES, type BillingInfo, type BillingStatus } from '@safecodeshare/shared';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { intervalOfVariant } from './lemonsqueezy';

const DAY = 24 * 3600 * 1000;
// Ödeme günü ile yenileme webhook'u arasında Pro kesilmesin.
export const RENEWAL_GRACE = 3 * DAY;
// Ödeme başarısız (past_due): Lemon Squeezy kartı birkaç kez daha dener; bu sürede Pro devam eder.
export const PAST_DUE_GRACE = 14 * DAY;
// "Ücretsiz devam" moduyla durdurulmuş aboneliklerde dönüş tarihi yoksa kullanılacak üst sınır.
const PAUSED_FREE_MAX = 365 * DAY;

export type SubscriptionRow = {
  id: string;
  user_id: string | null;
  customer_id: string | null;
  variant_id: string | null;
  billing_interval: string | null;
  status: string;
  renews_at: number | null;
  ends_at: number | null;
  trial_ends_at: number | null;
  access_until: number;
  card_brand: string | null;
  card_last4: string | null;
  user_email: string | null;
  test_mode: number;
  ls_updated_at: number;
  created_at: number;
  updated_at: number;
};

// --------------------------------------------------------------- imza

// X-Signature: gizli anahtarla ham gövdenin HMAC-SHA256 özeti (hex).
export function verifySignature(rawBody: Buffer, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8');
  const received = Buffer.from(signature.trim(), 'utf8');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

// --------------------------------------------------------------- hesaplama

const toMs = (v: unknown): number | null => {
  if (typeof v !== 'string' || !v) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
};

export function isBillingStatus(v: unknown): v is BillingStatus {
  return typeof v === 'string' && (BILLING_STATUSES as readonly string[]).includes(v);
}

export type SubscriptionAttrs = {
  status: BillingStatus;
  renewsAt: number | null;
  endsAt: number | null;
  trialEndsAt: number | null;
  updatedAt: number;
  pauseMode: 'void' | 'free' | null;
  pauseResumesAt: number | null;
};

// Bu abonelik hangi ana kadar Pro sağlar? 0 = sağlamaz.
export function computeAccessUntil(a: SubscriptionAttrs): number {
  switch (a.status) {
    case 'active':
      return a.renewsAt ? a.renewsAt + RENEWAL_GRACE : a.updatedAt + 31 * DAY + RENEWAL_GRACE;
    case 'on_trial':
      return (a.trialEndsAt ?? a.renewsAt ?? a.updatedAt + 14 * DAY) + RENEWAL_GRACE;
    case 'past_due':
      return Math.max(a.renewsAt ?? 0, a.updatedAt) + PAST_DUE_GRACE;
    case 'cancelled':
      // Dönem sonuna kadar devam eder, sonra biter.
      return a.endsAt ?? 0;
    case 'paused':
      // "free" modunda müşteri ödemeden kullanmaya devam eder; "void" modunda erişim kapanır.
      return a.pauseMode === 'free' ? (a.pauseResumesAt ?? a.updatedAt + PAUSED_FREE_MAX) : 0;
    case 'unpaid': // bütün tahsilat denemeleri başarısız
    case 'expired':
      return 0;
  }
}

export function parseSubscriptionAttrs(attrs: Record<string, unknown>): SubscriptionAttrs | null {
  if (!isBillingStatus(attrs.status)) return null;
  const pause = attrs.pause && typeof attrs.pause === 'object' ? (attrs.pause as Record<string, unknown>) : null;
  return {
    status: attrs.status,
    renewsAt: toMs(attrs.renews_at),
    endsAt: toMs(attrs.ends_at),
    trialEndsAt: toMs(attrs.trial_ends_at),
    updatedAt: toMs(attrs.updated_at) ?? Date.now(),
    pauseMode: pause?.mode === 'free' ? 'free' : pause?.mode === 'void' ? 'void' : null,
    pauseResumesAt: toMs(pause?.resumes_at)
  };
}

// --------------------------------------------------------------- webhook işleme

export type WebhookResult =
  | 'applied'
  | 'stale' // daha yeni bir bilgi zaten kayıtlı
  | 'ignored-event' // abonelikle ilgisi olmayan olay
  | 'ignored-test' // canlı ortamda test modu satın alımı
  | 'ignored-store' // başka bir mağazadan
  | 'unlinked' // hangi kullanıcıya ait olduğu bilinmiyor
  | 'invalid';

type Payload = {
  meta?: { event_name?: unknown; custom_data?: unknown };
  data?: { type?: unknown; id?: unknown; attributes?: unknown };
};

export function applyWebhook(db: DB, cfg: AppConfig, body: unknown): { result: WebhookResult; subscriptionId?: string; userId?: string | null } {
  const p = (body ?? {}) as Payload;
  if (!p.data || p.data.type !== 'subscriptions') return { result: 'ignored-event' };
  const id = typeof p.data.id === 'string' || typeof p.data.id === 'number' ? String(p.data.id) : null;
  const attrs = (p.data.attributes && typeof p.data.attributes === 'object' ? p.data.attributes : null) as
    | Record<string, unknown>
    | null;
  if (!id || !attrs) return { result: 'invalid' };

  if (cfg.LEMONSQUEEZY_STORE_ID && attrs.store_id != null && String(attrs.store_id) !== String(cfg.LEMONSQUEEZY_STORE_ID)) {
    return { result: 'ignored-store', subscriptionId: id };
  }
  const testMode = attrs.test_mode === true;
  if (testMode && !cfg.LEMONSQUEEZY_TEST_MODE) return { result: 'ignored-test', subscriptionId: id };

  const parsed = parseSubscriptionAttrs(attrs);
  if (!parsed) return { result: 'invalid', subscriptionId: id };

  const existing = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as SubscriptionRow | undefined;
  if (existing && existing.ls_updated_at > parsed.updatedAt) {
    // Sıra dışı gelen eski bir olay; daha yenisi zaten işlenmiş.
    return { result: 'stale', subscriptionId: id, userId: existing.user_id };
  }

  // Hesaba bağlama: ödeme sayfasında gönderdiğimiz user_id, yoksa daha önce bağlanmış kayıt.
  const custom = p.meta?.custom_data && typeof p.meta.custom_data === 'object' ? (p.meta.custom_data as Record<string, unknown>) : {};
  let userId: string | null = null;
  const claimed = custom.user_id != null ? String(custom.user_id) : null;
  // Bir kez bağlanan abonelik o hesapta kalır.
  if (existing?.user_id) userId = existing.user_id;
  else if (claimed && db.prepare('SELECT 1 FROM users WHERE id = ?').get(claimed)) userId = claimed;

  const now = Date.now();
  const accessUntil = computeAccessUntil(parsed);
  const str = (v: unknown): string | null => (v == null || v === '' ? null : String(v));

  db.prepare(
    `INSERT INTO subscriptions(id, user_id, customer_id, variant_id, billing_interval, status, renews_at, ends_at, trial_ends_at,
        access_until, card_brand, card_last4, user_email, test_mode, ls_updated_at, created_at, updated_at)
     VALUES (@id, @user_id, @customer_id, @variant_id, @billing_interval, @status, @renews_at, @ends_at, @trial_ends_at,
        @access_until, @card_brand, @card_last4, @user_email, @test_mode, @ls_updated_at, @now, @now)
     ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id, customer_id = excluded.customer_id, variant_id = excluded.variant_id, billing_interval = excluded.billing_interval,
        status = excluded.status, renews_at = excluded.renews_at, ends_at = excluded.ends_at,
        trial_ends_at = excluded.trial_ends_at, access_until = excluded.access_until,
        card_brand = excluded.card_brand, card_last4 = excluded.card_last4, user_email = excluded.user_email,
        test_mode = excluded.test_mode, ls_updated_at = excluded.ls_updated_at, updated_at = excluded.updated_at`
  ).run({
    id,
    user_id: userId,
    customer_id: str(attrs.customer_id),
    variant_id: str(attrs.variant_id),
    billing_interval: intervalOfVariant(cfg, str(attrs.variant_id)),
    status: parsed.status,
    renews_at: parsed.renewsAt,
    ends_at: parsed.endsAt,
    trial_ends_at: parsed.trialEndsAt,
    access_until: accessUntil,
    card_brand: str(attrs.card_brand),
    card_last4: str(attrs.card_last_four),
    user_email: str(attrs.user_email),
    test_mode: testMode ? 1 : 0,
    ls_updated_at: parsed.updatedAt,
    now
  });
  return { result: userId ? 'applied' : 'unlinked', subscriptionId: id, userId };
}

export function logBillingEvent(db: DB, eventName: string, objectId: string | null, result: string, payload: string): void {
  db.prepare('INSERT INTO billing_events(event_name, object_id, received_at, result, payload) VALUES (?, ?, ?, ?, ?)').run(
    eventName.slice(0, 80),
    objectId,
    Date.now(),
    result,
    payload.slice(0, 64_000)
  );
}

export function cleanupBillingEvents(db: DB, olderThanMs = 180 * DAY): number {
  return db.prepare('DELETE FROM billing_events WHERE received_at < ?').run(Date.now() - olderThanMs).changes;
}

// --------------------------------------------------------------- okuma

// Kullanıcı için gösterilecek abonelik: önce Pro sağlayan, yoksa en son güncellenen.
export function latestSubscription(db: DB, userId: string, now = Date.now()): SubscriptionRow | null {
  return (
    (db
      .prepare(
        `SELECT * FROM subscriptions WHERE user_id = ?
          ORDER BY (access_until > ?) DESC, ls_updated_at DESC LIMIT 1`
      )
      .get(userId, now) as SubscriptionRow | undefined) ?? null
  );
}

export function toBillingInfo(row: SubscriptionRow, now = Date.now()): BillingInfo {
  return {
    status: isBillingStatus(row.status) ? row.status : 'expired',
    interval: row.billing_interval === 'month' || row.billing_interval === 'year' ? row.billing_interval : null,
    renewsAt: row.renews_at,
    endsAt: row.ends_at,
    hasAccess: row.access_until > now,
    cardBrand: row.card_brand,
    cardLast4: row.card_last4,
    testMode: row.test_mode === 1
  };
}

export function billingAccessUntil(db: DB, userId: string): number {
  const r = db.prepare('SELECT MAX(access_until) AS t FROM subscriptions WHERE user_id = ?').get(userId) as { t: number | null };
  return r.t ?? 0;
}

// SQL parçası: kullanıcının (u takma adıyla) şu an Pro olup olmadığı. Parametre: now, now.
export const PRO_SQL = `(u.role = 'teacher' AND ((u.plan = 'pro' AND (u.plan_expires_at IS NULL OR u.plan_expires_at > ?))
  OR EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.access_until > ?)))`;
