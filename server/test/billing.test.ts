// Lemon Squeezy ödeme entegrasyonu: imza, abonelik durumları → Pro hakkı, ödeme ve yönetim sayfaları.
// Lemon Squeezy API'si sahte bir fetch ile taklit edilir; ağ kullanılmaz.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import type { Express } from 'express';

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'safecodeshare-billing-'));
const SECRET = 'whsec_test_1234567890';
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = TMP_DIR;
process.env.COOKIE_SECRET = 'z'.repeat(40);
process.env.LOGIN_RATE_MAX = '1000';
process.env.REGISTER_RATE_MAX = '1000';
process.env.PUBLIC_URL = 'https://kod.example.com';
process.env.LEMONSQUEEZY_API_KEY = 'test-api-key';
process.env.LEMONSQUEEZY_STORE_ID = '777';
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = SECRET;
process.env.LEMONSQUEEZY_VARIANT_MONTHLY = '1001';
process.env.LEMONSQUEEZY_VARIANT_YEARLY = '1002';
process.env.LEMONSQUEEZY_TEST_MODE = 'false';

import { loadConfig } from '../src/config';
import { openDatabase } from '../src/db';
import { hashPassword } from '../src/auth/passwords';
import { createApp } from '../src/app';
import { computeAccessUntil, PAST_DUE_GRACE, RENEWAL_GRACE } from '../src/billing/subscriptions';

let app: Express;
let db: ReturnType<typeof openDatabase>;
let admin: request.Agent;

// ---- Sahte Lemon Squeezy API ----
type Call = { method: string; url: string; body: unknown; auth: string | null };
const calls: Call[] = [];
let apiDown = false;
const fakeFetch = vi.fn(async (input: string | URL, init?: RequestInit) => {
  const url = String(input);
  const method = init?.method ?? 'GET';
  calls.push({
    method,
    url,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
    auth: new Headers(init?.headers).get('Authorization')
  });
  const json = (status: number, data: unknown): Response =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/vnd.api+json' } });
  if (apiDown) return json(500, { errors: [{ detail: 'down' }] });
  if (method === 'POST' && url.endsWith('/v1/checkouts'))
    return json(201, { data: { id: 'co_1', attributes: { url: 'https://store.lemonsqueezy.com/checkout/custom/abc' } } });
  if (method === 'GET' && /\/v1\/subscriptions\/\w+$/.test(url))
    return json(200, { data: { id: 's', attributes: { urls: { customer_portal: 'https://store.lemonsqueezy.com/billing?sig=1' } } } });
  if (method === 'DELETE' && /\/v1\/subscriptions\/\w+$/.test(url)) return json(200, { data: { id: 's', attributes: { status: 'cancelled' } } });
  if (url.endsWith('/v1/variants/1001')) return json(200, { data: { id: '1001', attributes: { price: 500 } } });
  if (url.endsWith('/v1/variants/1002')) return json(200, { data: { id: '1002', attributes: { price: 4800 } } });
  if (url.endsWith('/v1/stores/777')) return json(200, { data: { id: '777', attributes: { currency: 'USD' } } });
  return json(404, { errors: [{ detail: 'not found' }] });
});

// ---- Yardımcılar ----
const iso = (ms: number): string => new Date(ms).toISOString();
const DAY = 86400000;

function subscriptionPayload(
  id: string,
  attrs: Record<string, unknown>,
  opts: { event?: string; userId?: string | null } = {}
): Record<string, unknown> {
  return {
    meta: {
      event_name: opts.event ?? 'subscription_updated',
      ...(opts.userId === null ? {} : { custom_data: { user_id: opts.userId } })
    },
    data: {
      type: 'subscriptions',
      id,
      attributes: {
        store_id: 777,
        customer_id: 55,
        variant_id: 1001,
        user_email: 'buyer@test.local',
        status: 'active',
        renews_at: iso(Date.now() + 30 * DAY),
        ends_at: null,
        trial_ends_at: null,
        card_brand: 'visa',
        card_last_four: '4242',
        test_mode: false,
        updated_at: iso(Date.now()),
        ...attrs
      }
    }
  };
}

async function sendWebhook(payload: unknown, secret = SECRET): Promise<request.Response> {
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return request(app).post('/api/billing/webhook').set('Content-Type', 'application/json').set('X-Signature', sig).send(raw);
}

async function newTeacher(email: string): Promise<{ agent: request.Agent; id: string }> {
  const agent = request.agent(app);
  const r = await agent.post('/api/auth/register').send({ name: 'Öğretmen', email, password: 'GizliParola1', acceptTerms: true });
  expect(r.status).toBe(201);
  const id = (await agent.get('/api/auth/me')).body.user.id as string;
  return { agent, id };
}

const me = async (agent: request.Agent) => (await agent.get('/api/auth/me')).body;

beforeAll(() => {
  vi.stubGlobal('fetch', fakeFetch);
  const cfg = loadConfig();
  db = openDatabase(cfg.DATA_DIR);
  app = createApp(db, cfg);
});

beforeEach(async () => {
  calls.length = 0;
  apiDown = false;
  for (const t of ['billing_events', 'subscriptions', 'pad_versions', 'pads', 'topics', 'courses', 'sessions', 'users', 'settings'])
    db.exec(`DELETE FROM ${t}`);
  db.prepare(
    "INSERT INTO users(id, email, name, password_hash, role, created_at) VALUES ('admin-1', 'admin@test.local', 'Yönetici', ?, 'admin', ?)"
  ).run(await hashPassword('AdminPass123!'), Date.now());
  admin = request.agent(app);
  expect((await admin.post('/api/auth/login').send({ email: 'admin@test.local', password: 'AdminPass123!' })).status).toBe(200);
});

afterAll(() => {
  vi.unstubAllGlobals();
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('Pro süresi hesabı', () => {
  const base = { renewsAt: null, endsAt: null, trialEndsAt: null, updatedAt: 1_000_000, pauseMode: null, pauseResumesAt: null } as const;
  it('durumlara göre doğru bitiş anı', () => {
    expect(computeAccessUntil({ ...base, status: 'active', renewsAt: 5_000_000 })).toBe(5_000_000 + RENEWAL_GRACE);
    expect(computeAccessUntil({ ...base, status: 'cancelled', endsAt: 7_000_000 })).toBe(7_000_000);
    expect(computeAccessUntil({ ...base, status: 'past_due', renewsAt: 900_000 })).toBe(1_000_000 + PAST_DUE_GRACE);
    expect(computeAccessUntil({ ...base, status: 'unpaid' })).toBe(0);
    expect(computeAccessUntil({ ...base, status: 'expired' })).toBe(0);
    expect(computeAccessUntil({ ...base, status: 'paused', pauseMode: 'void' })).toBe(0);
    expect(computeAccessUntil({ ...base, status: 'paused', pauseMode: 'free', pauseResumesAt: 9_000_000 })).toBe(9_000_000);
  });
});

describe('webhook', () => {
  it('imzasız veya yanlış imzalı istekleri reddeder', async () => {
    const { id } = await newTeacher('a@test.local');
    const payload = subscriptionPayload('s1', {}, { userId: id });
    expect((await sendWebhook(payload, 'yanlis-gizli-anahtar')).status).toBe(401);
    expect((await request(app).post('/api/billing/webhook').set('Content-Type', 'application/json').send(payload)).status).toBe(401);
    expect(db.prepare('SELECT COUNT(*) AS n FROM subscriptions').get()).toEqual({ n: 0 });
  });

  it('abonelik başlayınca Pro olur; limitler kalkar', async () => {
    const { agent, id } = await newTeacher('b@test.local');
    expect((await me(agent)).entitlements.plan).toBe('free');
    const r = await sendWebhook(subscriptionPayload('s2', {}, { event: 'subscription_created', userId: id }));
    expect(r.status).toBe(200);
    expect(r.body.result).toBe('applied');
    const ent = (await me(agent)).entitlements;
    expect(ent.plan).toBe('pro');
    expect(ent.planExpiresAt).toBeNull(); // yenilenen abonelik → bitiş tarihi gösterilmez
    expect(ent.limits.versionHistory).toBe(true);
    expect(ent.billing).toMatchObject({ status: 'active', interval: 'month', hasAccess: true, cardLast4: '4242', testMode: false });
    for (let i = 0; i < 5; i++) expect((await agent.post('/api/courses').send({ title: `Ders ${i}` })).status).toBe(201);
  });

  it('iptal: dönem sonuna kadar Pro, süre dolunca Ücretsiz', async () => {
    const { agent, id } = await newTeacher('c@test.local');
    const endsAt = Date.now() + 10 * DAY;
    await sendWebhook(subscriptionPayload('s3', { status: 'cancelled', ends_at: iso(endsAt) }, { userId: id }));
    let ent = (await me(agent)).entitlements;
    expect(ent.plan).toBe('pro');
    expect(ent.planExpiresAt).toBe(endsAt);
    expect(ent.billing.status).toBe('cancelled');

    await sendWebhook(subscriptionPayload('s3', { status: 'expired', ends_at: iso(Date.now()), updated_at: iso(Date.now() + 1000) }, { userId: id }));
    ent = (await me(agent)).entitlements;
    expect(ent.plan).toBe('free');
    expect(ent.billing).toMatchObject({ status: 'expired', hasAccess: false });
  });

  it('ödeme başarısızken (past_due) Pro devam eder, unpaid olunca kapanır', async () => {
    const { agent, id } = await newTeacher('d@test.local');
    await sendWebhook(subscriptionPayload('s4', { status: 'past_due', renews_at: iso(Date.now() - DAY) }, { userId: id }));
    expect((await me(agent)).entitlements.plan).toBe('pro');
    await sendWebhook(subscriptionPayload('s4', { status: 'unpaid', updated_at: iso(Date.now() + 1000) }, { userId: id }));
    expect((await me(agent)).entitlements.plan).toBe('free');
  });

  it('sıra dışı gelen eski bildirim yenisini ezmez', async () => {
    const { agent, id } = await newTeacher('e@test.local');
    const t = Date.now();
    await sendWebhook(subscriptionPayload('s5', { status: 'expired', updated_at: iso(t) }, { userId: id }));
    const old = await sendWebhook(subscriptionPayload('s5', { status: 'active', updated_at: iso(t - 60_000) }, { userId: id }));
    expect(old.body.result).toBe('stale');
    expect((await me(agent)).entitlements.plan).toBe('free');
  });

  it('yenileme bildirimi gelmezse Pro kendiliğinden biter', async () => {
    const { agent, id } = await newTeacher('f@test.local');
    await sendWebhook(subscriptionPayload('s6', { renews_at: iso(Date.now() - RENEWAL_GRACE - DAY) }, { userId: id }));
    expect((await me(agent)).entitlements.plan).toBe('free');
  });

  it('canlı ortamda test modu satın alımları Pro vermez; başka mağazanınkiler yok sayılır', async () => {
    const { agent, id } = await newTeacher('g@test.local');
    expect((await sendWebhook(subscriptionPayload('s7', { test_mode: true }, { userId: id }))).body.result).toBe('ignored-test');
    expect((await sendWebhook(subscriptionPayload('s8', { store_id: 999 }, { userId: id }))).body.result).toBe('ignored-store');
    expect((await me(agent)).entitlements.plan).toBe('free');
  });

  it('hesap bilgisi olmayan abonelik kimseye Pro vermez; abonelik dışı olaylar sorunsuz geçer', async () => {
    const r = await sendWebhook(subscriptionPayload('s9', {}, { userId: null }));
    expect(r.body.result).toBe('unlinked');
    const other = await sendWebhook({ meta: { event_name: 'order_created' }, data: { type: 'orders', id: '1', attributes: {} } });
    expect(other.status).toBe(200);
    expect(other.body.result).toBe('ignored-event');
    const log = db.prepare('SELECT event_name, result FROM billing_events ORDER BY id').all();
    expect(log).toEqual([
      { event_name: 'subscription_updated', result: 'unlinked' },
      { event_name: 'order_created', result: 'ignored-event' }
    ]);
  });

  it('bağlanmış abonelik başka hesaba aktarılamaz', async () => {
    const a = await newTeacher('h1@test.local');
    const b = await newTeacher('h2@test.local');
    await sendWebhook(subscriptionPayload('s10', {}, { userId: a.id }));
    await sendWebhook(subscriptionPayload('s10', { updated_at: iso(Date.now() + 1000) }, { userId: b.id }));
    expect((await me(a.agent)).entitlements.plan).toBe('pro');
    expect((await me(b.agent)).entitlements.plan).toBe('free');
  });

  it('yöneticinin elle verdiği Pro, biten abonelikten etkilenmez', async () => {
    const { agent, id } = await newTeacher('i@test.local');
    await admin.patch(`/api/admin/users/${id}`).send({ plan: 'pro' });
    await sendWebhook(subscriptionPayload('s11', { status: 'expired' }, { userId: id }));
    expect((await me(agent)).entitlements.plan).toBe('pro');
  });
});

describe('ödeme ve yönetim sayfaları', () => {
  it('planlar sayfası fiyatları Lemon Squeezy\'den alır', async () => {
    const r = await request(app).get('/api/billing/config');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ enabled: true, intervals: ['month', 'year'], currency: 'USD', prices: { month: 500, year: 4800 } });
  });

  it('ödeme sayfası doğru varyant, mağaza ve hesap bilgisiyle oluşturulur', async () => {
    expect((await request(app).post('/api/billing/checkout').send({ interval: 'month' })).status).toBe(401);
    const { agent, id } = await newTeacher('j@test.local');
    expect((await agent.post('/api/billing/checkout').send({ interval: 'weekly' })).status).toBe(400);
    const r = await agent.post('/api/billing/checkout').send({ interval: 'year' });
    expect(r.status).toBe(200);
    expect(r.body.url).toBe('https://store.lemonsqueezy.com/checkout/custom/abc');
    const call = calls.find((c) => c.url.endsWith('/v1/checkouts'))!;
    expect(call.auth).toBe('Bearer test-api-key');
    const data = (call.body as { data: Record<string, any> }).data;
    expect(data.relationships.store.data.id).toBe('777');
    expect(data.relationships.variant.data.id).toBe('1002');
    expect(data.attributes.checkout_data).toMatchObject({ email: 'j@test.local', custom: { user_id: id } });
    expect(data.attributes.product_options.redirect_url).toBe('https://kod.example.com/profile?billing=success');
  });

  it('aboneliği olan tekrar satın alamaz; yönetim sayfası açılır', async () => {
    const { agent, id } = await newTeacher('k@test.local');
    expect((await agent.get('/api/billing/portal')).status).toBe(404);
    await sendWebhook(subscriptionPayload('s12', {}, { userId: id }));
    const again = await agent.post('/api/billing/checkout').send({ interval: 'month' });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('ALREADY_SUBSCRIBED');
    const portal = await agent.get('/api/billing/portal');
    expect(portal.status).toBe(200);
    expect(portal.body.url).toContain('lemonsqueezy.com/billing');
    expect(calls.some((c) => c.method === 'GET' && c.url.endsWith('/v1/subscriptions/s12'))).toBe(true);
  });

  it('sağlayıcı yanıt vermezse anlaşılır hata döner', async () => {
    const { agent } = await newTeacher('l@test.local');
    apiDown = true;
    const r = await agent.post('/api/billing/checkout').set('X-Locale', 'en').send({ interval: 'month' });
    expect(r.status).toBe(502);
    expect(r.body.code).toBe('BILLING_UNAVAILABLE');
    expect(r.body.error).toContain('payment provider');
  });

  it('yönetici panelinde abonelik görünür ve Pro sayısına katılır', async () => {
    const { id } = await newTeacher('m@test.local');
    await sendWebhook(subscriptionPayload('s13', {}, { userId: id }));
    const stats = (await admin.get('/api/admin/stats')).body;
    expect(stats.proUsers).toBe(1);
    const list = (await admin.get('/api/admin/users?plan=pro')).body;
    expect(list.users.map((u: { id: string }) => u.id)).toEqual([id]);
    const detail = (await admin.get(`/api/admin/users/${id}`)).body.user;
    expect(detail.effectivePlan).toBe('pro');
    expect(detail.billing).toMatchObject({ subscriptionId: 's13', status: 'active' });
  });

  it('aboneliği süren kullanıcı silinirken abonelik önce iptal edilir', async () => {
    const { id } = await newTeacher('n@test.local');
    await sendWebhook(subscriptionPayload('s14', {}, { userId: id }));
    apiDown = true;
    expect((await admin.delete(`/api/admin/users/${id}`)).status).toBe(409);
    apiDown = false;
    const r = await admin.delete(`/api/admin/users/${id}`);
    expect(r.status).toBe(200);
    expect(r.body.cancelledSubscriptions).toBe(1);
    expect(calls.some((c) => c.method === 'DELETE' && c.url.endsWith('/v1/subscriptions/s14'))).toBe(true);
  });
});
