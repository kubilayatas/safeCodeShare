// Herkese açık kayıt, planlar/limitler, yönetici paneli ve askıya alma testleri.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import type { Express } from 'express';

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'safecodeshare-acc-'));
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = TMP_DIR;
process.env.COOKIE_SECRET = 'y'.repeat(40);
process.env.LOGIN_RATE_MAX = '1000';
process.env.REGISTER_RATE_MAX = '1000';
process.env.UNLOCK_RATE_MAX = '1000';
process.env.FORMAT_RATE_MAX = '1000';

import { loadConfig } from '../src/config';
import { openDatabase } from '../src/db';
import { hashPassword } from '../src/auth/passwords';
import { createApp } from '../src/app';

let app: Express;
let db: ReturnType<typeof openDatabase>;
let admin: request.Agent;

async function register(email: string, name = 'Yeni Öğretmen'): Promise<request.Agent> {
  const agent = request.agent(app);
  const r = await agent.post('/api/auth/register').send({ name, email, password: 'GizliParola1', acceptTerms: true });
  expect(r.status).toBe(201);
  return agent;
}

beforeAll(() => {
  const cfg = loadConfig();
  db = openDatabase(cfg.DATA_DIR);
  app = createApp(db, cfg);
});

beforeEach(async () => {
  for (const t of ['pad_versions', 'pads', 'topics', 'courses', 'sessions', 'users', 'settings']) db.exec(`DELETE FROM ${t}`);
  db.prepare(
    "INSERT INTO users(id, email, name, password_hash, role, created_at) VALUES ('admin-1', 'admin@test.local', 'Yönetici', ?, 'admin', ?)"
  ).run(await hashPassword('AdminPass123!'), Date.now());
  admin = request.agent(app);
  expect((await admin.post('/api/auth/login').send({ email: 'admin@test.local', password: 'AdminPass123!' })).status).toBe(200);
});

afterAll(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('kayıt', () => {
  it('yeni kullanıcı ücretsiz planla kaydolur ve oturum açılır', async () => {
    const u = await register('yeni@test.local');
    const me = await u.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe('teacher');
    expect(me.body.entitlements.plan).toBe('free');
    expect(me.body.entitlements.limits.ocrProtect).toBe(false);
  });

  it('aynı e-posta ile ikinci kayıt reddedilir', async () => {
    await register('ayni@test.local');
    const r = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Xavier', email: 'AYNI@test.local', password: 'GizliParola1', acceptTerms: true });
    expect(r.status).toBe(409);
  });

  it('koşullar kabul edilmeden ve bot tuzağı doluyken kayıt olmaz', async () => {
    const a = await request(app).post('/api/auth/register').send({ name: 'Ali', email: 'a1@test.local', password: 'GizliParola1' });
    expect(a.status).toBe(400);
    const b = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bot', email: 'bot@test.local', password: 'GizliParola1', acceptTerms: true, website: 'spam.example' });
    expect(b.status).toBe(400);
  });

  it('yönetici kayıtları kapatınca yeni kayıt alınmaz', async () => {
    expect((await admin.patch('/api/admin/settings').send({ registrationOpen: false })).status).toBe(200);
    const r = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Geç', email: 'gec@test.local', password: 'GizliParola1', acceptTerms: true });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('REGISTRATION_CLOSED');
  });
});

describe('plan limitleri (sunucu tarafında zorlanır)', () => {
  it('ücretsiz plan ders sayısı sınırını aşamaz', async () => {
    const u = await register('limit@test.local');
    for (let i = 0; i < 3; i++) expect((await u.post('/api/courses').send({ title: `D${i}` })).status).toBe(201);
    const over = await u.post('/api/courses').send({ title: 'Fazla' });
    expect(over.status).toBe(403);
    expect(over.body.code).toBe('PLAN_LIMIT');
  });

  it('ücretsiz plan şifreli paylaşım ve OCR koruması açamaz; Pro açabilir', async () => {
    const u = await register('ozellik@test.local');
    const pad = (await u.post('/api/pads').send({ title: 'P', language: 'python' })).body.pad;
    expect((await u.patch(`/api/pads/${pad.id}`).send({ password: 'abc12345' })).body.code).toBe('PLAN_LIMIT');
    expect((await u.patch(`/api/pads/${pad.id}`).send({ ocrProtect: 1 })).body.code).toBe('PLAN_LIMIT');

    const id = (db.prepare("SELECT id FROM users WHERE email = 'ozellik@test.local'").get() as { id: string }).id;
    expect((await admin.patch(`/api/admin/users/${id}`).send({ plan: 'pro' })).status).toBe(200);
    expect((await u.patch(`/api/pads/${pad.id}`).send({ password: 'abc12345' })).status).toBe(200);
    const ocr = await u.patch(`/api/pads/${pad.id}`).send({ ocrProtect: 2 });
    expect(ocr.status).toBe(200);
    expect(ocr.body.pad.ocrProtect).toBe(2);
    // Kopyalama koruması kapanınca OCR koruması da kapanır
    const off = await u.patch(`/api/pads/${pad.id}`).send({ copyProtect: false });
    expect(off.body.pad.ocrProtect).toBe(0);
    // Kopyalama koruması kapalıyken OCR açılamaz
    expect((await u.patch(`/api/pads/${pad.id}`).send({ ocrProtect: 1 })).body.code).toBe('NEEDS_COPY_PROTECT');
  });

  it('süresi dolan Pro plan ücretsize düşer', async () => {
    const u = await register('sure@test.local');
    const id = (db.prepare("SELECT id FROM users WHERE email = 'sure@test.local'").get() as { id: string }).id;
    await admin.patch(`/api/admin/users/${id}`).send({ plan: 'pro', planExpiresAt: Date.now() - 1000 });
    const me = await u.get('/api/auth/me');
    expect(me.body.entitlements.plan).toBe('free');
  });

  it('yönetici plan limitlerini değiştirebilir ve kullanıcıya özel limit verebilir', async () => {
    const u = await register('ozel@test.local');
    const settings = (await admin.get('/api/admin/settings')).body;
    settings.plans.free.maxCourses = 1;
    expect((await admin.patch('/api/admin/settings').send({ plans: settings.plans })).status).toBe(200);
    expect((await u.post('/api/courses').send({ title: 'A' })).status).toBe(201);
    expect((await u.post('/api/courses').send({ title: 'B' })).status).toBe(403);

    const id = (db.prepare("SELECT id FROM users WHERE email = 'ozel@test.local'").get() as { id: string }).id;
    await admin.patch(`/api/admin/users/${id}`).send({ limitsOverride: { maxCourses: 5 } });
    expect((await u.post('/api/courses').send({ title: 'B' })).status).toBe(201);
  });

  it('sürüm geçmişi ve zip indirme ücretsiz planda kapalı', async () => {
    const u = await register('surum@test.local');
    const pad = (await u.post('/api/pads').send({ title: 'P', language: 'python' })).body.pad;
    expect((await u.get(`/api/pads/${pad.id}/versions`)).body.code).toBe('PLAN_LIMIT');
    const c = (await u.post('/api/courses').send({ title: 'Z' })).body.course;
    expect((await u.get(`/api/courses/${c.id}/export.zip`)).status).toBe(403);
  });
});

describe('yönetici paneli', () => {
  it('kullanıcı listesi kullanım sayılarıyla gelir; öğretmen erişemez', async () => {
    const u = await register('liste@test.local');
    await u.post('/api/courses').send({ title: 'D' });
    const list = await admin.get('/api/admin/users?q=liste');
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.users[0].usage.courses).toBe(1);
    expect(list.body.users[0].signupSource).toBe('self');
    expect((await u.get('/api/admin/users')).status).toBe(403);
    expect((await admin.get('/api/admin/stats')).body.users).toBe(2);
  });

  it('askıya alınan kullanıcı giriş yapamaz, oturumu düşer, paylaşımları kapanır', async () => {
    const u = await register('kotu@test.local');
    const pad = (await u.post('/api/pads').send({ title: 'P', language: 'python', content: 'print(1)' })).body.pad;
    expect((await request(app).get(`/api/public/view/${pad.viewToken}`)).status).toBe(200);

    const id = (db.prepare("SELECT id FROM users WHERE email = 'kotu@test.local'").get() as { id: string }).id;
    expect((await admin.patch(`/api/admin/users/${id}`).send({ status: 'suspended' })).status).toBe(200);

    expect((await u.get('/api/auth/me')).status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: 'kotu@test.local', password: 'GizliParola1' });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe('SUSPENDED');
    expect((await request(app).get(`/api/public/view/${pad.viewToken}`)).status).toBe(403);

    await admin.patch(`/api/admin/users/${id}`).send({ status: 'active' });
    expect((await request(app).get(`/api/public/view/${pad.viewToken}`)).status).toBe(200);
  });

  it('yönetici kendini askıya alamaz, son yönetici düşürülemez', async () => {
    expect((await admin.patch('/api/admin/users/admin-1').send({ status: 'suspended' })).status).toBe(400);
    expect((await admin.patch('/api/admin/users/admin-1').send({ role: 'teacher' })).status).toBe(400);
  });
});

describe('istek güvenliği', () => {
  it('gövdesiz silme çalışır, form gönderimi reddedilir', async () => {
    const u = await register('sil@test.local');
    const pad = (await u.post('/api/pads').send({ title: 'P', language: 'python' })).body.pad;
    const asForm = await u.delete(`/api/pads/${pad.id}`).set('Content-Type', 'application/x-www-form-urlencoded');
    expect(asForm.status).toBe(415);
    expect((await u.delete(`/api/pads/${pad.id}`)).status).toBe(200);
    expect((await u.post('/api/auth/logout')).status).toBe(200);
  });
});

describe('dil (i18n)', () => {
  it('hata mesajları X-Locale başlığına göre çevrilir', async () => {
    const bad = { email: 'admin@test.local', password: 'yanlis-parola' };
    const ja = await request(app).post('/api/auth/login').set('X-Locale', 'ja').send(bad);
    expect(ja.status).toBe(401);
    expect(ja.body.error).toBe('メールアドレスまたはパスワードが違います');
    const tr = await request(app).post('/api/auth/login').set('X-Locale', 'tr').send(bad);
    expect(tr.body.error).toBe('E-posta veya parola hatalı');
  });

  it('başlık yoksa Accept-Language, o da yoksa İngilizce kullanılır', async () => {
    const bad = { email: 'admin@test.local', password: 'yanlis-parola' };
    const de = await request(app).post('/api/auth/login').set('Accept-Language', 'de-AT,de;q=0.9,en;q=0.5').send(bad);
    expect(de.body.error).toBe('E-Mail-Adresse oder Passwort ist falsch');
    const en = await request(app).post('/api/auth/login').send(bad);
    expect(en.body.error).toBe('Wrong email or password');
  });

  it('kayıtta seçilen dil saklanır ve profil üzerinden değiştirilebilir', async () => {
    const agent = request.agent(app);
    const r = await agent
      .post('/api/auth/register')
      .send({ name: 'Ana', email: 'ana@test.local', password: 'GizliParola1', acceptTerms: true, locale: 'pt-BR' });
    expect(r.status).toBe(201);
    expect((await agent.get('/api/auth/me')).body.user.locale).toBe('pt-BR');
    const p = await agent.patch('/api/auth/profile').send({ locale: 'ar' });
    expect(p.status).toBe(200);
    expect(p.body.user.locale).toBe('ar');
    expect((await agent.patch('/api/auth/profile').send({ locale: 'xx' })).status).toBe(400);
    // Kayıtlı tercih, başlık gönderilmediğinde sunucu mesajlarının dilini belirler.
    const nf = await agent.get('/api/pads/yok-boyle-bir-pad');
    expect(nf.body.error).toBe('لم يتم العثور على المقطع');
  });

  it('plan sınırı mesajı plan adını da çevirir', async () => {
    const u = await register('limit@test.local');
    const id = (await u.get('/api/auth/me')).body.user.id as string;
    await admin.patch(`/api/admin/users/${id}`).send({ limitsOverride: { maxCourses: 0 } });
    const r = await u.post('/api/courses').set('X-Locale', 'fr').send({ title: 'X' });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('PLAN_LIMIT');
    expect(r.body.error).toContain('« Gratuit »');
  });
});
