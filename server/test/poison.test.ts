// EK §I: zehirleme testleri.
import { describe, expect, it } from 'vitest';
import { renderLines } from '../src/protect/render';
import { poisonLine, cleanColumnToPoisoned, POISON_NBSP, POISON_ZWSP } from '../src/protect/poison';
import type { Line } from '../src/protect/render';

function flatten(line: Line): string {
  return line.map(([t]) => t).join('');
}

describe('poison', () => {
  it('çıktıda U+0020 ve TAB bulunmaz', () => {
    const input = 'def foo(a, b):\n    return a + b\n';
    const lines = renderLines(input, 'python').map(poisonLine);
    for (const line of lines) {
      const text = flatten(line);
      expect(text.includes(' ')).toBe(false);
      expect(text.includes('\t')).toBe(false);
    }
  });

  it('boş olmayan her satır U+200B ile biter', () => {
    const input = 'a\n\nb\n';
    const lines = renderLines(input, 'plaintext').map(poisonLine);
    // Satır 0: 'a' + ZWSP
    expect(flatten(lines[0]).endsWith(POISON_ZWSP)).toBe(true);
    // Satır 1: boş
    expect(flatten(lines[1])).toBe('');
    // Satır 2: 'b' + ZWSP
    expect(flatten(lines[2]).endsWith(POISON_ZWSP)).toBe(true);
  });

  it('U+00A0 → U+0020 ve U+200B silinince orijinal metin elde edilir (TAB içermeyen)', () => {
    const input = 'def foo(a, b):\n    return a + b\n';
    const rawLines = renderLines(input, 'python');
    const poisonedLines = rawLines.map(poisonLine);

    for (let i = 0; i < rawLines.length; i++) {
      const origLine = flatten(rawLines[i]);
      const poisoned = flatten(poisonedLines[i]);
      const reversed = poisoned.split(POISON_NBSP).join(' ').split(POISON_ZWSP).join('');
      expect(reversed).toBe(origLine);
    }
  });

  it('satır sayısı korunur', () => {
    const inputs = [
      '',
      'a',
      'a\n',
      'a\n\nb',
      'a\n\n\nb\nc'
    ];
    for (const inp of inputs) {
      const raw = renderLines(inp, 'plaintext');
      const poisoned = raw.map(poisonLine);
      expect(poisoned.length).toBe(raw.length);
    }
  });

  it('cleanColumnToPoisoned TAB\'lı satırda doğru sonuç verir', () => {
    // '\tabc' — sütun 1 TAB'ın başlangıcı, sütun 2 'a', sütun 3 'b', sütun 4 'c'
    const clean = '\tabc';
    // Sütun 1 → poisoned sütun 1
    expect(cleanColumnToPoisoned(clean, 1)).toBe(1);
    // Sütun 2 (a) → 1 + 4 = 5
    expect(cleanColumnToPoisoned(clean, 2)).toBe(5);
    // Sütun 3 (b) → 6
    expect(cleanColumnToPoisoned(clean, 3)).toBe(6);
    // Sütun 4 (c) → 7
    expect(cleanColumnToPoisoned(clean, 4)).toBe(7);
  });

  it('cleanColumnToPoisoned boşlukları sayar', () => {
    const clean = '  abc';
    expect(cleanColumnToPoisoned(clean, 1)).toBe(1);
    expect(cleanColumnToPoisoned(clean, 2)).toBe(2);
    expect(cleanColumnToPoisoned(clean, 3)).toBe(3); // 'a'
    expect(cleanColumnToPoisoned(clean, 4)).toBe(4); // 'b'
    expect(cleanColumnToPoisoned(clean, 5)).toBe(5); // 'c'
  });

  it('plaintext dilinde span üretilir ama sınıflar boş kalır', () => {
    const input = 'abc def\n';
    const lines = renderLines(input, 'plaintext');
    // İki satır olabilir (son \n sonrası boş satır da sayılır)
    const first = lines[0];
    expect(first.length).toBeGreaterThan(0);
    for (const [, cls] of first) {
      expect(cls).toBe('');
    }
  });
});