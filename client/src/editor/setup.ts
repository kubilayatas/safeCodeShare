// CodeMirror eklenti kurulumu. İşbirliği açıkken `history()` KULLANILMAZ;
// undo/redo Y.UndoManager + yUndoManagerKeymap üzerinden çalışır.
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightSpecialChars,
  scrollPastEnd,
  type KeyBinding
} from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import {
  bracketMatching,
  foldGutter,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
  foldKeymap
} from '@codemirror/language';
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap
} from '@codemirror/autocomplete';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { tkHighlighter } from '@kodsinif/shared';
import { baseEditorTheme } from './themes';
import { loadLanguage } from './languages';
import { baseKeymap } from './keymap';

export type EditorCompartments = {
  language: Compartment;
  readOnly: Compartment;
  tabSize: Compartment;
  useTabs: Compartment;
  lineWrapping: Compartment;
  fontSize: Compartment;
};

export function createCompartments(): EditorCompartments {
  return {
    language: new Compartment(),
    readOnly: new Compartment(),
    tabSize: new Compartment(),
    useTabs: new Compartment(),
    lineWrapping: new Compartment(),
    fontSize: new Compartment()
  };
}

function fontSizeExtension(px: number): Extension {
  return EditorView.theme({
    '.cm-content, .cm-gutters': {
      fontSize: `${px}px`
    }
  });
}

export function buildExtensions(opts: {
  ydoc: Y.Doc;
  awareness: Awareness;
  undoManager: Y.UndoManager;
  readOnly: boolean;
  language: string;
  tabSize: number;
  useTabs: boolean;
  lineWrapping: boolean;
  fontSize: number;
  compartments: EditorCompartments;
  initialLanguageExt: Extension | null;
  extraKeybindings: KeyBinding[];
}): Extension[] {
  const ytext = opts.ydoc.getText('code');

  const readOnlyExt: Extension = opts.readOnly
    ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
    : [];

  const unit = opts.useTabs ? '\t' : ' '.repeat(opts.tabSize);
  const lineWrappingExt: Extension = opts.lineWrapping ? EditorView.lineWrapping : [];

  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    highlightSpecialChars(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    // Alt+sürükle → dikdörtgen seçim (CM6 varsayılanı Alt).
    rectangularSelection(),
    crosshairCursor(),
    highlightSelectionMatches(),
    scrollPastEnd(),

    // Ctrl/Cmd + tıklama → yeni imleç (Sublime davranışı).
    EditorView.clickAddsSelectionRange.of((event) => event.ctrlKey || event.metaKey),

    keymap.of([
      ...closeBracketsKeymap,
      ...completionKeymap,
      ...foldKeymap,
      ...searchKeymap,
      ...yUndoManagerKeymap,
      ...opts.extraKeybindings,
      ...baseKeymap,
      ...defaultKeymap,
      indentWithTab
    ]),

    yCollab(ytext, opts.awareness, { undoManager: opts.undoManager }),

    // `tk-*` sınıf tabanlı renklendirme — renkler themes.css'te.
    syntaxHighlighting(tkHighlighter, { fallback: true }),

    baseEditorTheme(),

    opts.compartments.language.of(opts.initialLanguageExt ?? []),
    opts.compartments.readOnly.of(readOnlyExt),
    opts.compartments.tabSize.of([EditorState.tabSize.of(opts.tabSize), indentUnit.of(unit)]),
    opts.compartments.useTabs.of([]),
    opts.compartments.lineWrapping.of(lineWrappingExt),
    opts.compartments.fontSize.of(fontSizeExtension(opts.fontSize))
  ];
}

export async function languageExtensionFor(language: string): Promise<Extension> {
  const ext = await loadLanguage(language);
  return ext ?? [];
}