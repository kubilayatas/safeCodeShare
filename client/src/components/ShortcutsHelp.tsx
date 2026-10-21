import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const ROWS: Array<[string, string]> = [
  ['Ctrl + D', 'Sonraki eşleşmeyi seç'],
  ['Ctrl + L', 'Satırı seç'],
  ['Ctrl + Shift + K', 'Satırı sil'],
  ['Ctrl + Shift + D', 'Satırı çoğalt'],
  ['Ctrl + Shift + ↑ / ↓', 'Satırı yukarı/aşağı taşı'],
  ['Ctrl + /', 'Yorumu aç/kapat'],
  ['Ctrl + ] / [', 'Girintiyi artır / azalt'],
  ['Ctrl + S', 'Manuel sürüm kaydet'],
  ['Ctrl + Alt + F', 'Kodu biçimlendir'],
  ['Ctrl + Shift + P', 'Sunum modu aç/kapat'],
  ['Ctrl + F', 'Ara'],
  ['Ctrl + H', 'Bul ve değiştir'],
  ['Ctrl + Click', 'Çoklu imleç ekle'],
  ['Alt + Sürükle', 'Dikdörtgen seçim'],
  ['F1', 'Bu yardım penceresi']
];

export default function ShortcutsHelp({ open, onClose }: Props): JSX.Element | null {
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
          <h3 style={{ margin: 0 }}>⌨ Kısayollar</h3>
          <button className="icon-btn" onClick={onClose} title="Kapat">✕</button>
        </div>
        <div className="shortcuts-table">
          {ROWS.map(([k, label]) => (
            <div key={k} className="shortcut-row">
              <kbd>{k}</kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}