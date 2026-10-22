import type { PadSummary } from '@safecodeshare/shared';
import { useI18n } from '../i18n';
import { useLangLabel } from '../i18n/LocalePicker';

type Props = {
  pad: PadSummary;
  onOpen: () => void;
  onCopyView: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onDelete: () => void;
  onShare: () => void;
};

export default function PadCard({
  pad,
  onOpen,
  onCopyView,
  onDuplicate,
  onMove,
  onDelete,
  onShare
}: Props): JSX.Element {
  const { t, tn, formatRelative } = useI18n();
  const langLabel = useLangLabel();
  const expired = pad.expiresAt != null && pad.expiresAt < Date.now();
  const notYetVisible = pad.visibleFrom != null && pad.visibleFrom > Date.now();

  return (
    <div className="pad-card" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}>
      <div className="pad-card-head">
        <div className="pad-card-title">{pad.title}</div>
        <div className="pad-card-badges">
          {pad.hasPassword && <span className="badge" title={t('card.password')}>🔒</span>}
          {pad.editEnabled && <span className="badge" title={t('card.editOn')}>✏️</span>}
          {!pad.visibleInCourse && <span className="badge" title={t('card.hiddenInCourse')}>🙈</span>}
          {notYetVisible && <span className="badge" title={t('card.scheduled')}>⏰</span>}
          {pad.copyProtect && <span className="badge" title={t('card.copyProtect')}>🛡</span>}
          {pad.copyProtect && pad.ocrProtect > 0 && (
            <span className="badge" title={t(pad.ocrProtect === 2 ? 'card.ocrStrong' : 'card.ocrLight')}>🤖</span>
          )}
          {expired && <span className="badge" title={t('card.expired')}>⌛</span>}
        </div>
      </div>

      <div className="pad-card-meta muted">
        <span className="lang-badge">{langLabel(pad.language)}</span>
        <span>{tn('common.lineCount', pad.lineCount)}</span>
        <span>{t('card.updated', { when: formatRelative(pad.updatedAt) })}</span>
      </div>

      <div className="pad-card-actions" onClick={(e) => e.stopPropagation()}>
        <button className="btn btn-sm" onClick={onOpen}>{t('card.open')}</button>
        <button className="btn btn-sm" onClick={onCopyView}>{t('card.copyViewLink')}</button>
        <button className="btn btn-sm" onClick={onShare}>{t('card.share')}</button>
        <button className="btn btn-sm" onClick={onDuplicate}>{t('card.duplicate')}</button>
        <button className="btn btn-sm" onClick={onMove}>{t('card.move')}</button>
        <button className="btn btn-sm btn-danger" onClick={onDelete}>{t('common.delete')}</button>
      </div>
    </div>
  );
}