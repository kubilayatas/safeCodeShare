import type { Hocuspocus } from '@hocuspocus/server';

export type PresenceCount = { owners: number; editors: number; viewers: number };

type Ctx = { level?: 'owner' | 'edit' | 'view' | 'none' };

const counts = new Map<string, PresenceCount>();
const extraViewers = new Map<string, number>();
let serverRef: Hocuspocus | null = null;

function empty(): PresenceCount {
  return { owners: 0, editors: 0, viewers: 0 };
}

export function attachPresence(server: Hocuspocus): void {
  serverRef = server;
}

function current(documentName: string): PresenceCount {
  const base = counts.get(documentName) ?? empty();
  const extra = extraViewers.get(documentName) ?? 0;
  return { owners: base.owners, editors: base.editors, viewers: base.viewers + extra };
}

function broadcast(documentName: string): void {
  if (!serverRef) return;
  const s = serverRef as unknown as {
    documents?: Map<string, { broadcastStateless?: (payload: string) => void }>;
  };
  const c = current(documentName);
  const payload = JSON.stringify({
    type: 'presence',
    owners: c.owners,
    editors: c.editors,
    viewers: c.viewers
  });
  const doc = s.documents?.get(documentName);
  if (doc?.broadcastStateless) {
    try {
      doc.broadcastStateless(payload);
    } catch (err) {
      console.warn('[presence] broadcastStateless hatası:', err);
    }
  }
}

export function onPresenceConnect(documentName: string, ctx: Ctx | undefined): void {
  const c = counts.get(documentName) ?? empty();
  const level = ctx?.level ?? 'view';
  if (level === 'owner') c.owners += 1;
  else if (level === 'edit') c.editors += 1;
  else c.viewers += 1;
  counts.set(documentName, c);
  broadcast(documentName);
}

export function onPresenceDisconnect(documentName: string, ctx: Ctx | undefined): void {
  const c = counts.get(documentName);
  if (!c) return;
  const level = ctx?.level ?? 'view';
  if (level === 'owner') c.owners = Math.max(0, c.owners - 1);
  else if (level === 'edit') c.editors = Math.max(0, c.editors - 1);
  else c.viewers = Math.max(0, c.viewers - 1);
  if (c.owners === 0 && c.editors === 0 && c.viewers === 0) counts.delete(documentName);
  else counts.set(documentName, c);
  broadcast(documentName);
}

// SSE abone sayısı değiştiğinde hub çağırır.
export function setSSEViewerCount(documentName: string, n: number): void {
  if (n <= 0) extraViewers.delete(documentName);
  else extraViewers.set(documentName, n);
  broadcast(documentName);
}

export function getPresence(documentName: string): PresenceCount {
  return current(documentName);
}

// 10 saniyede bir tekrar yayınla
export function startPresenceTicker(): NodeJS.Timeout {
  const t = setInterval(() => {
    const names = new Set<string>([...counts.keys(), ...extraViewers.keys()]);
    for (const name of names) broadcast(name);
  }, 10_000);
  t.unref();
  return t;
}