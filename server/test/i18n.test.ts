// Sunucu çevirileri: koddaki her kaynak metnin her dilde karşılığı olmalı,
// yer tutucular ({plan}, {max}...) çevirilerde aynen korunmalı.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCALES } from '@safecodeshare/shared';
import { CATALOG, LANG_ORDER, TABLE } from '../src/i18n/catalog';
import { ts } from '../src/i18n';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
  });
}

// tools/server_msgs.py ile aynı çıkarım kuralları
function extractSources(): string[] {
  const out = new Set<string>();
  const pats = [
    /sendError\(\s*res,\s*\d+,\s*'([^']+)'/g,
    /new HttpError\(\s*\d+,\s*'([^']+)'/g,
    /tReq\(\s*(?:req|res\.req|null),\s*'([^']+)'/g,
    /\?\s*'(\{plan\}[^']+)'/g,
    /:\s*'(\{plan\}[^']+)'/g,
    /msg:\s*'([^']+)'/g,
    /reason:\s*'([^']+)'/g,
    /new FormatError\(\s*'([^']+)'/g,
    /'([^']*[çğıöşüÇĞİÖŞÜ][^']*)'\s*,\s*'PLAN_LIMIT'/g,
    /\?\?\s*'([^']*(?: |[çğıöşüÇĞİÖŞÜ])[^']*)'/g
  ];
  for (const f of walk(join(root, 'server', 'src'))) {
    if (f.includes(`${'/'}i18n${'/'}`) || f.includes('\\i18n\\')) continue;
    const s = readFileSync(f, 'utf8');
    for (const p of pats) for (const m of s.matchAll(p)) out.add(m[1]!);
  }
  const schemas = readFileSync(join(root, 'shared', 'src', 'schemas.ts'), 'utf8');
  for (const m of schemas.matchAll(/(?:min|max|email|literal|refine)\([^)]*?'([^']+)'/g)) if (m[1]!.includes(' ')) out.add(m[1]!);
  for (const m of schemas.matchAll(/message:\s*'([^']+)'/g)) out.add(m[1]!);
  const plans = readFileSync(join(root, 'shared', 'src', 'plans.ts'), 'utf8');
  const block = plans.slice(plans.indexOf('FEATURE_LABELS'), plans.indexOf('FEATURE_KEYS'));
  for (const m of block.matchAll(/:\s*'([^']+)'/g)) out.add(m[1]!);
  for (const m of plans.matchAll(/PLAN_LABELS[^=]*=\s*\{([^}]*)\}/g))
    for (const mm of m[1]!.matchAll(/'([^']+)'/g)) if (mm[1] !== 'free' && mm[1] !== 'pro') out.add(mm[1]!);
  return [...out].filter((x) => !/^[A-Z_]+$/.test(x)).sort();
}

const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe('sunucu çevirileri', () => {
  const sources = extractSources();

  it('çıkarıcı makul sayıda metin buluyor', () => {
    expect(sources.length).toBeGreaterThan(80);
  });

  it('koddaki her metin katalogda var', () => {
    const missing = sources.filter((s) => !(s in TABLE));
    expect(missing).toEqual([]);
  });

  it('Türkçe dışındaki her dil katalogda', () => {
    const expected = LOCALES.map((l) => l.code).filter((c) => c !== 'tr').sort();
    expect([...LANG_ORDER].sort()).toEqual(expected);
  });

  it('her satır tam ve yer tutucular korunmuş', () => {
    const problems: string[] = [];
    for (const [src, row] of Object.entries(TABLE)) {
      if (row.length !== LANG_ORDER.length) problems.push(`${src}: ${row.length} çeviri`);
      row.forEach((tr, i) => {
        if (!tr || !tr.trim()) problems.push(`${src} [${LANG_ORDER[i]}] boş`);
        else if (placeholders(tr).join() !== placeholders(src).join()) problems.push(`${src} [${LANG_ORDER[i]}] yer tutucu farklı`);
      });
    }
    expect(problems).toEqual([]);
  });

  it('parametreler ve iç içe çeviri çalışıyor', () => {
    expect(ts('de', '"{feature}" özelliği {plan} planınızda yok.', { feature: 'Sürüm geçmişi', plan: 'Ücretsiz' }, ['feature', 'plan'])).toBe(
      'Die Funktion „Versionsverlauf“ ist im Tarif „Kostenlos“ nicht enthalten.'
    );
    expect(ts('tr', 'Şifre hatalı')).toBe('Şifre hatalı');
    expect(ts('ja', 'Bilinmeyen metin')).toBe('Bilinmeyen metin');
    expect(CATALOG.en?.['Sunucu hatası']).toBe('Server error');
  });
});
