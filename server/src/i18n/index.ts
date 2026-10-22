// Sunucu mesajlarının çevirisi.
// Koddaki Türkçe metin "kaynak anahtar"dır; catalog.ts her dil için karşılığını tutar.
// Dil seçimi: X-Locale başlığı → kullanıcının kayıtlı tercihi → Accept-Language → İngilizce.
// Bir dilde karşılık yoksa İngilizce, o da yoksa kaynak metin kullanılır.
import type { Request } from 'express';
import { DEFAULT_LOCALE, isLocale, negotiateLocale, type LocaleCode } from '@safecodeshare/shared';
import { CATALOG } from './catalog';

export type MsgParams = Record<string, string | number>;

export function pickLocale(req: Request | undefined | null): LocaleCode {
  if (!req) return DEFAULT_LOCALE;
  const header = req.headers['x-locale'];
  if (typeof header === 'string' && isLocale(header)) return header;
  const userLocale = (req.user as { locale?: string | null } | undefined)?.locale;
  if (isLocale(userLocale)) return userLocale;
  return negotiateLocale(req.headers['accept-language']) ?? DEFAULT_LOCALE;
}

function lookup(locale: LocaleCode, source: string): string {
  if (locale === 'tr') return source;
  return CATALOG[locale]?.[source] ?? CATALOG.en[source] ?? source;
}

// translateParams: değeri de kaynak metin olan parametreler (ör. özellik ve plan adı).
export function ts(
  locale: LocaleCode,
  source: string,
  params?: MsgParams,
  translateParams: string[] = []
): string {
  const text = lookup(locale, source);
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = params[k];
    if (v === undefined) return m;
    return translateParams.includes(k) && typeof v === 'string' ? lookup(locale, v) : String(v);
  });
}

export function tReq(req: Request | undefined | null, source: string, params?: MsgParams, translateParams?: string[]): string {
  return ts(pickLocale(req), source, params, translateParams);
}
