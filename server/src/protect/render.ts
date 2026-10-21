// Temiz metni Lezer ile ayrıştırıp, satır satır `[text, cls]` span dizisine çevirir.
// Bu fonksiyon ZEHİRLENMEMİŞ metin üzerinde çalışır; zehirleme ayrı adımdır (poison.ts).
import { highlightTree } from '@lezer/highlight';
import { tkHighlighter } from '@kodsinif/shared';
import { getParserFor } from './parsers';

export type LineSpan = [text: string, cls: string];
export type Line = LineSpan[];

type Range = { from: number; to: number; cls: string };

export function renderLines(cleanText: string, language: string): Line[] {
  const parser = getParserFor(language);

  // 1) Satır başlangıç ofsetleri
  const lineStarts: number[] = [0];
  for (let i = 0; i < cleanText.length; i++) {
    if (cleanText[i] === '\n') lineStarts.push(i + 1);
  }

  // 2) Renk aralıklarını topla
  const ranges: Range[] = [];
  if (parser) {
    try {
      const tree = parser.parse(cleanText);
      highlightTree(tree, tkHighlighter, (from, to, cls) => {
        ranges.push({ from, to, cls });
      });
    } catch (err) {
      console.warn(`[protect] parser hatası (${language}):`, err);
    }
  }

  // 3) Aralıkları sırala (highlightTree sıralı verir ama garanti altına alalım)
  ranges.sort((a, b) => a.from - b.from || a.to - b.to);

  // 4) Satırları üret
  const lines: Line[] = [];
  let rangeIdx = 0;

  for (let li = 0; li < lineStarts.length; li++) {
    const lineStart = lineStarts[li];
    const lineEnd = li + 1 < lineStarts.length ? lineStarts[li + 1] - 1 : cleanText.length;

    // Bu satırın dışındaki aralıkları atla
    while (rangeIdx < ranges.length && ranges[rangeIdx].to <= lineStart) rangeIdx++;

    const spans: LineSpan[] = [];
    let pos = lineStart;
    let rIdx = rangeIdx;

    while (pos < lineEnd && rIdx < ranges.length && ranges[rIdx].from < lineEnd) {
      const r = ranges[rIdx];
      const from = Math.max(r.from, pos);
      const to = Math.min(r.to, lineEnd);
      if (from > pos) {
        spans.push([cleanText.slice(pos, from), '']);
      }
      if (to > from) {
        spans.push([cleanText.slice(from, to), r.cls]);
      }
      pos = to;
      if (r.to <= lineEnd) rIdx++;
      else break;
    }

    if (pos < lineEnd) {
      spans.push([cleanText.slice(pos, lineEnd), '']);
    }

    lines.push(spans);
  }

  return lines;
}

// Y offset → satır/sütun (1 tabanlı sütun) dönüşümü.
export function offsetToLineCol(text: string, offset: number): { line: number; col: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < Math.min(offset, text.length); i++) {
    if (text[i] === '\n') {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, col: offset - lineStart + 1 };
}