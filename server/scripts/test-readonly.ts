// View token ile bağlanan kullanıcının Yjs üzerinden yazamadığını kanıtlar.
// PASS/FAIL yazdırır, uygun exit code ile döner.
//
// Çalışma yöntemi:
//   1) Geçici DATA_DIR ile sunucuyu alt süreç olarak başlat
//   2) HTTP login → cookie
//   3) Pad oluştur (edit_enabled=0, view_enabled=1, copy_protect=0)
//   4) View token ile HocuspocusProvider bağlan, insert dene
//   5) Bağlantıyı kapat (storeDocument tetiklenir)
//   6) Owner oturumu ile GET /api/pads/:id → contentText'te 'HACK' YOK mu?
//   7) PASS/FAIL yazdır, exit code ile dön

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

const require = createRequire(import.meta.url);
const tsxCli = require.resolve('tsx/cli');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'safecodeshare-ro-'));
const PORT = 3400 + Math.floor(Math.random() * 500);

type CookieJar = { sid: string | null };

async function waitForHealth(timeoutMs = 30000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
      if (res.ok) return;
    } catch {
      /* henüz ayakta değil */
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Sunucu zamanında ayaklanmadı');
}

async function login(jar: CookieJar, email: string, password: string): Promise<void> {
  const res = await fetch(`http://127.0.0.1:${PORT}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`Giriş başarısız: ${res.status}`);
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const sidCookie = setCookies.find((c) => c.startsWith('sid='));
  if (!sidCookie) throw new Error('sid çerezi alınamadı');
  jar.sid = sidCookie.split(';')[0]!.slice('sid='.length);
}

async function withAuth<T>(jar: CookieJar, pathname: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (jar.sid) headers.set('Cookie', `sid=${jar.sid}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(`http://127.0.0.1:${PORT}${pathname}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${init.method ?? 'GET'} ${pathname} → ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

async function createPad(jar: CookieJar): Promise<{
  id: string;
  editToken: string;
  viewToken: string;
}> {
  const body = {
    title: 'RO Test Pad',
    language: 'plaintext',
    content: 'baslangic\n'
  };
  const res = await withAuth<{ pad: { id: string; editToken: string; viewToken: string } }>(
    jar,
    '/api/pads',
    { method: 'POST', body: JSON.stringify(body) }
  );
  await withAuth(jar, `/api/pads/${res.pad.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ copyProtect: false })
  });
  return { id: res.pad.id, editToken: res.pad.editToken, viewToken: res.pad.viewToken };
}

async function fetchPadContent(jar: CookieJar, padId: string): Promise<string> {
  const res = await withAuth<{ pad: { contentText: string } }>(jar, `/api/pads/${padId}`);
  return res.pad.contentText;
}

async function connectAndTryInsert(
  padId: string,
  token: string,
  text: string,
  waitMs: number
): Promise<{ synced: boolean; authFailed: boolean; authErr?: string }> {
  const ydoc = new Y.Doc();
  let synced = false;
  let authFailed = false;
  let authErr: string | undefined;

  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${PORT}/collab`,
    name: padId,
    token,
    document: ydoc,
    onSynced: () => {
      synced = true;
    },
    onAuthenticationFailed: (data: { reason?: string }) => {
      authFailed = true;
      authErr = data?.reason;
    }
  });

  // synced veya authFailed için bekle
  const deadline = Date.now() + 5000;
  while (!synced && !authFailed && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }

  if (synced) {
    ydoc.getText('code').insert(0, text);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  provider.destroy();
  ydoc.destroy();
  return { synced, authFailed, authErr };
}

async function main(): Promise<void> {
  const env = {
    ...process.env,
    NODE_ENV: 'test' as const,
    PORT: String(PORT),
    PUBLIC_URL: `http://127.0.0.1:${PORT}`,
    APP_NAME: 'SafeCodeShareRO',
    DATA_DIR: TMP_DIR,
    COOKIE_SECRET: 'x'.repeat(32),
    SESSION_DAYS: '30',
    ADMIN_EMAIL: 'ro@test.local',
    ADMIN_PASSWORD: 'RoPass123!',
    ADMIN_NAME: 'RO Tester'
  };

  const proc = spawn(process.execPath, [tsxCli, 'src/index.ts'], {
    cwd: serverRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverLog = '';
  proc.stdout?.on('data', (d) => {
    serverLog += d.toString();
  });
  proc.stderr?.on('data', (d) => {
    serverLog += d.toString();
  });

  let pass = true;
  const lines: string[] = [];

  try {
    await waitForHealth();
    lines.push('[1] Sunucu ayakta');

    const jar: CookieJar = { sid: null };
    await login(jar, 'ro@test.local', 'RoPass123!');
    lines.push('[2] HTTP girişi başarılı');

    const pad = await createPad(jar);
    lines.push(`[3] Test pad oluşturuldu: ${pad.id}`);

    // (a) View token ile bağlan ve insert dene
    const viewResult = await connectAndTryInsert(pad.id, pad.viewToken, 'HACK', 800);
    if (!viewResult.synced) {
      pass = false;
      lines.push(`[4] HATA: view token bağlantısı synced olmadı (authFailed=${viewResult.authFailed})`);
    } else {
      lines.push('[4] View token ile bağlandı ve insert denendi');
    }

    // (b) Store debounce'unu bekle
    await new Promise((r) => setTimeout(r, 2600));

    // (c) Sahip olarak içeriği çek
    const content = await fetchPadContent(jar, pad.id);
    if (content.includes('HACK')) {
      pass = false;
      lines.push('[5] HATA: İçerikte "HACK" bulundu — view yazma engellenmedi!');
    } else {
      lines.push('[5] İçerikte "HACK" yok — view salt okunur doğrulandı');
    }

    // (d) Edit token ile bağlanıp yazabildiğimizi de doğrula (edit_enabled=1 yap)
    await withAuth(jar, `/api/pads/${pad.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ editEnabled: true })
    });
    const editResult = await connectAndTryInsert(pad.id, pad.editToken, 'EDIT_OK', 800);
    if (!editResult.synced) {
      pass = false;
      lines.push(`[6] HATA: edit token bağlantısı synced olmadı (authErr=${editResult.authErr})`);
    } else {
      await new Promise((r) => setTimeout(r, 2600));
      const c2 = await fetchPadContent(jar, pad.id);
      if (!c2.includes('EDIT_OK')) {
        pass = false;
        lines.push('[6] HATA: edit yazma uygulanmadı');
      } else {
        lines.push('[6] Edit token ile yazma başarılı');
      }
    }
  } catch (err) {
    pass = false;
    lines.push(`[!] İstisna: ${err instanceof Error ? err.message : String(err)}`);
    if (serverLog) lines.push('--- sunucu log (son 500) ---\n' + serverLog.slice(-500));
  } finally {
    proc.kill('SIGTERM');
    try {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    } catch {
      /* yut */
    }
  }

  for (const l of lines) console.log(l);
  console.log(pass ? 'PASS' : 'FAIL');
  process.exit(pass ? 0 : 1);
}

void main();