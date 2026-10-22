import { useEffect } from 'react';
import { useI18n, type MessageKey } from '../i18n';

type Props = {
  open: boolean;
  onClose: () => void;
};

const ROWS: Array<[string, MessageKey]> = [
  ['Ctrl + D', 'shortcuts.selectNext'],
  ['Ctrl + L', 'shortcuts.selectLine'],
  ['Ctrl + Shift + K', 'shortcuts.deleteLine'],
  ['Ctrl + Shift + D', 'shortcuts.duplicateLine'],
  ['Ctrl + Shift + ↑ / ↓', 'shortcuts.moveLine'],
  ['Ctrl + /', 'shortcuts.toggleComment'],
  ['Ctrl + ] / [', 'shortcuts.indent'],
  ['Ctrl + S', 'shortcuts.saveVersion'],
  ['Ctrl + Alt + F', 'shortcuts.format'],
  ['Ctrl + Shift + P', 'shortcuts.presentation'],
  ['Ctrl + F', 'shortcuts.find'],
  ['Ctrl + H', 'shortcuts.replace'],
  ['Ctrl + {click}', 'shortcuts.multiCursor'],
  ['Alt + {drag}', 'shortcuts.rectSelect'],
  ['F1', 'shortcuts.help']
];

export default function ShortcutsHelp({ open, onClose }: Props): JSX.Element | null {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card shortcuts-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('shortcuts.title')}</h3>
          <button className="icon-btn" onClick={onClose} title={t('common.close')} aria-label={t('common.close')}>✕</button>
        </div>
        <div className="shortcuts-table">
          {ROWS.map(([k, label]) => (
            <div key={k} className="shortcut-row">
              <kbd dir="ltr">{k.replace('{click}', t('shortcuts.click')).replace('{drag}', t('shortcuts.drag'))}</kbd>
              <span>{t(label)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}