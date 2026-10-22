import type { CursorInfo } from './Editor';
import { useI18n } from '../i18n';
import { useLangLabel } from '../i18n/LocalePicker';

type Props = {
  language: string;
  cursor: CursorInfo;
  dirty: boolean;
};

export default function StatusBar({ language, cursor, dirty }: Props): JSX.Element {
  const { t, tn } = useI18n();
  const langLabel = useLangLabel();
  return (
    <div className="statusbar">
      <span className="sb-item">{langLabel(language)}</span>
      <span className="sb-item">{t('status.position', { line: cursor.line, col: cursor.col })}</span>
      {cursor.selectionLength > 0 && (
        <span className="sb-item">
          {t('status.selection', { length: cursor.selectionLength })}
          {cursor.selectionCount > 1 ? ` (${tn('status.cursors', cursor.selectionCount)})` : ''}
        </span>
      )}
      <span className="sb-item">{tn('status.total', cursor.totalLines)}</span>
      <span className="sb-spacer" />
      <span className={`sb-item ${dirty ? 'sb-dirty' : 'sb-saved'}`}>{t(dirty ? 'status.saving' : 'status.saved')}</span>
    </div>
  );
}
