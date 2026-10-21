// Takip modu: öğretmen "📡 Yayın" açtığında awareness üzerinden `broadcast.head`
// alanını günceller; izleyiciler bu alanı okuyup kendi editörlerini kaydırır.

import { EditorView } from '@codemirror/view';
import type { Awareness } from 'y-protocols/awareness';

const BROADCAST_THROTTLE_MS = 100;
const RESUME_AFTER_MS = 8000;

export type AwarenessUser = {
  name?: string;
  color?: string;
  role?: 'teacher' | 'editor' | 'viewer';
};

export type AwarenessBroadcast = {
  head?: number;
} | null;

export type AwarenessState = {
  user?: AwarenessUser;
  broadcast?: AwarenessBroadcast;
  cursor?: { anchor?: number; head?: number } | null;
};

// --- Öğretmen tarafı: broadcast.head üretimi ---

export type BroadcastController = {
  enable: () => void;
  disable: () => void;
  destroy: () => void;
  isEnabled: () => boolean;
};

export function createBroadcastController(
  view: EditorView,
  awareness: Awareness
): BroadcastController {
  let enabled = false;
  let timer: number | null = null;
  let lastSent = -1;

  const send = (): void => {
    if (!enabled) return;
    try {
      const head = view.state.selection.main.head;
      if (head === lastSent) return;
      lastSent = head;
      awareness.setLocalStateField('broadcast', { head });
    } catch {
      /* yut */
    }
  };

  const throttled = (): void => {
    if (timer != null) return;
    timer = window.setTimeout(() => {
      timer = null;
      send();
    }, BROADCAST_THROTTLE_MS);
  };

  const listener = (): void => {
    if (enabled) throttled();
  };

  view.dom.addEventListener('keyup', listener);
  view.dom.addEventListener('mouseup', listener);
  view.dom.addEventListener('click', listener);

  return {
    enable: () => {
      enabled = true;
      lastSent = -1;
      send();
    },
    disable: () => {
      enabled = false;
      try {
        awareness.setLocalStateField('broadcast', null);
      } catch {
        /* yut */
      }
    },
    destroy: () => {
      enabled = false;
      if (timer != null) window.clearTimeout(timer);
      view.dom.removeEventListener('keyup', listener);
      view.dom.removeEventListener('mouseup', listener);
      view.dom.removeEventListener('click', listener);
      try {
        awareness.setLocalStateField('broadcast', null);
      } catch {
        /* yut */
      }
    },
    isEnabled: () => enabled
  };
}

// --- İzleyici tarafı: teacher head'ini oku ve kaydır ---

export type FollowController = {
  setEnabled: (b: boolean) => void;
  isEnabled: () => boolean;
  isPaused: () => boolean;
  resume: () => void;
  destroy: () => void;
};

export function createFollowController(view: EditorView, awareness: Awareness): FollowController {
  let enabled = true; // izleyicide varsayılan açık
  let paused = false;
  let pauseTimer: number | null = null;
  let lastTeacherHead = -1;
  let lastAppliedHead = -1;

  const pause = (): void => {
    paused = true;
    if (pauseTimer != null) window.clearTimeout(pauseTimer);
    pauseTimer = window.setTimeout(() => {
      paused = false;
      pauseTimer = null;
      maybeScroll();
    }, RESUME_AFTER_MS);
  };

  const maybeScroll = (): void => {
    if (!enabled || paused) return;
    const head = lastTeacherHead;
    if (head < 0) return;
    if (head === lastAppliedHead) return;
    if (head > view.state.doc.length) return;
    lastAppliedHead = head;
    try {
      view.dispatch({
        effects: EditorView.scrollIntoView(head, { y: 'center' })
      });
    } catch {
      /* yut */
    }
  };

  const readTeacherHead = (): number => {
    const states = awareness.getStates() as Map<number, AwarenessState>;
    const selfId = awareness.clientID;
    let head = -1;
    for (const [clientId, st] of states.entries()) {
      if (clientId === selfId) continue;
      const role = st.user?.role;
      const bh = st.broadcast?.head;
      if (role === 'teacher' && typeof bh === 'number') {
        head = bh;
        break;
      }
    }
    return head;
  };

  const onAwarenessChange = (): void => {
    const h = readTeacherHead();
    if (h === lastTeacherHead) return;
    lastTeacherHead = h;
    maybeScroll();
  };

  awareness.on('change', onAwarenessChange);
  // İlk state okuması
  onAwarenessChange();

  // Kullanıcı elle kaydırırsa takibi duraklat
  const onScroll = (): void => {
    if (!enabled) return;
    pause();
  };
  const onWheel = (): void => {
    if (!enabled) return;
    pause();
  };
  const onKeydown = (e: KeyboardEvent): void => {
    if (!enabled) return;
    // Kaydırma kısayolları
    if (
      e.key === 'PageUp' ||
      e.key === 'PageDown' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      // modifier'sız olanlar
      if (!e.ctrlKey && !e.metaKey && !e.altKey) pause();
    }
  };

  view.scrollDOM.addEventListener('scroll', onScroll, { passive: true });
  view.scrollDOM.addEventListener('wheel', onWheel, { passive: true });
  view.dom.addEventListener('keydown', onKeydown);

  return {
    setEnabled: (b: boolean) => {
      enabled = b;
      if (enabled) {
        paused = false;
        lastAppliedHead = -1;
        maybeScroll();
      }
    },
    isEnabled: () => enabled,
    isPaused: () => paused,
    resume: () => {
      paused = false;
      lastAppliedHead = -1;
      maybeScroll();
    },
    destroy: () => {
      if (pauseTimer != null) window.clearTimeout(pauseTimer);
      awareness.off('change', onAwarenessChange);
      view.scrollDOM.removeEventListener('scroll', onScroll);
      view.scrollDOM.removeEventListener('wheel', onWheel);
      view.dom.removeEventListener('keydown', onKeydown);
    }
  };
}