// Arayüz çevirileri.
// - İngilizce (en) kaynak dildir ve pakete gömülüdür; diğer diller seçildiğinde yüklenir.
// - Her dil dosyası `Messages` tipini karşılamak zorundadır: eksik bir anahtar derlemeyi durdurur.
// - Çoğul biçimler Intl.PluralRules ile seçilir (Rusça/Arapça gibi çok biçimli diller dahil).
// - Tarih, sayı ve "x dakika önce" gibi ifadeler Intl ile dilin kendi kurallarına göre biçimlenir.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_LOCALE,
  LOCALES,
  isLocale,
  localeDir,
  matchLocale,
  type LocaleCode
} from '@safecodeshare/shared';
import { en, type MessageKey, type Messages, type PluralMsg } from './locales/en';

export type { MessageKey } from './locales/en';
export type Params = Record<string, string | number>;

const STORAGE_KEY = 'safecodeshare.locale';

// Vite: her dil ayrı bir parça olarak paketlenir ve yalnızca gerektiğinde indirilir.
const loaders = import.meta.glob<{ default: Messages }>('./locales/*.ts');

let currentLocale: LocaleCode = DEFAULT_LOCALE;
// api.ts her isteğe X-Locale başlığı ekler; sunucu mesajları da bu dilde gelir.
export function getCurrentLocale(): LocaleCode {
  return currentLocale;
}

export function detectInitialLocale(userPref?: LocaleCode | null): LocaleCode {
  // Öncelik: hesaptaki tercih (cihazlar arası) → bu tarayıcıdaki seçim → tarayıcı dili → İngilizce
  if (userPref && isLocale(userPref)) return userPref;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* gizli sekme vb. */
  }
  const langs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const l of langs) {
    const m = matchLocale(l);
    if (m) return m;
  }
  return DEFAULT_LOCALE;
}

async function loadMessages(code: LocaleCode): Promise<Messages> {
  if (code === 'en') return en;
  const loader = loaders[`./locales/${code}.ts`];
  if (!loader) return en;
  return (await loader()).default;
}

function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (params[k] !== undefined ? String(params[k]) : m));
}

function applyDocument(code: LocaleCode, messages: Messages): void {
  const html = document.documentElement;
  html.lang = code;
  html.dir = localeDir(code);
  document.title = messages['app.title'];
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', messages['app.description']);
}

export type I18n = {
  locale: LocaleCode;
  dir: 'ltr' | 'rtl';
  t: (key: MessageKey, params?: Params) => string;
  tn: (key: MessageKey, count: number, params?: Params) => string;
  setLocale: (code: LocaleCode) => Promise<void>;
  formatDate: (ms: number) => string;
  formatDateTime: (ms: number) => string;
  formatRelative: (ms: number) => string;
  formatNumber: (n: number) => string;
  /** Dile uygun ayraçla listeler (Arapçada ، gibi). */
  formatList: (items: string[]) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ initial, children }: { initial: LocaleCode; children: ReactNode }): JSX.Element | null {
  const [locale, setLocaleState] = useState<LocaleCode>(initial);
  const [messages, setMessages] = useState<Messages | null>(initial === 'en' ? en : null);

  useEffect(() => {
    let cancelled = false;
    void loadMessages(locale).then((m) => {
      if (cancelled) return;
      currentLocale = locale;
      setMessages(m);
      applyDocument(locale, m);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback(async (code: LocaleCode) => {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* yut */
    }
    const m = await loadMessages(code);
    currentLocale = code;
    setMessages(m);
    setLocaleState(code);
    applyDocument(code, m);
  }, []);

  const value = useMemo<I18n | null>(() => {
    if (!messages) return null;
    const pr = new Intl.PluralRules(locale);
    const lookup = (key: MessageKey): Messages[MessageKey] => messages[key] ?? en[key];
    const t = (key: MessageKey, params?: Params): string => {
      const v = lookup(key);
      return interpolate(typeof v === 'string' ? v : (v as PluralMsg).other, params);
    };
    const tn = (key: MessageKey, count: number, params?: Params): string => {
      const v = lookup(key);
      const p = { count: new Intl.NumberFormat(locale).format(count), ...params };
      if (typeof v === 'string') return interpolate(v, p);
      const forms = v as PluralMsg;
      const cat = pr.select(count) as keyof PluralMsg;
      return interpolate(forms[cat] ?? forms.other, p);
    };
    const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    const dateTimeFmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const numFmt = new Intl.NumberFormat(locale);
    return {
      locale,
      dir: localeDir(locale),
      t,
      tn,
      setLocale,
      formatDate: (ms) => dateFmt.format(ms),
      formatDateTime: (ms) => dateTimeFmt.format(ms),
      formatNumber: (n) => numFmt.format(n),
      formatList: (items) => items.join(t('common.listSep')),
      formatRelative: (ms) => {
        const sec = Math.round((ms - Date.now()) / 1000);
        const abs = Math.abs(sec);
        if (abs < 45) return rtf.format(0, 'second');
        if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
        if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
        if (abs < 86400 * 30) return rtf.format(Math.round(sec / 86400), 'day');
        return dateFmt.format(ms);
      }
    };
  }, [messages, locale, setLocale]);

  if (!value) return null; // ilk dil dosyası yüklenirken (birkaç ms) boş ekran
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}

export { LOCALES };
