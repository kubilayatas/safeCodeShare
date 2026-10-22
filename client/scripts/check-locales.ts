// Çeviri dosyalarını denetler: eksik/fazla anahtar, yer tutucu farkı ve
// her dilin Intl.PluralRules kategorilerinin tamamının yazılmış olması.
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import en from '../src/i18n/locales/en';

type Val = string | Record<string, string>;
const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n/locales');
const ph = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const phOf = (v: Val): string => (typeof v === 'string' ? ph(v) : ph(v.other!));

// Bu kategorilerde "other" biçimi dilbilgisel olarak doğrudur, ayrıca yazılması gerekmez:
// Türkçede sayıdan sonra isim tekil kalır; Roman dillerindeki "many" yalnızca 1 000 000 gibi
// büyük yuvarlak sayılar içindir ve "other" ile aynıdır.
const OPTIONAL: Record<string, string[]> = { tr: ['one'], fr: ['many'], es: ['many'], it: ['many'], 'pt-BR': ['many'] };

let problems = 0;
const report = (msg: string): void => {
  problems++;
  console.log('  ✗ ' + msg);
};

for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'en.ts')) {
  const code = file.replace(/\.ts$/, '');
  const mod = (await import(join(dir, file))) as { default: Record<string, Val> };
  const m = mod.default;
  const ref = en as unknown as Record<string, Val>;
  console.log(code);
  const cats = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
  for (const k of Object.keys(ref)) {
    const v = m[k];
    if (v === undefined) { report(`${k}: eksik`); continue; }
    if (typeof v !== typeof ref[k]) { report(`${k}: tür farklı`); continue; }
    if (typeof v === 'string') {
      if (!v.trim()) report(`${k}: boş`);
      if (ph(v) !== phOf(ref[k]!)) report(`${k}: yer tutucu ${ph(v)} ≠ ${phOf(ref[k]!)}`);
    } else {
      for (const c of cats) if (!(c in v) && !(OPTIONAL[code] ?? []).includes(c)) report(`${k}: çoğul "${c}" eksik`);
      for (const [c, s] of Object.entries(v)) {
        // Sayının yazıyla ifade edildiği biçimler (ör. Arapça "مقطع واحد") {count} içermeyebilir.
        const want = phOf(ref[k]!).split(',').filter((x) => x && x !== 'count');
        const got = ph(s).split(',').filter((x) => x && x !== 'count');
        if (want.join() !== got.join()) report(`${k}.${c}: yer tutucu farklı`);
      }
    }
  }
  for (const k of Object.keys(m)) if (!(k in ref)) report(`${k}: fazla anahtar`);
}
console.log(problems ? `\n${problems} sorun` : '\nTüm diller tam.');
process.exit(problems ? 1 : 0);
