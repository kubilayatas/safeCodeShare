import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { syntaxHighlighting } from '@codemirror/language';
import { tkHighlighter } from '@safecodeshare/shared';
import { languageExtensionFor } from '../editor/setup';
import { baseEditorTheme } from '../editor/themes';
import type { ThemeId } from '../editor/settings';

type Props = {
  code: string;
  language: string;
  fontSize: number;
  theme: ThemeId;
  lineWrapping?: boolean;
};

// Sürüm geçmişi önizlemesi için minimal, salt okunur CodeMirror.
export default function ReadOnlyCodeView({
  code,
  language,
  fontSize,
  theme,
  lineWrapping
}: Props): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const parent = ref.current;
    if (!parent) return;
    let cancelled = false;
    let view: EditorView | null = null;

    void (async () => {
      const langExt = await languageExtensionFor(language);
      if (cancelled) return;
      view = new EditorView({
        state: EditorState.create({
          doc: code,
          extensions: [
            lineNumbers(),
            syntaxHighlighting(tkHighlighter, { fallback: true }),
            baseEditorTheme(),
            EditorState.readOnly.of(true),
            EditorView.editable.of(false),
            EditorView.theme({
              '.cm-content, .cm-gutters': { fontSize: `${fontSize}px` }
            }),
            lineWrapping ? EditorView.lineWrapping : [],
            langExt
          ]
        }),
        parent
      });
    })();

    return () => {
      cancelled = true;
      try {
        view?.destroy();
      } catch {
        /* yut */
      }
    };
  }, [code, language, fontSize, lineWrapping]);

  return (
    <div className={`editor-shell theme-${theme}`} style={{ height: '100%' }}>
      <div ref={ref} className="editor-mount" />
    </div>
  );
}