import type { AppSettings, ThemeId } from '../editor/settings';
import { useI18n, type MessageKey } from '../i18n';
import { LocalePicker } from '../i18n/LocalePicker';

type Props = {
  open: boolean;
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onClose: () => void;
  showNickname: boolean;
};

const THEMES: Array<{ id: ThemeId; label: MessageKey }> = [
  { id: 'monokai', label: 'theme.monokai' },
  { id: 'onedark', label: 'theme.onedark' },
  { id: 'notepad', label: 'theme.notepad' }
];

export default function SettingsPanel({
  open,
  settings,
  onChange,
  onClose,
  showNickname
}: Props): JSX.Element | null {
  const { t, tn } = useI18n();
  if (!open) return null;

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    onChange({ ...settings, [key]: value });
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <h3>{t('settings.title')}</h3>
          <button className="icon-btn" onClick={onClose} title={t('common.close')} aria-label={t('common.close')}>✕</button>
        </div>

        <div className="settings-body">
          <div className="field">
            <LocalePicker id="settings-locale" />
          </div>

          <div className="field">
            <label>{t('settings.codeTheme')}</label>
            <select
              className="select"
              value={settings.theme}
              onChange={(e) => set('theme', e.target.value as ThemeId)}
            >
              {THEMES.map((th) => (
                <option key={th.id} value={th.id}>{t(th.label)}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>{t('settings.fontSize', { size: settings.fontSize })}</label>
            <input
              type="range"
              min={12}
              max={32}
              value={settings.fontSize}
              onChange={(e) => set('fontSize', Number(e.target.value))}
            />
          </div>

          <div className="field">
            <label>{t('settings.tabWidth')}</label>
            <select
              className="select"
              value={settings.tabSize}
              onChange={(e) => set('tabSize', Number(e.target.value) as 2 | 4 | 8)}
            >
              <option value={2}>{tn('settings.spaces', 2)}</option>
              <option value={4}>{tn('settings.spaces', 4)}</option>
              <option value={8}>{tn('settings.spaces', 8)}</option>
            </select>
          </div>

          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={settings.useTabs}
                onChange={(e) => set('useTabs', e.target.checked)}
              />{' '}
              {t('settings.useTabs')}
            </label>
          </div>

          <div className="field">
            <label>
              <input
                type="checkbox"
                checked={settings.lineWrapping}
                onChange={(e) => set('lineWrapping', e.target.checked)}
              />{' '}
              {t('settings.wrap')}
            </label>
          </div>

          {showNickname && (
            <div className="field">
              <label>{t('settings.nickname')}</label>
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
          <button className="btn btn-primary" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
}