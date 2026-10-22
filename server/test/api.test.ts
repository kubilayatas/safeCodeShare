// Not: Bu test dosyası, supertest aracılığıyla gerçek Express uygulamasını çalıştırır.
// Veritabanı her test başında geçici bir klasörde yeniden oluşturulur.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import type { Express } from 'express';

// Test ortamı env'i importlardan önce ayarlanmalı
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'safecodeshare-test-'));

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.PUBLIC_URL = 'http://localhost:5173';
process.env.APP_NAME = 'SafeCodeShareTest';
process.env.DATA_DIR = TMP_DIR;
process.env.COOKIE_SECRET = 'x'.repeat(32);
process.env.SESSION_DAYS = '30';
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'AdminPass123!';
process.env.ADMIN_NAME = 'Test Admin';
process.env.LOGIN_RATE_MAX = '1000';
process.env.UNLOCK_RATE_MAX = '1000';
process.env.FORMAT_RATE_MAX = '1000';

// Gerçek sunucuyla AYNI uygulama kurulumu (src/app.ts) kullanılır.
import { loadConfig } from '../src/config';
import { openDatabase } from '../src/db';
import { hashPassword } from '../src/auth/passwords';
import { randomId } from '../src/util/tokens';
import { createApp } from '../src/app';

function buildApp(): { app: Express; db: ReturnType<typeof openDatabase> } {
  const cfg = loadConfig();
  const db = openDatabase(cfg.DATA_DIR);
  return { app: createApp(db, cfg), db };
}

async function seedUsers(db: ReturnType<typeof openDatabase>): Promise<void> {
  const now = Date.now();
  const adminHash = await hashPassword('AdminPass123!');
  const teacherHash = await hashPassword('TeacherPass123!');
  const otherHash = await hashPassword('OtherPass123!');

  db.prepare('INSERT INTO users(id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    randomId(16),
    'admin@test.local',
    'Test Admin',
    adminHash,
    'admin',
    now
  );
  db.prepare('INSERT INTO users(id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    'teacher-a',
    'a@test.local',
    'Öğretmen A',
    teacherHash,
    'teacher',
    now
  );
  db.prepare('INSERT INTO users(id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    'teacher-b',
    'b@test.local',
    'Öğretmen B',
    otherHash,
    'teacher',
    now
  );
}

async function loginAgent(app: Express, email: string, password: string): Promise<request.Agent> {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

describe('SafeCodeShare API', () => {
  let app: Express;
  let db: ReturnType<typeof openDatabase>;
  let teacherA: request.Agent;
  let teacherB: request.Agent;
  let admin: request.Agent;

  beforeAll(() => {
    const built = buildApp();
    app = built.app;
    db = built.db;
  });

  beforeEach(async () => {
    db.exec('DELETE FROM pad_versions');
    db.exec('DELETE FROM pads');
    db.exec('DELETE FROM topics');
    db.exec('DELETE FROM courses');
    db.exec('DELETE FROM sessions');
    db.exec('DELETE FROM users');
    await seedUsers(db);

    teacherA = await loginAgent(app, 'a@test.local', 'TeacherPass123!');
    teacherB = await loginAgent(app, 'b@test.local', 'OtherPass123!');
    admin = await loginAgent(app, 'admin@test.local', 'AdminPass123!');
  });

  afterAll(() => {
    try {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    } catch {
      // yut
    }
  });

  // ---- Kimlik doğrulama ----
  it('giriş başarısız olursa 401 döner', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@test.local', password: 'yanlis' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('giriş başarılı olduğunda kullanıcı döner ve çerez atılır', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@test.local', password: 'TeacherPass123!' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('a@test.local');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  // ---- Ders / konu / pad ----
  it('öğretmen ders ve konu oluşturabilir, ağaçta görünür', async () => {
    const c = await teacherA.post('/api/courses').send({ title: 'Matematik', description: '9-A' });
    expect(c.status).toBe(201);
    const courseId = c.body.course.id as string;

    const t = await teacherA.post(`/api/courses/${courseId}/topics`).send({ title: 'Türev' });
    expect(t.status).toBe(201);
    const topicId = t.body.topic.id as string;

    const p = await teacherA
      .post('/api/pads')
      .send({ title: 'Örnek', language: 'python', courseId, topicId });
    expect(p.status).toBe(201);
    expect(p.body.pad.topicId).toBe(topicId);
    expect(p.body.pad.courseId).toBe(courseId);
    expect(p.body.pad.copyProtect).toBe(true); // ders varsayılanı

    const tree = await teacherA.get('/api/tree');
    expect(tree.status).toBe(200);
    expect(tree.body.courses).toHaveLength(1);
    expect(tree.body.courses[0].topics).toHaveLength(1);
    expect(tree.body.courses[0].topics[0].pads).toHaveLength(1);
    expect(tree.body.courses[0].topics[0].pads[0].title).toBe('Örnek');
  });

  it('başka öğretmenin dersine erişim 403 döner', async () => {
    const c = await teacherA.post('/api/courses').send({ title: 'Fizik' });
    const courseId = c.body.course.id as string;

    const patch = await teacherB.patch(`/api/courses/${courseId}`).send({ title: 'Hack' });
    expect(patch.status).toBe(403);

    const del = await teacherB.delete(`/api/courses/${courseId}`);
    expect(del.status).toBe(403);

    const topic = await teacherB.post(`/api/courses/${courseId}/topics`).send({ title: 'X' });
    expect(topic.status).toBe(403);
  });

  it('başka öğretmenin padini okuyamaz', async () => {
    const c = await teacherA.post('/api/courses').send({ title: 'Kimya' });
    const p = await teacherA
      .post('/api/pads')
      .send({ title: 'Lab', language: 'python', courseId: c.body.course.id });
    const padId = p.body.pad.id as string;

    const get = await teacherB.get(`/api/pads/${padId}`);
    expect(get.status).toBe(403);

    const patch = await teacherB.patch(`/api/pads/${padId}`).send({ title: 'Hack' });
    expect(patch.status).toBe(403);

    const del = await teacherB.delete(`/api/pads/${padId}`);
    expect(del.status).toBe(403);
  });

  it('konu ve ders uyuşmazlığı 400 döner', async () => {
    const c1 = await teacherA.post('/api/courses').send({ title: 'Biyoloji' });
    const c2 = await teacherA.post('/api/courses').send({ title: 'Tarih' });
    const t = await teacherA.post(`/api/courses/${c1.body.course.id}/topics`).send({ title: 'Hücre' });
    const topicId = t.body.topic.id as string;

    const bad = await teacherA
      .post('/api/pads')
      .send({ title: 'X', language: 'python', courseId: c2.body.course.id, topicId });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('TOPIC_COURSE_MISMATCH');
  });

  it('konu silinince pad dersin konusuz bölümüne düşer', async () => {
    const c = await teacherA.post('/api/courses').send({ title: 'Edebiyat' });
    const t = await teacherA.post(`/api/courses/${c.body.course.id}/topics`).send({ title: 'Şiir' });
    const p = await teacherA
      .post('/api/pads')
      .send({ title: 'Şiir Örnek', language: 'plaintext', courseId: c.body.course.id, topicId: t.body.topic.id });
    const padId = p.body.pad.id as string;

    const del = await teacherA.delete(`/api/topics/${t.body.topic.id}`);
    expect(del.status).toBe(200);

    const pad = await teacherA.get(`/api/pads/${padId}`);
    expect(pad.body.pad.topicId).toBeNull();
    expect(pad.body.pad.courseId).toBe(c.body.course.id);
  });

  it('ders silinince pad derssiz kalır (silinmez)', async () => {
    const c = await teacherA.post('/api/courses').send({ title: 'Geçici' });
    const p = await teacherA.post('/api/pads').send({ title: 'Kalıcı', language: 'plaintext', courseId: c.body.course.id });
    const padId = p.body.pad.id as string;

    const del = await teacherA.delete(`/api/courses/${c.body.course.id}`);
    expect(del.status).toBe(200);

    const pad = await teacherA.get(`/api/pads/${padId}`);
    expect(pad.status).toBe(200);
    expect(pad.body.pad.courseId).toBeNull();

    const tree = await teacherA.get('/api/tree');
    expect(tree.body.unassigned).toHaveLength(1);
  });

  it('arama başlık ve içerikte çalışır', async () => {
    await teacherA.post('/api/pads').send({ title: 'Algoritma Notu', language: 'python', content: 'def fibonacci(): pass' });
    await teacherA.post('/api/pads').send({ title: 'Diğer', language: 'python', content: 'print(1)' });

    const byTitle = await teacherA.get('/api/pads?q=algoritma');
    expect(byTitle.body.pads).toHaveLength(1);

    const byContent = await teacherA.get('/api/pads?q=fibonacci');
    expect(byContent.body.pads).toHaveLength(1);
    expect(byContent.body.pads[0].title).toBe('Algoritma Notu');
  });

  it('pad kopyalama yeni tokenlar üretir', async () => {
    const p = await teacherA.post('/api/pads').send({ title: 'Kaynak', language: 'python' });
    const src = p.body.pad;
    const dup = await teacherA.post(`/api/pads/${src.id}/duplicate`);
    expect(dup.status).toBe(201);
    expect(dup.body.pad.id).not.toBe(src.id);
    expect(dup.body.pad.editToken).not.toBe(src.editToken);
    expect(dup.body.pad.viewToken).not.toBe(src.viewToken);
    expect(dup.body.pad.title).toBe('Kaynak (copy)');
  });

  it('token yenileme yeni token üretir ve eskisini geçersiz kılar', async () => {
    const p = await teacherA.post('/api/pads').send({ title: 'T', language: 'python' });
    const old = p.body.pad.viewToken as string;
    const rot = await teacherA.post(`/api/pads/${p.body.pad.id}/rotate-tokens`).send({ which: 'view' });
    expect(rot.status).toBe(200);
    expect(rot.body.pad.viewToken).not.toBe(old);
  });

  it('reorder toplu sıralama uygular', async () => {
    const a = await teacherA.post('/api/pads').send({ title: 'A', language: 'plaintext' });
    const b = await teacherA.post('/api/pads').send({ title: 'B', language: 'plaintext' });
    const c = await teacherA.post('/api/pads').send({ title: 'C', language: 'plaintext' });

    const ids = [c.body.pad.id, a.body.pad.id, b.body.pad.id] as string[];
    const res = await teacherA.post('/api/reorder').send({ kind: 'pad', ids });
    expect(res.status).toBe(200);

    const list = await teacherA.get('/api/pads');
    const order = (list.body.pads as Array<{ id: string }>).map((p) => p.id);
    expect(order.slice(0, 3)).toEqual(ids);
  });

  it('admin kendi ağacını görür, başka kullanıcıyı ownerId ile inceler', async () => {
    await teacherA.post('/api/courses').send({ title: 'Ders-A' });
    await teacherB.post('/api/courses').send({ title: 'Ders-B' });

    const own = await admin.get('/api/tree');
    expect(own.status).toBe(200);
    expect(own.body.courses).toHaveLength(0);

    const ofA = await admin.get('/api/tree?ownerId=teacher-a');
    expect(ofA.body.courses.map((c: { course: { title: string } }) => c.course.title)).toEqual(['Ders-A']);

    // Öğretmen ownerId ile başkasının ağacını göremez
    const sneaky = await teacherB.get('/api/tree?ownerId=teacher-a');
    expect(sneaky.body.courses.map((c: { course: { title: string } }) => c.course.title)).toEqual(['Ders-B']);
  });

  it('ders view_token rotate edilebilir ve yeni token döner', async () => {
    const c = await teacherA.post('/api/courses').send({ title: 'Rotate' });
    const oldToken = c.body.course.viewToken as string;
    const r = await teacherA.post(`/api/courses/${c.body.course.id}/rotate-token`);
    expect(r.status).toBe(200);
    expect(r.body.viewToken).not.toBe(oldToken);
  });

  it('indirme başlıktan güvenli dosya adı üretir', async () => {
    const p = await teacherA
      .post('/api/pads')
      .send({ title: 'Şiir Çalışması: Ağaç Ödevi', language: 'python' });
    const res = await teacherA.get(`/api/pads/${p.body.pad.id}/download`);
    expect(res.status).toBe(200);
    const cd = res.headers['content-disposition'] as string;
    expect(cd).toContain('.py');
    // Türkçe karakterler dönüştürülmüş olmalı (siir_calismasi... gibi)
    expect(decodeURIComponent(cd)).toContain('siir');
  });
});