import { useEffect, useMemo, useRef, useState } from 'react';
import { decorateLine, decoyWidthFor } from '../editor/ocrDecoys';

// EK §F: Koruma açık view token için CodeMirror KULLANMAYAN özel görüntüleyici.
// SSE üzerinden snapshot + patch alır, satır satır <div> render eder,
// kopyalama engellerini birlikte uygular.

type Span = [text: string, cls: string];
type Line = Span[];

export type ProtectedSnapshot = {
  type: 'snapshot';
  v: number;
  language: string;
  title: string;
  lines: Line[];
};

type Patch = {
  type: 'patch';
  v: number;
  from: number;
  deleteCount: number;
  lines: Line[];
};

type CursorMsg = {
  type: 'cursor';
  line: number | null;
  col: number | null;
  name: string | null;
  color: string | null;
};

type PresenceMsg = {
  type: 'presence';
  owners: number;
  editors: number;
  viewers: number;
};

type ReloadMsg = { type: 'reload' };

type AnyMsg = ProtectedSnapshot | Patch | CursorMsg | PresenceMsg | ReloadMsg;

export type ProtectedConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type ProtectedPresence = { owners: number; editors: number; viewers: number };

export type ProtectedTeacherCursor = {
  line: number;
  col: number;
  name: string;
  color: string;
} | null;

type Props = {
  viewToken: string;
  /** AI/OCR koruması: 0 kapalı, 1 hafif, 2 güçlü */
  ocrLevel?: number;
  language?: string;
  fontSize: number;
  lineWrapping: boolean;
  followEnabled: boolean;
  onConnectionStatus?: (s: ProtectedConnectionStatus) => void;
  onPresence?: (p: ProtectedPresence) => void;
  onTeacherCursor?: (c: ProtectedTeacherCursor) => void;
  onLanguageResolved?: (language: string) => void;
  onTitleResolved?: (title: string) => void;
  onReload?: () => void;
};

// 2000 satırı aşarsa basit sanallaştırma uygula.
const VIRTUALIZE_THRESHOLD = 2000;

// Satır yüksekliği yazı boyutuyla birlikte büyümeli; sabit 22px büyük yazıda satırları üst üste bindiriyordu.
function lineHeightFor(fontSize: number): number {
  return Math.round(fontSize * 1.5);
}

export default function ProtectedCodeView({
  viewToken,
  ocrLevel = 0,
  language = 'plaintext',
  fontSize,
  lineWrapping,
  followEnabled,
  onConnectionStatus,
  onPresence,
  onTeacherCursor,
  onLanguageResolved,
  onTitleResolved,
  onReload
}: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  // Son uygulanan sürüm. State yerine ref: SSE dinleyicisi tek sefer kurulduğu için
  // state kullanılırsa hep ilk değeri (0) görüyordu ve sürüm atlaması fark edilmiyordu.
  const versionRef = useRef(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [cursor, setCursor] = useState<ProtectedTeacherCursor>(null);
  const [paused, setPaused] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const followRef = useRef(followEnabled);
  const cursorRef = useRef<ProtectedTeacherCursor>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const lastAppliedLineRef = useRef<number | null>(null);

  followRef.current = followEnabled;
  cursorRef.current = cursor;

  // --- SSE ---
  useEffect(() => {
    let cancelled = false;
    onConnectionStatus?.('connecting');
    const es = new EventSource(`/api/public/view/${viewToken}/stream`);
    esRef.current = es;

    es.onopen = () => {
      if (cancelled) return;
      onConnectionStatus?.('connected');
    };

    es.onerror = () => {
      if (cancelled) return;
      onConnectionStatus?.('disconnected');
    };

    es.onmessage = (ev) => {
      if (cancelled) return;
      let msg: AnyMsg;
      try {
        msg = JSON.parse(ev.data) as AnyMsg;
      } catch {
        return;
      }

      if (msg.type === 'snapshot') {
        setLines(msg.lines);
        versionRef.current = msg.v;
        onLanguageResolved?.(msg.language);
        onTitleResolved?.(msg.title);
        return;
      }
      if (msg.type === 'patch') {
        // Sürüm atlaması varsa bağlantıyı yenile
        if (versionRef.current === 0 || msg.v !== versionRef.current + 1) {
          // Arada bir yama kaçırıldı: temiz bir snapshot için sayfayı yenile.
          es.close();
          window.location.reload();
          return;
        }
        setLines((prev) => {
          const next = prev.slice();
          next.splice(msg.from, msg.deleteCount, ...msg.lines);
          return next;
        });
        versionRef.current = msg.v;
        return;
      }
      if (msg.type === 'cursor') {
        if (msg.line == null) {
          setCursor(null);
          onTeacherCursor?.(null);
        } else {
          const c: ProtectedTeacherCursor = {
            line: msg.line,
            col: msg.col ?? 1,
            name: msg.name ?? 'Öğretmen',
            color: msg.color ?? '#F92672'
          };
          setCursor(c);
          onTeacherCursor?.(c);
        }
        return;
      }
      if (msg.type === 'presence') {
        onPresence?.({ owners: msg.owners, editors: msg.editors, viewers: msg.viewers });
        return;
      }
      if (msg.type === 'reload') {
        onReload?.();
        return;
      }
    };

    return () => {
      cancelled = true;
      try {
        es.close();
      } catch {
        /* yut */
      }
      esRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewToken]);

  // --- Kopyalama engelleri ---
  useEffect(() => {
    const isFormField = (t: EventTarget | null): boolean =>
      t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

    const prevent = (e: Event): void => {
      if (e.type === 'selectstart' && isFormField(e.target)) return;
      e.preventDefault();
    };

    const onCopy = (e: ClipboardEvent): void => {
      e.preventDefault();
      try {
        e.clipboardData?.setData(
          'text/plain',
          'Bu kodu kopyalamak yerine elle yazmalısın ✍️'
        );
      } catch {
        /* yut */
      }
    };

    const onKeydown = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      // Ayarlar panelindeki takma ad gibi alanlarda normal klavye kısayolları çalışsın.
      if (isFormField(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'c' || k === 'x' || k === 's' || k === 'p') {
        // Ctrl+F'ye izin ver
        e.preventDefault();
      }
    };

    document.addEventListener('copy', onCopy, true);
    document.addEventListener('cut', prevent, true);
    document.addEventListener('contextmenu', prevent, true);
    document.addEventListener('dragstart', prevent, true);
    document.addEventListener('selectstart', prevent, true);
    document.addEventListener('keydown', onKeydown, true);

    return () => {
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('cut', prevent, true);
      document.removeEventListener('contextmenu', prevent, true);
      document.removeEventListener('dragstart', prevent, true);
      document.removeEventListener('selectstart', prevent, true);
      document.removeEventListener('keydown', onKeydown, true);
    };
  }, []);

  // --- Sanallaştırma boyut takibi ---
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportHeight(el.clientHeight || 600);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const LINE_HEIGHT = lineHeightFor(fontSize);

  // --- Takip ---
  useEffect(() => {
    if (!followEnabled) return;
    if (paused) return;
    const c = cursor;
    if (!c) return;
    if (lastAppliedLineRef.current === c.line) return;
    lastAppliedLineRef.current = c.line;
    const el = scrollRef.current;
    if (!el) return;
    const target = (c.line - 1) * LINE_HEIGHT - el.clientHeight / 2 + LINE_HEIGHT / 2;
    el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [followEnabled, paused, cursor, LINE_HEIGHT]);

  const onScroll = (): void => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    if (!followEnabled) return;
    // Kullanıcı elle kaydırdı → 8 sn duraklat
    setPaused(true);
    if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(() => setPaused(false), 8000);
  };

  const totalHeight = lines.length * LINE_HEIGHT;
  const virtualize = lines.length > VIRTUALIZE_THRESHOLD;
  const startIdx = virtualize
    ? Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - 5)
    : 0;
  const endIdx = virtualize
    ? Math.min(lines.length, Math.ceil((scrollTop + viewportHeight) / LINE_HEIGHT) + 5)
    : lines.length;

  // AI/OCR yemleri: tüm belge için ortak genişlik, satır başına deterministik yem.
  const decoyWidth = useMemo(
    () => decoyWidthFor(lines.map((l) => l.reduce((n, s) => n + s[0].replace(/\u200B/g, '').length, 0))),
    [lines]
  );
  const visible = useMemo(() => {
    const slice = lines.slice(startIdx, endIdx);
    if (ocrLevel <= 0) return slice;
    return slice.map((l, i) =>
      decorateLine(l, startIdx + i, { level: ocrLevel, language, seed: viewToken, width: decoyWidth })
    );
  }, [lines, startIdx, endIdx, ocrLevel, language, viewToken, decoyWidth]);
  const cursorLine = cursor?.line ?? null;

  return (
    <div
      className={`protected-view ${ocrLevel >= 2 ? 'ocr-strong' : ''}`}
      ref={containerRef}
      style={{ fontSize: `${fontSize}px`, lineHeight: `${LINE_HEIGHT}px` }}
      aria-label="Korunan kod görünümü"
    >
      <div className="protected-scroll" ref={scrollRef} onScroll={onScroll}>
        {virtualize ? (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ position: 'absolute', top: startIdx * LINE_HEIGHT, left: 0, right: 0 }}>
              {visible.map((line, i) => (
                <ProtectedLine
                  key={startIdx + i}
                  n={startIdx + i + 1}
                  spans={line}
                  wrap={lineWrapping}
                  cursor={
                    cursorLine === startIdx + i + 1
                      ? { col: cursor!.col, name: cursor!.name, color: cursor!.color }
                      : null
                  }
                />
              ))}
            </div>
          </div>
        ) : (
          <div>
            {visible.map((line, i) => (
              <ProtectedLine
                key={i}
                n={i + 1}
                spans={line}
                wrap={lineWrapping}
                cursor={
                  cursorLine === i + 1
                    ? { col: cursor!.col, name: cursor!.name, color: cursor!.color }
                    : null
                }
              />
            ))}
          </div>
        )}
      </div>

      {paused && followEnabled && (
        <button
          className="follow-resume"
          onClick={() => {
            setPaused(false);
            lastAppliedLineRef.current = null;
          }}
        >
          ↩ Takibe dön
        </button>
      )}
    </div>
  );
}

function ProtectedLine({
  n,
  spans,
  wrap,
  cursor
}: {
  n: number;
  spans: Span[];
  wrap: boolean;
  cursor: { col: number; name: string; color: string } | null;
}): JSX.Element {
  return (
    <div className="p-line">
      <div className="p-gutter">{n}</div>
      <div className={`p-content ${wrap ? 'p-wrap' : ''}`}>
        {spans.length === 0 ? (
          <span>&nbsp;</span>
        ) : (
          spans.map((s, i) => (
            <span key={i} className={s[1] || undefined}>
              {s[0]}
            </span>
          ))
        )}
        {cursor && (
          <span
            className="p-cursor"
            style={{
              // Satırın BAŞINDAN itibaren ch birimiyle sütun konumu (monospace).
              // 6px = .p-content padding-left. (Eskiden marginLeft kullanılıyordu ve imleç
              // satır sonundan itibaren kaydırılıyordu.)
              left: `calc(6px + ${Math.max(0, cursor.col - 1)}ch)`,
              background: cursor.color
            }}
            title={cursor.name}
          >
            <span className="p-cursor-label" style={{ background: cursor.color }}>
              {cursor.name}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}