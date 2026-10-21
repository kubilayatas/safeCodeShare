// Go biçimlendirici — @wasm-fmt/gofmt.
// API VARSAYIMI: `import init, { format } from '@wasm-fmt/gofmt'`; `await init()` sonra `format(source)`.
import { FormatError } from './index';

type GoModule = {
  default: () => Promise<unknown>;
  format: (source: string) => string;
};

let initPromise: Promise<GoModule> | null = null;

async function loadModule(): Promise<GoModule> {
  if (!initPromise) {
    initPromise = (async () => {
      const mod = (await import('@wasm-fmt/gofmt')) as unknown as GoModule;
      if (typeof mod.default === 'function') {
        await mod.default();
      }
      return mod;
    })();
  }
  return initPromise;
}

export async function formatGo(code: string): Promise<string> {
  const mod = await loadModule();
  try {
    const out = mod.format(code);
    if (typeof out !== 'string' || out.length === 0) {
      throw new FormatError('Biçimlendirme boş sonuç döndürdü');
    }
    return out;
  } catch (err) {
    if (err instanceof FormatError) throw err;
    const e = err as { message?: string };
    const msg = (e.message ?? 'Go biçimlendirme hatası').slice(0, 300);
    const m = msg.match(/:(\d+):(\d+):/);
    const line = m ? Number(m[1]) : undefined;
    const column = m ? Number(m[2]) : undefined;
    throw new FormatError(msg.split('\n')[0], line, column);
  }
}