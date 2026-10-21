// Python biçimlendirici — @wasm-fmt/ruff_fmt.
// API (ruff_fmt.d.ts ile doğrulandı): `await init()` sonra
// `format(source, path?, config?)` çağrılır; senkron string döner.
import type { FormatOptions } from './index';
import { FormatError } from './index';

type RuffModule = {
  default: () => Promise<unknown>;
  format: (source: string, path?: string | null, config?: Record<string, unknown> | null) => string;
};

let initPromise: Promise<RuffModule> | null = null;

async function loadModule(): Promise<RuffModule> {
  if (!initPromise) {
    initPromise = (async () => {
      const mod = (await import('@wasm-fmt/ruff_fmt')) as unknown as RuffModule;
      if (typeof mod.default === 'function') {
        await mod.default();
      }
      return mod;
    })();
  }
  return initPromise;
}

function parseLineColumn(message: string): { line?: number; column?: number } {
  // ruff tipik olarak "Line N, column M" veya "--> N:M" biçiminde konum verir.
  const m1 = message.match(/Line\s+(\d+)[,\s]+column\s+(\d+)/i);
  if (m1) return { line: Number(m1[1]), column: Number(m1[2]) };
  const m2 = message.match(/-->\s*(\d+):(\d+)/);
  if (m2) return { line: Number(m2[1]), column: Number(m2[2]) };
  const m3 = message.match(/at line\s+(\d+)/i);
  if (m3) return { line: Number(m3[1]) };
  return {};
}

export async function formatPython(code: string, opts: FormatOptions): Promise<string> {
  const mod = await loadModule();
  try {
    const out = mod.format(code, 'main.py', {
      line_width: 100,
      indent_width: opts.tabWidth,
      indent_style: opts.useTabs ? 'tab' : 'space',
      quote_style: 'double'
    });
    if (typeof out !== 'string' || out.length === 0) {
      throw new FormatError('Biçimlendirme boş sonuç döndürdü');
    }
    return out;
  } catch (err) {
    if (err instanceof FormatError) throw err;
    const e = err as { message?: string };
    const msg = (e.message ?? 'Python biçimlendirme hatası').slice(0, 300);
    const { line, column } = parseLineColumn(msg);
    throw new FormatError(msg.split('\n')[0], line, column);
  }
}