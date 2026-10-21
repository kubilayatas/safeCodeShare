import { WebSocketServer } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { Hocuspocus } from '@hocuspocus/server';
import type * as Y from 'yjs';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { findSession } from '../auth/sessions';
import { resolveAccess } from '../access/resolveAccess';
import type { PadAccessRow } from '../access/resolveAccess';
import { parseCookieHeader, collectUnlockPadIds } from '../util/cookies';
import { applyLoadedState, storePad } from './persistence';
import {
  attachPresence,
  onPresenceConnect,
  onPresenceDisconnect,
  startPresenceTicker
} from './presence';
import { addAccessChangeHandler, notifyAccessChange } from './accessNotify';
import { setCollabServer } from './singleton';
import {
  setCollabBridge,
  markDirty,
  broadcastReload,
  setTeacherCursor,
  cursorFromOffset
} from '../protect/hub';

export type CollabContext = {
  level: 'owner' | 'edit' | 'view' | 'none';
  channel: 'yjs' | 'protected' | null;
  userId?: string;
  readOnly: boolean;
};

export type HocuspocusHandle = {
  server: Hocuspocus;
  wss: WebSocketServer;
  closeDocumentConnections: (documentName: string) => void;
  destroy: () => void;
};

const COLLAB_PATH = '/collab';

type AwarenessState = {
  user?: { name?: string; color?: string; role?: string };
  broadcast?: { head?: number } | null;
};

export function buildCollabServer(db: DB, cfg: AppConfig): HocuspocusHandle {
  const server = new Hocuspocus({
    debounce: 2000,
    maxDebounce: 10000,

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onAuthenticate(data: any) {
      const { token, documentName, requestHeaders, connectionConfig } = data;
      const padRow = db
        .prepare('SELECT p.*, u.status AS owner_status FROM pads p JOIN users u ON u.id = p.owner_id WHERE p.id = ?')
        .get(documentName) as PadAccessRow | undefined;

      const cookies = parseCookieHeader(requestHeaders?.cookie);
      const sid = cookies.sid;
      let sessionUser: { id: string; role: 'admin' | 'teacher' } | null = null;

      if (sid) {
        const session = findSession(db, sid);
        if (session) {
          const u = db
            .prepare('SELECT id, role FROM users WHERE id = ?')
            .get(session.user_id) as { id: string; role: 'admin' | 'teacher' } | undefined;
          if (u) sessionUser = u;
        }
      }

      const unlockedIds = collectUnlockPadIds(cookies, cfg.COOKIE_SECRET, padRow);

      const access = resolveAccess(padRow ?? null, {
        sessionUser,
        token: token ?? null,
        unlockedPadIds: unlockedIds,
        now: Date.now()
      });

      if (access.level === 'none') {
        throw new Error(access.reason ?? 'Bu dokümana erişim yetkiniz yok');
      }

      if (access.level === 'view' && access.channel === 'protected') {
        throw new Error('Bu kod kopyalamaya kapalı; canlı akış üzerinden izlenmeli');
      }

      if (access.level === 'view' && connectionConfig) {
        connectionConfig.readOnly = true;
      }

      const ctx: CollabContext = {
        level: access.level,
        channel: access.channel,
        userId: sessionUser?.id,
        readOnly: access.level === 'view'
      };
      return ctx;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onLoadDocument(data: any) {
      const { document, documentName } = data;
      const row = db.prepare('SELECT * FROM pads WHERE id = ?').get(documentName) as
        | Parameters<typeof applyLoadedState>[1]
        | undefined;
      if (!row) return document as unknown as Y.Doc;
      applyLoadedState(document as unknown as Y.Doc, row);
      return document as unknown as Y.Doc;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onStoreDocument(data: any) {
      const { document, documentName } = data;
      storePad(db, documentName, document as unknown as Y.Doc);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onChange(data: any) {
      markDirty(data.documentName);
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onConnect(data: any) {
      onPresenceConnect(
        data.documentName,
        data.context as { level?: 'owner' | 'edit' | 'view' | 'none' }
      );
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onDisconnect(data: any) {
      onPresenceDisconnect(
        data.documentName,
        data.context as { level?: 'owner' | 'edit' | 'view' | 'none' }
      );
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async onAwarenessUpdate(data: any) {
      try {
        let cursor: { line: number; col: number; name: string; color: string } | null = null;
        const states = data.states;
        if (Array.isArray(states)) {
          for (const raw of states) {
            const st = raw as AwarenessState;
            const head = st.broadcast?.head;
            if (typeof head !== 'number') continue;
            const user = st.user ?? {};
            const info = cursorFromOffset(
              data.documentName,
              head,
              user.name ?? 'Öğretmen',
              user.color ?? '#F92672'
            );
            if (info) {
              cursor = info;
              break;
            }
          }
        }
        setTeacherCursor(data.documentName, cursor);
      } catch (err) {
        console.warn('[collab] awareness işleme hatası:', err);
      }
    }
  });

  setCollabServer(server);
  attachPresence(server);
  startPresenceTicker();

  function getLoadedDocument(padId: string): Y.Doc | null {
    const s = server as unknown as { documents?: Map<string, Y.Doc> };
    return s.documents?.get(padId) ?? null;
  }

  setCollabBridge({
    getCleanText(padId) {
      const doc = getLoadedDocument(padId);
      if (doc) {
        try {
          return doc.getText('code').toString();
        } catch {
          /* yut */
        }
      }
      const row = db.prepare('SELECT content_text FROM pads WHERE id = ?').get(padId) as
        | { content_text: string }
        | undefined;
      return row?.content_text ?? null;
    },
    getMeta(padId) {
      const doc = getLoadedDocument(padId);
      if (doc) {
        try {
          const meta = doc.getMap<string>('meta');
          const language = meta.get('language') ?? 'plaintext';
          const title = meta.get('title') ?? '';
          return { language, title };
        } catch {
          /* yut */
        }
      }
      const row = db.prepare('SELECT language, title FROM pads WHERE id = ?').get(padId) as
        | { language: string; title: string }
        | undefined;
      return row ? { language: row.language, title: row.title } : null;
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  const closeDocumentConnections = (documentName: string): void => {
    try {
      if (typeof server.closeConnections === 'function') {
        server.closeConnections(documentName);
      } else {
        console.warn('[collab] closeConnections API bulunamadı.');
      }
    } catch (err) {
      console.warn('[collab] closeConnections hatası:', err);
    }
  };

  addAccessChangeHandler((padId) => {
    closeDocumentConnections(padId);
    broadcastReload(padId);
  });

  return {
    server,
    wss,
    closeDocumentConnections,
    destroy: () => {
      try {
        wss.close();
      } catch {
        /* yut */
      }
      setCollabBridge(null);
      setCollabServer(null);
    }
  };
}

export function attachCollabToHttp(
  httpServer: HttpServer,
  handle: HocuspocusHandle,
  _cfg: AppConfig
): void {
  httpServer.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = request.url ?? '';
    if (!url.startsWith(COLLAB_PATH)) {
      socket.destroy();
      return;
    }
    handle.wss.handleUpgrade(request, socket, head, (ws) => {
      if (typeof handle.server.handleConnection === 'function') {
        handle.server.handleConnection(ws, request);
      } else {
        console.error('[collab] Hocuspocus handleConnection API bulunamadı');
        ws.close();
      }
    });
  });
}

export { notifyAccessChange };