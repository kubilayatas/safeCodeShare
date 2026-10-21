// Sublime Text tarzı kısayollar (spesifikasyon §10.2).
// Handler'lar sayfa tarafından sağlanır; hiçbir tuş basımı tarayıcıya kaçmaz.
import type { KeyBinding } from '@codemirror/view';
import { keymap } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import {
  selectAll,
  deleteLine,
  copyLineDown,
  moveLineUp,
  moveLineDown,
  toggleComment,
  indentMore,
  indentLess,
  selectLine
} from '@codemirror/commands';
import { selectNextOccurrence } from '@codemirror/search';

export type EditorActions = {
  /** Ctrl+Alt+F — biçimlendirme (FAZ 5). */
  onBeautify?: () => void;
  /** Ctrl+S — manuel sürüm kaydet (FAZ 7). */
  onSaveVersion?: () => void;
  /** F1 — kısayol yardımı. */
  onHelp?: () => void;
  /** Ctrl+Shift+P — komut paleti yerine basit bir sunum modu aç/kapa. */
  onTogglePresentation?: () => void;
};

export const baseKeymap: KeyBinding[] = [
  // Tarayıcının kaydet penceresini engelle (Ctrl+S). Handler yoksa da preventDefault.
  {
    key: 'Mod-s',
    preventDefault: true,
    run: () => true
  },
  {
    key: 'Mod-a',
    run: (view) => {
      selectAll(view);
      return true;
    }
  }
];

export function buildSublimeKeybindings(actions: EditorActions): KeyBinding[] {
  const bindings: KeyBinding[] = [];

  // --- Metin düzenleme (Sublime) ---
  bindings.push(
    { key: 'Mod-d', run: selectNextOccurrence, preventDefault: true },
    { key: 'Mod-l', run: selectLine, preventDefault: true },
    { key: 'Mod-Shift-k', run: deleteLine, preventDefault: true },
    { key: 'Mod-Shift-d', run: copyLineDown, preventDefault: true },
    { key: 'Mod-Shift-ArrowUp', run: moveLineUp, preventDefault: true },
    { key: 'Mod-Shift-ArrowDown', run: moveLineDown, preventDefault: true },
    { key: 'Mod-/', run: toggleComment, preventDefault: true },
    { key: 'Mod-]', run: indentMore, preventDefault: true },
    { key: 'Mod-[', run: indentLess, preventDefault: true }
  );

  // --- Eylemler ---
  bindings.push({
    key: 'Mod-Alt-f',
    preventDefault: true,
    run: () => {
      actions.onBeautify?.();
      return true;
    }
  });

  bindings.push({
    key: 'Mod-s',
    preventDefault: true,
    run: () => {
      actions.onSaveVersion?.();
      return true;
    }
  });

  bindings.push({
    key: 'F1',
    preventDefault: true,
    run: () => {
      actions.onHelp?.();
      return true;
    }
  });

  // Sunum modu kısayolu — tarayıcı çakışması olmayan bir kombinasyon.
  bindings.push({
    key: 'Mod-Shift-p',
    preventDefault: true,
    run: () => {
      actions.onTogglePresentation?.();
      return true;
    }
  });

  return bindings;
}

export function keymapExtension(bindings: KeyBinding[]): Extension {
  return keymap.of(bindings);
}