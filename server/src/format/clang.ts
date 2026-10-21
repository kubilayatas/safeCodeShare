// C / C++ / C# biçimlendirici — @wasm-fmt/clang-format.
// API VARSAYIMI: `import init, { format } from '@wasm-fmt/clang-format'`;
// `await init()` sonra `format(source, filename, styleString)` çağrılır.
import type { FormatOptions } from './index';
import { FormatError } from './index';

type ClangModule = {
  default: () => Promise<unknown>;
  format: (source: string, filename: string, style: string) => string;
};

let initPromise: Promise<ClangModule> | null = null;

async function loadModule(): Promise<ClangModule> {
  if (!initPromise) {
    initPromise = (async () => {
      const mod = (await import('@wasm-fmt/clang-format')) as unknown as ClangModule;
      await mod.default();
      return mod;
    })();
  }
  return initPromise;
}

function buildStyle(opts: FormatOptions): string {
  // clang-format stil objesi YAML veya JSON string olabilir.
  return JSON.stringify({
    BasedOnStyle: 'Google',
    IndentWidth: opts.tabWidth,
    UseTab: opts.useTabs ? 'Always' : 'Never',
    ColumnLimit: 100
  });
}

export async function formatClang(
  code: string,
  filename: string,
  opts: FormatOptions
): Promise<string> {
  const mod = await loadModule();
  try {
    const out = mod.format(code, filename, buildStyle(opts));
    if (typeof out !== 'string' || out.length === 0) {
      throw new FormatError('Biçimlendirme boş sonuç döndürdü');
    }
    return out;
  } catch (err) {
    if (err instanceof FormatError) throw err;
    const e = err as { message?: string };
    const msg = (e.message ?? 'C/C++ biçimlendirme hatası').slice(0, 300);
    // clang-format "file.c:LINE:COL: error: ..." biçiminde konum verebilir.
    const m = msg.match(/:(\d+):(\d+):/);
    const line = m ? Number(m[1]) : undefined;
    const column = m ? Number(m[2]) : undefined;
    throw new FormatError(msg.split('\n')[0], line, column);
  }
}