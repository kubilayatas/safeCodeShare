// Desteklenen arayüz dilleri — istemci ve sunucu aynı listeyi kullanır.

export type LocaleCode =
  | 'en'
  | 'tr'
  | 'de'
  | 'fr'
  | 'es'
  | 'it'
  | 'pt-BR'
  | 'ru'
  | 'zh-CN'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'hi'
  | 'id';

export type LocaleInfo = {
  code: LocaleCode;
  nativeName: string; // seçicide kendi dilinde görünür
  dir: 'ltr' | 'rtl';
};

// Sıra: seçicide görünen sıra.
export const LOCALES: LocaleInfo[] = [
  { code: 'en', nativeName: 'English', dir: 'ltr' },
  { code: 'tr', nativeName: 'Türkçe', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'fr', nativeName: 'Français', dir: 'ltr' },
  { code: 'es', nativeName: 'Español', dir: 'ltr' },
  { code: 'it', nativeName: 'Italiano', dir: 'ltr' },
  { code: 'pt-BR', nativeName: 'Português (Brasil)', dir: 'ltr' },
  { code: 'ru', nativeName: 'Русский', dir: 'ltr' },
  { code: 'zh-CN', nativeName: '简体中文', dir: 'ltr' },
  { code: 'ja', nativeName: '日本語', dir: 'ltr' },
  { code: 'ko', nativeName: '한국어', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', dir: 'rtl' },
  { code: 'hi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'id', nativeName: 'Bahasa Indonesia', dir: 'ltr' }
];

export const DEFAULT_LOCALE: LocaleCode = 'en';

const CODES = new Set<string>(LOCALES.map((l) => l.code));

export function isLocale(v: unknown): v is LocaleCode {
  return typeof v === 'string' && CODES.has(v);
}

// "pt", "pt-PT", "zh", "zh-TW" gibi etiketleri desteklenen en yakın dile eşler.
export function matchLocale(tag: string | null | undefined): LocaleCode | null {
  if (!tag) return null;
  const t = tag.trim();
  if (isLocale(t)) return t;
  const lower = t.toLowerCase();
  for (const l of LOCALES) if (l.code.toLowerCase() === lower) return l.code;
  const base = lower.split(/[-_]/)[0];
  if (base === 'pt') return 'pt-BR';
  if (base === 'zh') return 'zh-CN';
  for (const l of LOCALES) if (l.code.toLowerCase().split('-')[0] === base) return l.code;
  return null;
}

// Accept-Language başlığından ilk desteklenen dili seçer (q değerlerine göre).
export function negotiateLocale(acceptLanguage: string | null | undefined): LocaleCode | null {
  if (!acceptLanguage) return null;
  const parts = acceptLanguage
    .split(',')
    .map((p) => {
      const [tag, ...params] = p.trim().split(';');
      const q = params.map((x) => x.trim()).find((x) => x.startsWith('q='));
      return { tag: tag ?? '', q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .filter((p) => p.tag && p.tag !== '*')
    .sort((a, b) => b.q - a.q);
  for (const p of parts) {
    const m = matchLocale(p.tag);
    if (m) return m;
  }
  return null;
}

export function localeDir(code: LocaleCode): 'ltr' | 'rtl' {
  return LOCALES.find((l) => l.code === code)?.dir ?? 'ltr';
}
