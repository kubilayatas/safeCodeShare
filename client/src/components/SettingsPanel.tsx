import type { AppSettings, ThemeId } from '../editor/settings';

type Props = {
  open: boolean;
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onClose: () => void;
  showNickname: boolean;
};

const THEMES: Array<{ id: ThemeId; label: string }> = [
  { id: 'monokai', label: 'Monokai (Sublime)' },
  { id: 'notepad', label: 'Notepad++ Klasik' },
  { id: 'onedark', label: 'One Dark' }
];

export default function SettingsPanel({
  open,
  settings,
  onChange,
  onClose,
  showNickname
}: Props): JSX.Element | null {
  if (!open) return null;

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h3>Ayarlar</h3>
          <button className="icon-btn" onClick={onClose} title="Kapat">✕</button>
        </div>

        <div className="settings-body">
          <div className="field">
            <label>Tema</label>
            <select
              className="select"
              value={settings.theme}
              onChange={(e) => set('theme', e.target.value as ThemeId)}
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Yazı boyutu: {settings.fontSize}px</label>
            <input
              type="range"
              min={12}
              max={32}
              value={settings.fontSize}
              onChange={(e) => set('fontSize', Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>Sekme genişliği</label>
            <select
              className="select"
              value={settings.tabSize}
              onChange={(e) => set('tabSize', Number(e.target.value) as 2 | 4 | 8)}
            >
              <option value={2}>2 boşluk</option>
              <option value={4}>4 boşluk</option>
              <option value={8}>8 boşluk</option>
            </select>
          </div>

          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={settings.useTabs}
                onChange={(e) => set('useTabs', e.target.checked)}
              />{' '}
              Sekme için TAB karakteri kullan
            </label>
          </div>

          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={settings.lineWrapping}
                onChange={(e) => set('lineWrapping', e.target.checked)}
              />{' '}
              Satırları kaydır
            </label>
          </div>

          {showNickname && (
            <div className="field">
              <label>Takma ad (diğerlerine görünür)</label>
              <input
                className="input"
                value={settings.nickname}
                onChange={(e) => set('nickname', e.target.value.slice(0, 40))}
                maxLength={40}
              />
            </div>
          )}
        </div>

        <div className="settings-foot">
          <button className="btn btn-primary" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}