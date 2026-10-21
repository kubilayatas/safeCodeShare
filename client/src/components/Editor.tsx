import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { Awareness } from 'y-protocols/awareness';
import {
  buildExtensions,
  createCompartments,
  languageExtensionFor,
  type EditorCompartments
} from '../editor/setup';
import type { AppSettings, ThemeId } from '../editor/settings';
import { buildSublimeKeybindings, type EditorActions } from '../editor/keymap';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';
export type Presence = { owners: number; editors: number; viewers: number };

export type CursorInfo = {
  line: number;
  col: number;
  selectionLength: number;
  selectionCount: number;
  totalLines: number;
};

export type EditorContext = {
  view: EditorView;
  ydoc: Y.Doc;
  awareness: Awareness;
  provider: HocuspocusProvider;
  setLanguage: (language: string) => Promise<void>;
  setReadOnly: (ro: boolean) => void;
  setTabSize: (n: number, useTabs: boolean) => void;
  setLineWrapping: (b: boolean) => void;
  setFontSize: (n: number) => void;
  getText: () => string;
};

type Props = {
  padId: string;
  /** Owner için undefined; edit/view için token. */
  token?: string;
  /** Sunucu tarafında asıl zorlanan; bu sadece görsel. */
  readOnly: boolean;
  initialLanguage: string;
  settings: AppSettings;
  displayName: string;
  displayColor: string;
  role: 'owner' | 'editor' | 'viewer';
  themeClass: ThemeId;
  actions?: EditorActions;
  onConnectionStatus?: (s: ConnectionStatus) => void;
  onPresence?: (p: Presence) => void;
  onLanguageChanged?: (lang: string) => void;
  onCursorChange?: (info: CursorInfo) => void;
  onContentChange?: () => void;
  onReady?: (ctx: EditorContext) => void;
  onError?: (msg: string) => void;
};

const EMPTY_CURSOR: CursorInfo = {
  line: 1,
  col: 1,
  selectionLength: 0,
  selectionCount: 1,
  totalLines: 1
};

export default function Editor({
  padId,
  token,
  readOnly,
  initialLanguage,
  settings,
  displayName,
  displayColor,
  role,
  themeClass,
  actions,
  onConnectionStatus,
  onPresence,
  onLanguageChanged,
  onCursorChange,
  onContentChange,
  onReady,
  onError
}: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const compartmentsRef = useRef<EditorCompartments | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ydoc = new Y.Doc();
    const undoManager = new Y.UndoManager(ydoc.getText('code'));

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/collab`;

    onConnectionStatus?.('connecting');

    const provider = new HocuspocusProvider({
      url,
      name: padId,
      token: token ?? undefined,
      document: ydoc,
      onStatus: ({ status }) => {
        if (status === 'connected') onConnectionStatus?.('connected');
        else if (status === 'connecting') onConnectionStatus?.('connecting');
        else onConnectionStatus?.('disconnected');
      },
      onAuthenticationFailed: (data: { reason?: string }) => {
        onError?.(data?.reason ?? 'Bu payda yazma yetkiniz yok.');
      },
      onStateless: ({ payload }) => {
        try {
          const msg = JSON.parse(payload) as {
            type?: string;
            owners?: number;
            editors?: number;
            viewers?: number;
          };
          if (msg.type === 'presence') {
            onPresence?.({
              owners: msg.owners ?? 0,
              editors: msg.editors ?? 0,
              viewers: msg.viewers ?? 0
            });
          }
        } catch {
          /* yut */
        }
      }
    });

    const awareness = provider.awareness;
    if (!awareness) return;
    awareness.setLocalStateField('user', { name: displayName, color: displayColor, role });

    const compartments = createCompartments();
    compartmentsRef.current = compartments;

    let cancelled = false;

    void (async () => {
      const initialLangExt = await languageExtensionFor(initialLanguage);
      if (cancelled) return;

      const extraKeybindings = buildSublimeKeybindings(actions ?? {});

      const extensions = buildExtensions({
        ydoc,
        awareness,
        undoManager,
        readOnly,
        language: initialLanguage,
        tabSize: settings.tabSize,
        useTabs: settings.useTabs,
        lineWrapping: settings.lineWrapping,
        fontSize: settings.fontSize,
        compartments,
        initialLanguageExt: initialLangExt,
        extraKeybindings
      });

      // Cursor + content change takibi — EditorView.updateListener ile
      const listenerExt = EditorView.updateListener.of((update) => {
        if (update.docChanged) onContentChange?.();
        if (update.selectionSet || update.docChanged || update.focusChanged) {
          const state = update.state;
          const sel = state.selection.main;
          const line = state.doc.lineAt(sel.head);
          onCursorChange?.({
            line: line.number,
            col: sel.head - line.from + 1,
            selectionLength: sel.to - sel.from,
            selectionCount: state.selection.ranges.length,
            totalLines: state.doc.lines
          });
        }
      });

      const view = new EditorView({
        state: EditorState.create({
          doc: '',
          extensions: [...extensions, listenerExt]
        }),
        parent: containerRef.current!
      });
      viewRef.current = view;

      const meta = ydoc.getMap<string>('meta');
      let lastLang = initialLanguage;

      const applyLang = async (lang: string): Promise<void> => {
        if (lang === lastLang) return;
        lastLang = lang;
        const ext = await languageExtensionFor(lang);
        view.dispatch({ effects: compartments.language.reconfigure(ext) });
      };

      meta.observe((event) => {
        if (event.keysChanged.has('language')) {
          const lang = meta.get('language');
          if (typeof lang === 'string' && lang.length > 0) {
            void applyLang(lang);
            onLanguageChanged?.(lang);
          }
        }
      });

      if (!meta.get('language')) meta.set('language', initialLanguage);

      // Başlangıç cursor bilgisini gönder
      onCursorChange?.(EMPTY_CURSOR);

      const ctx: EditorContext = {
        view,
        ydoc,
        awareness,
        provider,
        setLanguage: async (language: string) => {
          meta.set('language', language);
          await applyLang(language);
        },
        setReadOnly: (ro: boolean) => {
          const ext = ro ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : [];
          view.dispatch({ effects: compartments.readOnly.reconfigure(ext) });
        },
        setTabSize: (n: number, useTabs: boolean) => {
          const unit = useTabs ? '\t' : ' '.repeat(n);
          view.dispatch({
            effects: [
              compartments.tabSize.reconfigure([
                EditorState.tabSize.of(n),
                indentUnit.of(unit)
              ])
            ]
          });
        },
        setLineWrapping: (b: boolean) => {
          view.dispatch({
            effects: compartments.lineWrapping.reconfigure(b ? EditorView.lineWrapping : [])
          });
        },
        setFontSize: (n: number) => {
          view.dispatch({
            effects: compartments.fontSize.reconfigure(
              EditorView.theme({ '.cm-content, .cm-gutters': { fontSize: `${n}px` } })
            )
          });
        },
        getText: () => ydoc.getText('code').toString()
      };

      onReady?.(ctx);
    })();

    return () => {
      cancelled = true;
      try {
        provider.destroy();
      } catch {
        /* yut */
      }
      try {
        viewRef.current?.destroy();
      } catch {
        /* yut */
      }
      try {
        undoManager.destroy();
      } catch {
        /* yut */
      }
      try {
        ydoc.destroy();
      } catch {
        /* yut */
      }
      viewRef.current = null;
      compartmentsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padId]);

  // Ayarlar: satır kaydırma + yazı boyutu
  useEffect(() => {
    const view = viewRef.current;
    const c = compartmentsRef.current;
    if (!view || !c) return;
    view.dispatch({
      effects: c.lineWrapping.reconfigure(settings.lineWrapping ? EditorView.lineWrapping : [])
    });
    view.dispatch({
      effects: c.fontSize.reconfigure(
        EditorView.theme({ '.cm-content, .cm-gutters': { fontSize: `${settings.fontSize}px` } })
      )
    });
  }, [settings.lineWrapping, settings.fontSize]);

  // Ayarlar: sekme boyutu
  useEffect(() => {
    const view = viewRef.current;
    const c = compartmentsRef.current;
    if (!view || !c) return;
    const unit = settings.useTabs ? '\t' : ' '.repeat(settings.tabSize);
    view.dispatch({
      effects: c.tabSize.reconfigure([
        EditorState.tabSize.of(settings.tabSize),
        indentUnit.of(unit)
      ])
    });
  }, [settings.tabSize, settings.useTabs]);

  return (
    <div className={`editor-shell theme-${themeClass}`}>
      <div ref={containerRef} className="editor-mount" />
    </div>
  );
}