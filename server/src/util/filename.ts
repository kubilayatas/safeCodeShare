// Başlıktan güvenli dosya adı üretir.
// Türkçe karakterler dönüştürülür (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u).

const TR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u'
};

export function safeSlug(input: string): string {
  // Önce Türkçe karakterleri dönüştür
  let s = '';
  for (const ch of input) {
    s += TR_MAP[ch] ?? ch;
  }
  // Küçük harfe indir
  s = s.toLowerCase();
  // Aksanları kaldır (Latin)
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Geçersiz karakterleri - ile değiştir
  s = s.replace(/[^a-z0-9]+/g, '-');
  // Baş/son tireleri kırp
  s = s.replace(/^-+|-+$/g, '');
  if (s.length === 0) s = 'kod';
  if (s.length > 80) s = s.slice(0, 80).replace(/-+$/g, '');
  return s;
}

export function safeFilename(title: string, extension: string): string {
  const base = safeSlug(title);
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `${base}${ext}`;
}