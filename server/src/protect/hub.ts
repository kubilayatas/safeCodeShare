// Pad başına korumalı yayın merkezi (EK §D).
//
// Hub: SSE abonelerini tutar, dirty işaretlenen padleri 300 ms'lik ticker'da
// yeniden render edip zehirler, satır bazlı patch üretir ve abonelere yayınlar.
// Öğretmen imleci Hocuspocus awareness'ından gelir; köprü üzerinden okunur.
import type { Line } from './render';
import { renderLines, offsetToLineCol } from './render';
import { poisonLine, cleanColumnToPoisoned } from './poison';
import { setSSEViewerCount } from '../collab/presence';

export type CursorInfo = {
  line: number;
  col: number;
  name: string;
  color: string;
};

export type CollabBridge = {
  // Yüklü doküman varsa temiz metni, yoksa DB content_text'i döner.
  getCleanText: (padId: string) => string | null;
  // Yüklü doküman varsa meta'dan, yoksa DB'den.
  getMeta: (padId: string) => { language: string; title: string } | null;
};

let bridge: CollabBridge | null = null;
export function setCollabBridge(b: CollabBridge | null): void {
  bridge = b;
}

// Hocuspocus awareness'ından gelen son öğretmen imleci.
const teacherCursor = new Map<string, CursorInfo | null>();

export function setTeacherCursor(padId: string, c: CursorInfo | null): void {
  teacherCursor.set(padId, c);
}

export type SSEWriter = {
  send: (chunk: string) => void;
  close: () => void;
};

type PadState = {
  lines: Line[];
  version: number;
  dirty: boolean;
  language: string;
  title: string;
  subscribers: Set<SSEWriter>;
  lastCursorKey: string;
  lastPresenceKey: string;
};

const pads = new Map<string, PadState>();

function ensureState(padId: string): PadState {
  let st = pads.get(padId);
  if (!st) {
    st = {
      lines: [],
      version: 0,
      dirty: true,
      language: '',
      title: '',
      subscribers: new Set(),
      lastCursorKey: 'init',
      lastPresenceKey: 'init'
    };
    pads.set(padId, st);
  }
  return st;
}

export function markDirty(padId: string): void {
  const st = pads.get(padId);
  if (!st) return;
  st.dirty = true;
}

export function registerSubscriber(padId: string, sub: SSEWriter): void {
  const st = ensureState(padId);
  st.subscribers.add(sub);
  setSSEViewerCount(padId, st.subscribers.size);

  if (st.version > 0) {
    const snapshot = JSON.stringify({
      type: 'snapshot',
      v: st.version,
      language: st.language,
      title: st.title,
      lines: st.lines
    });
    try {
      sub.send(`data: ${snapshot}\n\n`);
    } catch {
      /* yut */
    }
  } else {
    st.dirty = true;
  }

  // Yeni katılan öğrenci öğretmen imlecini hemen görsün (eskiden ancak öğretmen
  // imleci oynatınca görünüyordu).
  const cur = teacherCursor.get(padId) ?? null;
  if (cur) {
    try {
      sub.send(`data: ${JSON.stringify({ type: 'cursor', ...cur })}\n\n`);
    } catch {
      /* yut */
    }
  }
}

export function unregisterSubscriber(padId: string, sub: SSEWriter): void {
  const st = pads.get(padId);
  if (!st) return;
  st.subscribers.delete(sub);
  setSSEViewerCount(padId, st.subscribers.size);
  if (st.subscribers.size === 0) {
    pads.delete(padId);
    // teacherCursor burada SİLİNMEZ: son öğrenci ayrılıp yeni biri bağlandığında
    // öğretmen imleci hareket etmese de görünsün. (Awareness güncellemesi zaten günceller.)
  }
}

// Yetki değişiminde: tüm abonelere reload gönder ve bağlantıları kapat.
export function broadcastReload(padId: string): void {
  const st = pads.get(padId);
  if (!st) return;
  const payload = JSON.stringify({ type: 'reload' });
  for (const sub of st.subscribers) {
    try {
      sub.send(`data: ${payload}\n\n`);
    } catch {
      /* yut */
    }
  }
  for (const sub of st.subscribers) {
    try {
      sub.close();
    } catch {
      /* yut */
    }
  }
  st.subscribers.clear();
  setSSEViewerCount(padId, 0);
  pads.delete(padId);
  teacherCursor.delete(padId);
}

// --- Ticker ---

let ticker: NodeJS.Timeout | null = null;

export function startHubTicker(): void {
  if (ticker) return;
  ticker = setInterval(() => {
    for (const [padId, st] of pads.entries()) {
      if (st.subscribers.size === 0) continue;
      try {
        tickPad(padId, st);
      } catch (err) {
        console.warn(`[hub] tick hatası (${padId}):`, err);
      }
    }
  }, 300);
  ticker.unref();
}

export function stopHubTicker(): void {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

function tickPad(padId: string, st: PadState): void {
  if (!bridge) return;

  // 1) Öğretmen imleci
  const cur = teacherCursor.get(padId) ?? null;
  const key = cur ? `${cur.line}:${cur.col}:${cur.name}:${cur.color}` : 'null';
  if (key !== st.lastCursorKey) {
    st.lastCursorKey = key;
    const payload = JSON.stringify({
      type: 'cursor',
      line: cur ? cur.line : null,
      col: cur?.col ?? null,
      name: cur?.name ?? null,
      color: cur?.color ?? null
    });
    for (const sub of st.subscribers) {
      try {
        sub.send(`data: ${payload}\n\n`);
      } catch {
        /* yut */
      }
    }
  }

  // 2) İçerik
  if (!st.dirty) return;
  const cleanText = bridge.getCleanText(padId);
  if (cleanText == null) return;
  const meta = bridge.getMeta(padId) ?? { language: st.language || 'plaintext', title: st.title };

  const rawLines = renderLines(cleanText, meta.language);
  const newLines: Line[] = rawLines.map(poisonLine);

  if (st.version === 0) {
    // İlk snapshot
    const v = 1;
    const payload = JSON.stringify({
      type: 'snapshot',
      v,
      language: meta.language,
      title: meta.title,
      lines: newLines
    });
    for (const sub of st.subscribers) {
      try {
        sub.send(`data: ${payload}\n\n`);
      } catch {
        /* yut */
      }
    }
    st.version = v;
    st.lines = newLines;
    st.language = meta.language;
    st.title = meta.title;
    st.dirty = false;
    return;
  }

  // Sonraki güncellemeler: minimal patch
  const patch = computePatch(st.lines, newLines);
  if (patch) {
    const v = st.version + 1;
    const payload = JSON.stringify({
      type: 'patch',
      v,
      from: patch.from,
      deleteCount: patch.deleteCount,
      lines: patch.lines
    });
    for (const sub of st.subscribers) {
      try {
        sub.send(`data: ${payload}\n\n`);
      } catch {
        /* yut */
      }
    }
    st.version = v;
    st.lines = newLines;
  }
  st.language = meta.language;
  st.title = meta.title;
  st.dirty = false;
}

// İki satır dizisi arasındaki en küçük değişikliği bulur.
export function computePatch(
  oldLines: Line[],
  newLines: Line[]
): { from: number; deleteCount: number; lines: Line[] } | null {
  if (linesEqual(oldLines, newLines)) return null;

  let from = 0;
  const minLen = Math.min(oldLines.length, newLines.length);
  while (from < minLen && lineEqual(oldLines[from], newLines[from])) from += 1;

  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (
    oldEnd > from &&
    newEnd > from &&
    lineEqual(oldLines[oldEnd - 1], newLines[newEnd - 1])
  ) {
    oldEnd -= 1;
    newEnd -= 1;
  }

  return {
    from,
    deleteCount: oldEnd - from,
    lines: newLines.slice(from, newEnd)
  };
}

function linesEqual(a: Line[], b: Line[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!lineEqual(a[i], b[i])) return false;
  }
  return true;
}

function lineEqual(a: Line, b: Line): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
}

// Hocuspocus awareness durumundan gelen `broadcast.head` offset'ini satır/sütuna çevirir.
export function cursorFromOffset(
  padId: string,
  offset: number,
  name: string,
  color: string
): CursorInfo | null {
  if (!bridge) return null;
  const text = bridge.getCleanText(padId);
  if (text == null) return null;
  const { line, col } = offsetToLineCol(text, offset);
  // Zehirli metinde TAB 4 karakter olduğundan sütunu ona göre çevir.
  const lineText = text.split('\n')[line - 1] ?? '';
  return { line, col: cleanColumnToPoisoned(lineText, col), name, color };
}