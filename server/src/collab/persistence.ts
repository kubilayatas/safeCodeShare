// Yjs dokümanının yüklenmesi ve kaydedilmesi (spesifikasyon §6).
import * as Y from 'yjs';
import type { DB } from '../db';
import type { PadRow } from '../util/rows';

const AUTO_VERSION_INTERVAL_MS = 10 * 60 * 1000; // 10 dakika
const MAX_AUTO_VERSIONS = 200;

type PadRowWithYdoc = PadRow;

export type LoadResult = {
  contentText: string;
  language: string;
  title: string;
} | null;

export function loadPad(db: DB, padId: string): PadRowWithYdoc | null {
  const row = db.prepare('SELECT * FROM pads WHERE id = ?').get(padId) as PadRowWithYdoc | undefined;
  return row ?? null;
}

// onLoadDocument: ydoc'a önceki durumu uygular, meta'yı doldurur.
export function applyLoadedState(
  ydoc: Y.Doc,
  row: PadRowWithYdoc
): LoadResult {
  if (row.ydoc && row.ydoc.length > 0) {
    try {
      Y.applyUpdate(ydoc, new Uint8Array(row.ydoc));
    } catch (err) {
      console.error(`[persistence] ydoc uygulanamadı: ${row.id}`, err);
    }
  } else if (row.content_text.length > 0) {
    const ytext = ydoc.getText('code');
    // Yalnızca boşsa doldur
    if (ytext.length === 0) {
      ytext.insert(0, row.content_text);
    }
  }

  const meta = ydoc.getMap<string>('meta');
  if (!meta.get('language') && row.language) meta.set('language', row.language);
  if (!meta.get('title') && row.title) meta.set('title', row.title);

  return { contentText: row.content_text, language: row.language, title: row.title };
}

export function storePad(db: DB, padId: string, ydoc: Y.Doc): void {
  const ytext = ydoc.getText('code');
  const content = ytext.toString();
  const lineCount = content.length === 0 ? 0 : content.split('\n').length;
  const meta = ydoc.getMap<string>('meta');
  const language = meta.get('language') ?? 'plaintext';
  // Not: başlık BURADAN yazılmaz. Başlığın tek doğru kaynağı DB'dir (REST PATCH).
  // Eskiden meta.title buraya yazılıyordu; öğretmen başlığı değiştirince bir sonraki
  // kayıtta eski başlık geri geliyordu.

  // 1 MB sınır
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > 1024 * 1024) {
    console.warn(`[persistence] pad ${padId} 1 MB sınırını aştı (${bytes} B), kaydedilmedi.`);
    return;
  }

  const encoded = Y.encodeStateAsUpdate(ydoc);
  const now = Date.now();

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE pads
         SET ydoc = ?, content_text = ?, line_count = ?, language = COALESCE(NULLIF(?, ''), language),
             updated_at = ?
       WHERE id = ?`
    ).run(Buffer.from(encoded), content, lineCount, language, now, padId);

    // Pad bu sırada silindiyse sürüm eklemeye çalışma (yabancı anahtar hatası verir).
    if (db.prepare('SELECT 1 FROM pads WHERE id = ?').get(padId) === undefined) return;

    // Otomatik sürüm (10 dakikada bir, içerik değişmişse)
    const lastAuto = db
      .prepare(
        `SELECT created_at, content_text FROM pad_versions
           WHERE pad_id = ? AND is_auto = 1
           ORDER BY created_at DESC LIMIT 1`
      )
      .get(padId) as { created_at: number; content_text: string } | undefined;

    const tenMinAgo = now - AUTO_VERSION_INTERVAL_MS;
    const needsAuto =
      !lastAuto || (lastAuto.created_at < tenMinAgo && lastAuto.content_text !== content);

    if (needsAuto) {
      db.prepare(
        `INSERT INTO pad_versions(pad_id, content_text, ydoc, language, label, is_auto, created_by, created_at)
         VALUES (?, ?, ?, ?, NULL, 1, NULL, ?)`
      ).run(padId, content, Buffer.from(encoded), language, now);

      // Eski otomatik sürümleri kırp (manuel sürümler korunur)
      const autoRows = db
        .prepare(
          `SELECT id FROM pad_versions WHERE pad_id = ? AND is_auto = 1 ORDER BY created_at DESC`
        )
        .all(padId) as Array<{ id: number }>;
      if (autoRows.length > MAX_AUTO_VERSIONS) {
        const toDelete = autoRows.slice(MAX_AUTO_VERSIONS).map((r) => r.id);
        const stmt = db.prepare('DELETE FROM pad_versions WHERE id = ?');
        for (const id of toDelete) stmt.run(id);
      }
    }
  });

  tx();
}