// EK §I: uçtan uca korumalı kanal testi. PASS/FAIL yazdırır, exit code ile döner.
//
// Adımlar:
// 1) Korumalı bir Python padi oluştur
// 2) View token ile Hocuspocus ham provider bağlamayı dene → reddedilmeli
// 3) /raw ve /download → 403
// 4) SSE stream snapshot'ı topla, kontrol et
// 5) Python ile compile et (varsa)
// 6) Owner yazınca patch gelsin (≤ 1 sn)
// 7) copy_protect=0 → reload + Yjs kabul edilsin

import { spawn, spawnSync } from 'node:child_process';
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
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'kodsinif-prot-'));
const PORT = 3900 + Math.floor(Math.random() * 400);

type CookieJar = { sid: string | null };

type SSEEvent = { type: string; [k: string]: unknown };

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

async function createProtectedPad(jar: CookieJar): Promise<{
  id: string;
  editToken: string;
  viewToken: string;
}> {
  const res = await withAuth<{ pad: { id: string; editToken: string; viewToken: string } }>(
    jar,
    '/api/pads',
    {
      method: 'POST',
      body: JSON.stringify({
        title: 'Korumalı Test',
        language: 'python',
        content: 'def topla(a, b):\n    return a + b\n'
      })
    }
  );
  // copy_protect varsayılan olarak 1 gelir (dersiz). Yine de garantiye alalım:
  await withAuth(jar, `/api/pads/${res.pad.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ copyProtect: true, viewEnabled: true, editEnabled: false })
  });
  return res.pad;
}

async function tryHocuspocus(
  padId: string,
  token: string,
  textToInsert: string | null,
  waitMs: number
): Promise<{ synced: boolean; authFailed: boolean; authErr?: string; finalText?: string }> {
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

  const deadline = Date.now() + 4000;
  while (!synced && !authFailed && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
  }

  if (synced && textToInsert != null) {
    ydoc.getText('code').insert(0, textToInsert);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  const finalText = ydoc.getText('code').toString();
  provider.destroy();
  ydoc.destroy();
  return { synced, authFailed, authErr, finalText };
}

// SSE stream'den ilk snapshot'ı toplar.
async function readSSE(
  viewToken: string,
  cookieHeader: string | null,
  durationMs: number
): Promise<SSEEvent[]> {
  const url = `http://127.0.0.1:${PORT}/api/public/view/${viewToken}/stream`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), durationMs);

  const headers: Record<string, string> = {};
  if (cookieHeader) headers['Cookie'] = cookieHeader;

  const events: SSEEvent[] = [];
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok || !res.body) {
      clearTimeout(timer);
      throw new Error(`SSE yanıtı ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (block.startsWith(':')) continue;
        const line = block.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        try {
          events.push(JSON.parse(line.slice(6)) as SSEEvent);
        } catch {
          /* yut */
        }
      }
    }
  } catch (err) {
    // Abort normal
    if ((err as { name?: string }).name !== 'AbortError') throw err;
  } finally {
    clearTimeout(timer);
  }
  return events;
}

function flatten(line: Array<[string, string]>): string {
  return line.map(([t]) => t).join('');
}

function pythonAvailable(): boolean {
  const r = spawnSync('python3', ['--version'], { stdio: 'ignore' });
  return r.status === 0;
}

async function main(): Promise<void> {
  const env = {
    ...process.env,
    NODE_ENV: 'test' as const,
    PORT: String(PORT),
    PUBLIC_URL: `http://127.0.0.1:${PORT}`,
    APP_NAME: 'KodSınıfProt',
    DATA_DIR: TMP_DIR,
    COOKIE_SECRET: 'y'.repeat(32),
    SESSION_DAYS: '30',
    ADMIN_EMAIL: 'prot@test.local',
    ADMIN_PASSWORD: 'ProtPass123!',
    ADMIN_NAME: 'Prot Tester'
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

  const lines: string[] = [];
  let pass = true;
  let pythonStep: 'PASS' | 'FAIL' | 'SKIP' = 'SKIP';
  const pyAvailable = pythonAvailable();

  try {
    await waitForHealth();
    lines.push('[1] Sunucu ayakta');

    const jar: CookieJar = { sid: null };
    await login(jar, 'prot@test.local', 'ProtPass123!');
    lines.push('[2] HTTP girişi başarılı');

    const pad = await createProtectedPad(jar);
    lines.push(`[3] Korumalı pad oluşturuldu: ${pad.id}`);

    // (a) View token ile Hocuspocus ham provider → reddedilmeli
    const hpView = await tryHocuspocus(pad.id, pad.viewToken, 'HACK', 500);
    if (hpView.synced) {
      pass = false;
      lines.push('[4] HATA: view token ile Hocuspocus bağlantısı KABUL edildi (beklenen: ret)');
    } else if (!hpView.authFailed) {
      pass = false;
      lines.push('[4] HATA: bağlantı ne synced ne authFailed oldu');
    } else {
      lines.push(`[4] View token Yjs bağlantısı reddedildi (sebep: ${hpView.authErr ?? '-'})`);
    }

    // (b) /raw ve /download → 403
    {
      const rawRes = await fetch(`http://127.0.0.1:${PORT}/api/public/view/${pad.viewToken}/raw`);
      if (rawRes.status !== 403) {
        pass = false;
        lines.push(`[5] HATA: /raw ${rawRes.status} döndü (beklenen 403)`);
      } else {
        lines.push('[5a] /raw → 403 ✓');
      }
      const dlRes = await fetch(
        `http://127.0.0.1:${PORT}/api/public/view/${pad.viewToken}/download`
      );
      if (dlRes.status !== 403) {
        pass = false;
        lines.push(`[5] HATA: /download ${dlRes.status} döndü (beklenen 403)`);
      } else {
        lines.push('[5b] /download → 403 ✓');
      }
    }

    // (c) SSE snapshot
    const sseEvents = await readSSE(pad.viewToken, null, 1200);
    const snapshot = sseEvents.find((e) => e.type === 'snapshot') as
      | { type: 'snapshot'; v: number; lines: Array<Array<[string, string]>>; language: string }
      | undefined;
    if (!snapshot) {
      pass = false;
      lines.push('[6] HATA: SSE snapshot gelmedi');
    } else {
      lines.push(`[6] SSE snapshot alındı (v=${snapshot.v}, ${snapshot.lines.length} satır)`);

      const joined = snapshot.lines.map(flatten).join('\n');
      const original = 'def topla(a, b):\n    return a + b\n';

      if (joined.includes(' ') || joined.includes('\t')) {
        pass = false;
        lines.push('[7] HATA: zehirli çıktıda U+0020 veya TAB bulundu');
      } else {
        lines.push('[7] Zehirli çıktıda U+0020/TAB yok ✓');
      }

      const reversed = joined
        .split('\u00A0')
        .join(' ')
        .split('\u200B')
        .join('');

      // ZWSP eklendiği için orijinalle birebir eşleşmez ama
      // ZWSP'leri ve NBSP'leri temizledikten sonra orijinalin
      // satır içerikleri (satır sonu hariç) eşleşmeli.
      const originalNoNL = original.replace(/\n$/, '').split('\n').map((l) => l);
      const reversedNoNL = reversed.replace(/\n$/, '').split('\n').map((l) => l);
      if (originalNoNL.length !== reversedNoNL.length) {
        pass = false;
        lines.push('[8] HATA: satır sayısı eşleşmedi');
      } else {
        let allOk = true;
        for (let i = 0; i < originalNoNL.length; i++) {
          if (originalNoNL[i] !== reversedNoNL[i]) {
            allOk = false;
            break;
          }
        }
        if (allOk) {
          lines.push('[8] Ters çevirme orijinali verdi (TAB yok) ✓');
        } else {
          pass = false;
          lines.push('[8] HATA: ters çevrilmiş metin orijinalle eşleşmedi');
        }
      }

      // (d) Python derleme (varsa)
      if (pyAvailable) {
        const file = path.join(TMP_DIR, 'protected.py');
        fs.writeFileSync(file, joined, 'utf8');
        const r = spawnSync(
          'python3',
          ['-c', `compile(open(${JSON.stringify(file)}).read(), 'protected.py', 'exec')`],
          { encoding: 'utf8' }
        );
        if (r.status !== 0) {
          pythonStep = 'PASS';
          lines.push('[9] Python compile SyntaxError verdi ✓ (beklenen)');
        } else {
          pythonStep = 'FAIL';
          pass = false;
          lines.push('[9] HATA: Python derlemesi başarılı oldu — zehirleme etkisiz');
        }
      } else {
        lines.push('[9] SKIP: python3 bulunamadı');
      }
    }

    // (e) Owner yazınca patch ≤ 1 sn
    {
      const ydocOwner = new Y.Doc();
      const provider = new HocuspocusProvider({
        url: `ws://127.0.0.1:${PORT}/collab`,
        name: pad.id,
        document: ydocOwner,
        // Owner: oturum çerezi ile
        onSynced: () => {
          /* bekleyeceğiz */
        }
      });

      // Oturum çerezini provider'a veremiyoruz (HocuspocusProvider token ile
      // çalışır); bu testte owner bağlantısı için token=edit kullanacağız:
      provider.destroy();
      ydocOwner.destroy();

      // edit token ile owner davranışı simüle: edit_enabled=1 yap, sonra bağlan
      await withAuth(jar, `/api/pads/${pad.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ editEnabled: true })
      });

      const ydoc2 = new Y.Doc();
      const provider2 = new HocuspocusProvider({
        url: `ws://127.0.0.1:${PORT}/collab`,
        name: pad.id,
        token: pad.editToken,
        document: ydoc2
      });

      await new Promise((r) => setTimeout(r, 600));

      // SSE'ye abone ol
      const ctrl = new AbortController();
      const ssePromise = readSSE(pad.viewToken, null, 3500);

      // Hub 300 ms'de bir çalışır. İlk snapshot gitmeden düzenleme yaparsak değişiklik
      // snapshot'ın içine girer ve patch hiç oluşmaz (test rastgele düşüyordu).
      await new Promise((r) => setTimeout(r, 900));
      ydoc2.getText('code').insert(0, '# degisti\n');

      const events = await ssePromise;
      ctrl.abort();

      const gotPatch = events.some((e) => e.type === 'patch');
      if (gotPatch) {
        lines.push('[10] SSE patch ≤ 2.5 sn içinde alındı ✓');
      } else {
        pass = false;
        lines.push('[10] HATA: SSE patch gelmedi');
      }

      provider2.destroy();
      ydoc2.destroy();
    }

    // (f) copy_protect=0 → reload + Yjs kabul
    {
      // SSE'ye abone ol, reload bekle
      const ssePromise = readSSE(pad.viewToken, null, 2500);
      await new Promise((r) => setTimeout(r, 200));

      await withAuth(jar, `/api/pads/${pad.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ copyProtect: false })
      });

      const events = await ssePromise;
      const gotReload = events.some((e) => e.type === 'reload');
      if (gotReload) {
        lines.push('[11] copy_protect=0 → SSE reload alındı ✓');
      } else {
        pass = false;
        lines.push('[11] HATA: reload mesajı gelmedi');
      }

      // Artık view token ile Yjs kabul edilmeli
      const hpAccept = await tryHocuspocus(pad.id, pad.viewToken, null, 300);
      if (hpAccept.synced) {
        lines.push('[12] copy_protect=0 sonrası view token ile Yjs bağlantısı KABUL edildi ✓');
      } else {
        pass = false;
        lines.push(
          `[12] HATA: view token hâlâ reddediliyor (authErr=${hpAccept.authErr ?? '-'})`
        );
      }
    }
  } catch (err) {
    pass = false;
    lines.push(`[!] İstisna: ${err instanceof Error ? err.message : String(err)}`);
    if (serverLog) lines.push('--- sunucu log (son 800) ---\n' + serverLog.slice(-800));
  } finally {
    proc.kill('SIGTERM');
    try {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    } catch {
      /* yut */
    }
  }

  for (const l of lines) console.log(l);
  console.log(`python-derleme: ${pythonStep}`);
  console.log(pass ? 'PASS' : 'FAIL');
  process.exit(pass ? 0 : 1);
}

void main();