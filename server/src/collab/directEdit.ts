// REST üzerinden Yjs dokümanına doğrudan müdahale.
// Meta alanlarını güncelle, metni fast-diff ile minimal değişiklik olarak uygula.
import type { Hocuspocus } from '@hocuspocus/server';
import diff from 'fast-diff';
import type * as Y from 'yjs';

export type DirectConnection = {
  transact: (fn: (doc: Y.Doc) => void) => Promise<void> | void;
  disconnect: () => Promise<void> | void;
};

export type DirectEditServer = Hocuspocus & {
  openDirectConnection?: (
    documentName: string,
    context?: unknown
  ) => Promise<DirectConnection>;
};

export async function updateMeta(
  server: Hocuspocus,
  documentName: string,
  meta: { language?: string; title?: string }
): Promise<void> {
  const s = server as DirectEditServer;
  if (typeof s.openDirectConnection !== 'function') return;
  let conn: DirectConnection | null = null;
  try {
    conn = await s.openDirectConnection(documentName, { source: 'rest-meta' });
    await conn.transact((doc) => {
      const m = doc.getMap<string>('meta');
      if (meta.language !== undefined) m.set('language', meta.language);
      if (meta.title !== undefined) m.set('title', meta.title);
    });
  } catch {
    /* doküman yüklü değilse yut */
  } finally {
    try {
      await conn?.disconnect();
    } catch {
      /* yut */
    }
  }
}

// Metni fast-diff ile minimal değişiklik olarak uygula.
export async function applyTextDiff(
  server: Hocuspocus,
  documentName: string,
  newText: string
): Promise<void> {
  const s = server as DirectEditServer;
  if (typeof s.openDirectConnection !== 'function') return;
  let conn: DirectConnection | null = null;
  try {
    conn = await s.openDirectConnection(documentName, { source: 'rest-restore' });
    await conn.transact((doc) => {
      const ytext = doc.getText('code');
      const current = ytext.toString();
      if (current === newText) return;
      const pieces = diff(current, newText);
      let pos = 0;
      for (const [op, text] of pieces) {
        if (op === diff.DELETE) {
          ytext.delete(pos, text.length);
        } else if (op === diff.INSERT) {
          ytext.insert(pos, text);
          pos += text.length;
        } else {
          pos += text.length;
        }
      }
    });
  } finally {
    try {
      await conn?.disconnect();
    } catch {
      /* yut */
    }
  }
}