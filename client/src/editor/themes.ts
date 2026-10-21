// Editör teması — `theme-monokai` gibi sınıflar CSS değişkenlerini ayarlar,
// buradaki EditorView.theme ise o değişkenleri kullanır.
// Renk eşlemeleri `client/src/styles/themes.css` içinde `tk-*` sınıflarında tanımlı.
import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

export function baseEditorTheme(): Extension {
  return EditorView.theme({
    '&': {
      backgroundColor: 'var(--ed-bg)',
      color: 'var(--ed-fg)',
      fontFamily: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
      height: '100%'
    },
    '.cm-scroller': {
      fontFamily: 'inherit',
      lineHeight: '1.55'
    },
    '.cm-content': {
      caretColor: 'var(--ed-cursor)',
      padding: '8px 0'
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--ed-cursor)'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'var(--ed-selection)'
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--ed-active-line)'
    },
    '.cm-gutters': {
      backgroundColor: 'var(--ed-gutter-bg)',
      color: 'var(--ed-gutter-fg)',
      border: 'none'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--ed-active-line)',
      color: 'var(--ed-fg)'
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px 0 12px'
    },
    '.cm-foldGutter .cm-gutterElement': {
      padding: '0 2px'
    },
    '.cm-matchingBracket, .cm-nonmatchingBracket': {
      outline: '1px solid var(--ed-cursor)',
      backgroundColor: 'transparent'
    },
    '.cm-selectionMatch': {
      backgroundColor: 'rgba(102, 217, 239, 0.2)'
    },
    // y-codemirror uzak kullanıcı imleçleri
    '.cm-ySelectionInfo': {
      fontFamily: 'var(--font-ui)',
      fontSize: '11px',
      fontWeight: '600',
      padding: '1px 5px',
      borderRadius: '3px',
      position: 'absolute',
      top: '-1.5em',
      left: '-1px',
      color: '#fff',
      userSelect: 'none',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      opacity: '1'
    },
    '.cm-ySelectionCaret': {
      position: 'relative',
      borderLeft: '1px solid currentColor',
      borderRight: '1px solid currentColor',
      marginLeft: '-1px',
      marginRight: '-1px',
      boxSizing: 'border-box'
    },
    '.cm-ySelectionCaretDot': {
      borderRadius: '50%',
      position: 'absolute',
      width: '4px',
      height: '4px',
      top: '-2px',
      left: '-2px',
      backgroundColor: 'currentColor'
    }
  });
}