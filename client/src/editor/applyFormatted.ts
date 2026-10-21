import type { EditorView } from '@codemirror/view';
import diff from 'fast-diff';

type ChangeSpec = { from: number; to: number; insert: string };

export function buildChangeSpecs(oldText: string, newText: string): ChangeSpec[] {
  if (oldText === newText) return [];
  const pieces = diff(oldText, newText) as Array<[number, string]>;
  const specs: ChangeSpec[] = [];
  let pos = 0;
  for (const [op, text] of pieces) {
    if (op === diff.DELETE) {
      specs.push({ from: pos, to: pos + text.length, insert: '' });
      pos += text.length;
    } else if (op === diff.INSERT) {
      specs.push({ from: pos, to: pos, insert: text });
    } else {
      pos += text.length;
    }
  }
  return specs;
}

export function applyFormatted(view: EditorView, newText: string): boolean {
  const oldText = view.state.doc.toString();
  if (oldText === newText) return false;
  const changes = buildChangeSpecs(oldText, newText);
  if (changes.length === 0) return false;
  view.dispatch({ changes, userEvent: 'format' });
  return true;
}