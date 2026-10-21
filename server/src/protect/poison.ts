// Zehirleme: temiz satır span'larını görsel olarak birebir aynı ama kopyalanınca
// çalışmayan span'lara dönüştürür.
import type { Line } from './render';

const NBSP = '\u00A0'; // bölünmez boşluk
const ZWSP = '\u200B'; // sıfır genişlikli boşluk

// 1) Her ' ' → NBSP.
// 2) Her '\t' → 4× NBSP.
// 3) Boş olmayan her satırın sonuna ZWSP eklenir.
export function poisonLine(line: Line): Line {
  const out: Line = [];
  for (const [text, cls] of line) {
    let poisoned = '';
    for (const ch of text) {
      if (ch === ' ') poisoned += NBSP;
      else if (ch === '\t') poisoned += NBSP.repeat(4);
      else poisoned += ch;
    }
    if (poisoned.length > 0) out.push([poisoned, cls]);
  }

  // Boş olmayan satır tespiti
  const isNonEmpty = out.some(([text]) => text.replace(/[\u00A0]/g, '').length > 0);

  if (isNonEmpty) {
    if (out.length === 0) {
      // teorik olarak olmaz ama güvenli tarafta kalalım
      out.push([ZWSP, '']);
    } else {
      const last = out.length - 1;
      out[last] = [out[last][0] + ZWSP, out[last][1]];
    }
  }

  return out;
}

// Temiz metindeki 1 tabanlı sütunu, zehirli metindeki 1 tabanlı sütuna çevirir.
// TAB 4 karakter genişliğinde sayılır.
export function cleanColumnToPoisoned(cleanLineText: string, col: number): number {
  const limit = Math.min(col - 1, cleanLineText.length);
  let poisonedCol = 1;
  for (let i = 0; i < limit; i++) {
    const ch = cleanLineText[i];
    if (ch === '\t') poisonedCol += 4;
    else poisonedCol += 1;
  }
  return poisonedCol;
}

export const POISON_NBSP = NBSP;
export const POISON_ZWSP = ZWSP;