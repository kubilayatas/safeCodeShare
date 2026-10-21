import { languageLabel } from '@safecodeshare/shared';
import type { CursorInfo } from './Editor';

type Props = {
  language: string;
  cursor: CursorInfo;
  dirty: boolean;
};

export default function StatusBar({ language, cursor, dirty }: Props): JSX.Element {
  return (
    <div className="statusbar">
      <span className="sb-item">{languageLabel(language)}</span>
      <span className="sb-item">
        Satır {cursor.line}:{cursor.col}
      </span>
      {cursor.selectionLength > 0 && (
        <span className="sb-item">
          Seçim: {cursor.selectionLength}
          {cursor.selectionCount > 1 ? ` (${cursor.selectionCount} imleç)` : ''}
        </span>
      )}
      <span className="sb-item">Toplam: {cursor.totalLines} satır</span>
      <span className="sb-spacer" />
      <span className={`sb-item ${dirty ? 'sb-dirty' : 'sb-saved'}`}>
        {dirty ? 'Kaydediliyor…' : 'Kaydedildi'}
      </span>
    </div>
  );
}