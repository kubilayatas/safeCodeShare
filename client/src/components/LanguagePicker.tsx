import { useMemo, useRef, useState, useEffect } from 'react';
import { LANGUAGES } from '@safecodeshare/shared';
import { useI18n } from '../i18n';
import { useLangLabel } from '../i18n/LocalePicker';

type Props = {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

// Aranabilir dil seçici (spesifikasyon §8)
export default function LanguagePicker({ value, onChange, disabled }: Props): JSX.Element {
  const { t } = useI18n();
  const langLabel = useLangLabel();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  const current = LANGUAGES.find((l) => l.id === value);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return LANGUAGES;
    return LANGUAGES.filter(
      (l) => langLabel(l.id).toLowerCase().includes(needle) || l.id.toLowerCase().includes(needle)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="lang-picker" ref={ref}>
      <button
        type="button"
        className="btn lang-picker-btn"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        title={t('langpicker.title')}
      >
        {current ? langLabel(current.id) : value} <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="lang-picker-menu" role="listbox">
          <input
            className="input"
            placeholder={t('langpicker.search')}
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="lang-picker-list">
            {filtered.map((l) => (
              <button
                key={l.id}
                type="button"
                className={`lang-picker-item ${l.id === value ? 'active' : ''}`}
                onClick={() => {
                  onChange(l.id);
                  setOpen(false);
                  setQ('');
                }}
              >
                <span>{langLabel(l.id)}</span>
                <span className="muted">{l.extension}</span>
              </button>
            ))}
            {filtered.length === 0 && <div className="muted" style={{ padding: 8 }}>{t('common.noResults')}</div>}
          </div>
        </div>
      )}
    </div>
  );
}