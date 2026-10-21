// Biçimlendirici kayıt tablosu (spesifikasyon §9).
// prettier tabanlılar tek bir dosyada; WASM tabanlılar kendi dosyalarında.

import { LANGUAGES } from '@kodsinif/shared';
import { formatPrettier } from './prettier';
import { formatPython } from './python';
import { formatClang } from './clang';
import { formatGo } from './go';
import { formatSql } from './sql';

export type FormatOptions = {
  tabWidth: number;
  useTabs: boolean;
};

export type FormatterFn = (code: string, opts: FormatOptions) => Promise<string>;

export class FormatError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number
  ) {
    super(message);
    this.name = 'FormatError';
  }
}

// prettier tabanlı tek giriş: hangi parser/plugin kullanılacağını dil id'sinden çıkarır.
const PRETTIER_PARSERS: Record<string, { parser: string; plugin: 'java' | 'php' | 'xml' | null }> = {
  javascript: { parser: 'babel', plugin: null },
  jsx: { parser: 'babel', plugin: null },
  typescript: { parser: 'babel-ts', plugin: null },
  tsx: { parser: 'babel-ts', plugin: null },
  html: { parser: 'html', plugin: null },
  css: { parser: 'css', plugin: null },
  scss: { parser: 'scss', plugin: null },
  json: { parser: 'json', plugin: null },
  markdown: { parser: 'markdown', plugin: null },
  yaml: { parser: 'yaml', plugin: null },
  xml: { parser: 'xml', plugin: 'xml' },
  java: { parser: 'java', plugin: 'java' },
  php: { parser: 'php', plugin: 'php' }
};

const formatters: Record<string, FormatterFn> = {};

// prettier tabanlılar
for (const langId of Object.keys(PRETTIER_PARSERS)) {
  formatters[`prettier:${langId}`] = (code, opts) => formatPrettier(langId, code, opts);
}

// WASM tabanlılar
formatters['wasm:python'] = formatPython;
formatters['wasm:c'] = (code, opts) => formatClang(code, 'main.c', opts);
formatters['wasm:cpp'] = (code, opts) => formatClang(code, 'main.cpp', opts);
formatters['wasm:csharp'] = (code, opts) => formatClang(code, 'Program.cs', opts);
formatters['wasm:go'] = formatGo;
formatters['wasm:sql'] = formatSql;

// Dil id → formatter anahtarı
function formatterKeyFor(language: string): string | null {
  const lang = LANGUAGES.find((l) => l.id === language);
  if (!lang || !lang.formatter) return null;
  const fid = lang.formatter;

  // prettier-* → prettier:<langId>
  if (fid.startsWith('prettier-')) {
    if (fid === 'prettier-babel') return `prettier:${language}`;
    if (fid === 'prettier-typescript') return `prettier:${language}`;
    return `prettier:${language}`;
  }
  // wasm/custom
  if (fid === 'ruff') return 'wasm:python';
  if (fid === 'clang-c') return 'wasm:c';
  if (fid === 'clang-cpp') return 'wasm:cpp';
  if (fid === 'clang-csharp') return 'wasm:csharp';
  if (fid === 'gofmt') return 'wasm:go';
  if (fid === 'sql') return 'wasm:sql';
  return null;
}

export async function format(language: string, code: string, opts: FormatOptions): Promise<string> {
  const key = formatterKeyFor(language);
  if (!key) {
    throw new FormatError('Bu dil için biçimlendirme desteklenmiyor');
  }
  const fn = formatters[key];
  if (!fn) {
    throw new FormatError('Biçimlendirici bulunamadı');
  }
  return fn(code, opts);
}

// prettier tabanlıların hangi parser/plugin ile çağrılacağını dışa verelim (test için).
export function prettierSpecFor(language: string): { parser: string; plugin: 'java' | 'php' | 'xml' | null } | null {
  return PRETTIER_PARSERS[language] ?? null;
}