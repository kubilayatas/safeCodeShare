// Lemon Squeezy API istemcisi (yalnızca ihtiyaç duyulan uçlar).
// Belgeler: https://docs.lemonsqueezy.com/api
import type { AppConfig } from '../config';
import type { BillingInterval } from '@safecodeshare/shared';

export class BillingApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'BillingApiError';
  }
}

export function billingEnabled(cfg: AppConfig): boolean {
  return Boolean(
    cfg.LEMONSQUEEZY_API_KEY &&
      cfg.LEMONSQUEEZY_STORE_ID &&
      cfg.LEMONSQUEEZY_WEBHOOK_SECRET &&
      (cfg.LEMONSQUEEZY_VARIANT_MONTHLY || cfg.LEMONSQUEEZY_VARIANT_YEARLY)
  );
}

export function variantFor(cfg: AppConfig, interval: BillingInterval): string | undefined {
  return interval === 'month' ? cfg.LEMONSQUEEZY_VARIANT_MONTHLY : cfg.LEMONSQUEEZY_VARIANT_YEARLY;
}

export function intervalOfVariant(cfg: AppConfig, variantId: string | null | undefined): BillingInterval | null {
  if (!variantId) return null;
  if (variantId === cfg.LEMONSQUEEZY_VARIANT_MONTHLY) return 'month';
  if (variantId === cfg.LEMONSQUEEZY_VARIANT_YEARLY) return 'year';
  return null;
}

// Lemon Squeezy'nin döndürdüğü adresler her zaman https'dir. (Yerel denemede API adresi
// http://localhost... olarak verilirse http de kabul edilir.)
function isSafeRedirect(cfg: AppConfig, url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (u.protocol === 'https:') return true;
    return u.protocol === 'http:' && /^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(cfg.LEMONSQUEEZY_API_URL);
  } catch {
    return false;
  }
}

type JsonApiDoc = { data?: { id?: string; attributes?: Record<string, unknown> } };

async function call(cfg: AppConfig, method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<JsonApiDoc> {
  let res: Response;
  try {
    res = await fetch(cfg.LEMONSQUEEZY_API_URL.replace(/\/$/, '') + path, {
      method,
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${cfg.LEMONSQUEEZY_API_KEY ?? ''}`
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000)
    });
  } catch (err) {
    throw new BillingApiError(`Lemon Squeezy'ye ulaşılamadı: ${String(err)}`, 0);
  }
  const text = await res.text();
  if (!res.ok) {
    // Ayrıntı sunucu günlüğüne; kullanıcıya genel mesaj gider.
    throw new BillingApiError(`Lemon Squeezy ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`, res.status);
  }
  try {
    return JSON.parse(text) as JsonApiDoc;
  } catch {
    throw new BillingApiError(`Lemon Squeezy yanıtı okunamadı (${path})`, res.status);
  }
}

export type CheckoutInput = {
  variantId: string;
  userId: string;
  email: string;
  name: string;
  redirectUrl: string;
};

// Ödeme sayfası oluşturur, kullanıcının yönlendirileceği adresi döndürür.
export async function createCheckout(cfg: AppConfig, input: CheckoutInput): Promise<string> {
  const doc = await call(cfg, 'POST', '/v1/checkouts', {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: input.email,
          name: input.name,
          // Webhook'ta meta.custom_data olarak geri gelir; aboneliği hesaba bağlar.
          custom: { user_id: input.userId }
        },
        product_options: {
          redirect_url: input.redirectUrl,
          enabled_variants: [Number(input.variantId)].filter((n) => Number.isFinite(n))
        },
        // Bağlantı bir gün geçerli; eski bağlantılar dolaşımda kalmasın.
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
      },
      relationships: {
        store: { data: { type: 'stores', id: String(cfg.LEMONSQUEEZY_STORE_ID) } },
        variant: { data: { type: 'variants', id: String(input.variantId) } }
      }
    }
  });
  const url = doc.data?.attributes?.url;
  if (!isSafeRedirect(cfg, url)) {
    throw new BillingApiError('Lemon Squeezy ödeme adresi döndürmedi', 502);
  }
  return url;
}

// Abonelik yönetim sayfasının imzalı (24 saat geçerli) adresi.
export async function getCustomerPortalUrl(cfg: AppConfig, subscriptionId: string): Promise<string> {
  const doc = await call(cfg, 'GET', `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`);
  const urls = doc.data?.attributes?.urls as Record<string, unknown> | undefined;
  const url = urls?.customer_portal;
  if (!isSafeRedirect(cfg, url)) {
    throw new BillingApiError('Lemon Squeezy yönetim adresi döndürmedi', 502);
  }
  return url;
}

export async function getVariantPrice(cfg: AppConfig, variantId: string): Promise<number | null> {
  const doc = await call(cfg, 'GET', `/v1/variants/${encodeURIComponent(variantId)}`);
  const price = doc.data?.attributes?.price;
  return typeof price === 'number' ? price : null;
}

export async function getStoreCurrency(cfg: AppConfig): Promise<string> {
  const doc = await call(cfg, 'GET', `/v1/stores/${encodeURIComponent(String(cfg.LEMONSQUEEZY_STORE_ID))}`);
  const c = doc.data?.attributes?.currency;
  return typeof c === 'string' && /^[A-Z]{3}$/.test(c) ? c : 'USD';
}

// Aboneliği iptal eder (dönem sonuna kadar geçerli kalır, sonra yenilenmez).
export async function cancelSubscription(cfg: AppConfig, subscriptionId: string): Promise<void> {
  await call(cfg, 'DELETE', `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`);
}
