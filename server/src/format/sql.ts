// SQL biçimlendirici — sql-formatter.
import { format as sqlFormat } from 'sql-formatter';
import type { FormatOptions } from './index';
import { FormatError } from './index';

export async function formatSql(code: string, opts: FormatOptions): Promise<string> {
  try {
    const out = sqlFormat(code, {
      language: 'sql',
      tabWidth: opts.tabWidth,
      useTabs: opts.useTabs,
      keywordCase: 'upper',
      linesBetweenQueries: 2
    });
    if (!out || out.trim().length === 0) {
      throw new FormatError('Biçimlendirme boş sonuç döndürdü');
    }
    return out;
  } catch (err) {
    if (err instanceof FormatError) throw err;
    const e = err as { message?: string };
    const msg = (e.message ?? 'SQL biçimlendirme hatası').slice(0, 300);
    throw new FormatError(msg.split('\n')[0]);
  }
}