// Route'lar ile Hocuspocus + hub arasında tek yönlü bildirim kanalı.
// Pads/courses route'ları PATCH/DELETE/rotate sonrası `notifyAccessChange(padId)` çağırır.

export type AccessChangeHandler = (padId: string) => void;

const handlers: AccessChangeHandler[] = [];

export function addAccessChangeHandler(h: AccessChangeHandler): () => void {
  handlers.push(h);
  return () => {
    const i = handlers.indexOf(h);
    if (i >= 0) handlers.splice(i, 1);
  };
}

export function notifyAccessChange(padId: string): void {
  for (const h of handlers) {
    try {
      h(padId);
    } catch (err) {
      console.warn('[accessNotify] handler hatası:', err);
    }
  }
}