// Arayüz dili seçici. Giriş yapmış kullanıcının tercihi sunucuya da kaydedilir
// (başka cihazda da aynı dilde açılsın diye).
import { LOCALES, type LocaleCode } from '@safecodeshare/shared';
import { languageLabel } from '@safecodeshare/shared';
import { useI18n } from './index';
import { apiFetch } from '../api';

export function LocalePicker({
  compact = false,
  persist = false,
  id = 'locale-picker'
}: {
  compact?: boolean;
  persist?: boolean; // oturum açıksa tercihi hesaba da yaz
  id?: string;
}): JSX.Element {
  const { locale, setLocale, t } = useI18n();
  async function change(code: LocaleCode): Promise<void> {
    await setLocale(code);
    if (persist) {
      apiFetch('/api/auth/profile', { method: 'PATCH', body: { locale: code } }).catch(() => {
        /* tercih yerelde kayıtlı; sunucuya yazılamazsa sorun değil */
      });
    }
  }
  return (
    <span className={`locale-picker ${compact ? 'compact' : ''}`}>
      <label htmlFor={id} className={compact ? 'sr-only' : undefined}>
        {t('common.language')}
      </label>
      <select
        id={id}
        className="select"
        value={locale}
        onChange={(e) => void change(e.target.value as LocaleCode)}
        aria-label={t('common.language')}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </span>
  );
}

// Programlama dili adı: yalnızca "Düz metin" çevrilir; diğerleri özel isim.
export function useLangLabel(): (id: string) => string {
  const { t } = useI18n();
  return (id: string) => (id === 'plaintext' ? t('lang.plaintext') : languageLabel(id));
}

// "{link}" gibi bir yer tutucunun yerine React öğesi koyar (kelime sırası dilden dile değişir).
export function Rich({ text, slots }: { text: string; slots: Record<string, JSX.Element> }): JSX.Element {
  const parts = text.split(/(\{\w+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\{(\w+)\}$/.exec(p);
        return m && slots[m[1]] ? <span key={i}>{slots[m[1]]}</span> : <span key={i}>{p}</span>;
      })}
    </>
  );
}
