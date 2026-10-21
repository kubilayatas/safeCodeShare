// Prettier tabanlı biçimlendiriciler (JS/TS/HTML/CSS/JSON/MD/YAML + Java/PHP/XML plugin'leri).
import type { FormatOptions } from './index';
import { FormatError } from './index';

type PrettierLike = {
  format: (source: string, options: Record<string, unknown>) => Promise<string>;
};

let prettierModulePromise: Promise<PrettierLike> | null = null;
const pluginPromises = new Map<'java' | 'php' | 'xml', Promise<unknown>>();

async function getPrettier(): Promise<PrettierLike> {
  if (!prettierModulePromise) {
    prettierModulePromise = import('prettier').then((m) => m as unknown as PrettierLike);
  }
  return prettierModulePromise;
}

async function getPlugin(name: 'java' | 'php' | 'xml'): Promise<unknown> {
  const cached = pluginPromises.get(name);
  if (cached) return cached;
  const p = (async (): Promise<unknown> => {
    if (name === 'java') {
      const m = await import('prettier-plugin-java');
      return (m as { default?: unknown }).default ?? m;
    }
    if (name === 'php') {
      const m = await import('@prettier/plugin-php');
      return (m as { default?: unknown }).default ?? m;
    }
    const m = await import('@prettier/plugin-xml');
    return (m as { default?: unknown }).default ?? m;
  })();
  pluginPromises.set(name, p);
  return p;
}

// prettier parser adları
const PARSERS: Record<string, { parser: string; plugin: 'java' | 'php' | 'xml' | null }> = {
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

type PrettierError = {
  message?: string;
  loc?: { start?: { line?: number; column?: number } };
  name?: string;
};

export async function formatPrettier(
  language: string,
  code: string,
  opts: FormatOptions
): Promise<string> {
  const spec = PARSERS[language];
  if (!spec) {
    throw new FormatError('Bu dil için biçimlendirme desteklenmiyor');
  }

  const prettier = await getPrettier();
  const plugins: unknown[] = [];
  if (spec.plugin) {
    plugins.push(await getPlugin(spec.plugin));
  }

  try {
    const formatted = await prettier.format(code, {
      parser: spec.parser,
      plugins,
      tabWidth: opts.tabWidth,
      useTabs: opts.useTabs,
      printWidth: 100,
      endOfLine: 'lf'
    });
    return formatted;
  } catch (err) {
    const e = err as PrettierError;
    const line = e.loc?.start?.line;
    const column = e.loc?.start?.column;
    const cleanMsg = (e.message ?? 'Biçimlendirme hatası')
      // prettier'ın hata mesajı uzun olabiliyor; ilk satırı al.
      .split('\n')[0]
      .slice(0, 300);
    throw new FormatError(cleanMsg, line, column);
  }
}