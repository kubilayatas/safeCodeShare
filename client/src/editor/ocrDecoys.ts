// AI/OCR koruması: korumalı görüntüleyicide gerçek kodun etrafına, göze yük
// bindirmeyecek kadar soluk "yem" karakterler yerleştirir.
//
// Fikir: İnsan gözü parlaklık farkını hemen ayırt eder ve soluk karakterleri arka plan
// dokusu gibi algılar. Ekran görüntüsünden ya da telefonla çekilen fotoğraftan metin
// çıkaran OCR / yapay zekâ ise aynı yazı tipi, aynı boyut ve aynı satır hizasındaki
// karakterleri gerçek kodun parçası sanar ve çıktıya karıştırır. Sonuç: kopyalanan kod
// hem girintisi bozulmuş hem de anlamsız parçalar içeren, çalışmayan bir metin olur.
//
// Yerleşim (tek aralıklı yazı tipi sayesinde gerçek kodun hizası hiç bozulmaz):
//   • Satır sonundan sonraki alana          (hafif ve güçlü)
//   • Boş satırlara                         (hafif ve güçlü)
//   • Girinti boşluklarına                  (yalnızca güçlü)
//   • Kelimeler arasındaki tekli boşluklara (yalnızca güçlü)
// Hafif seviye kodun kendisine (girinti dahil) hiç dokunmaz; okuması en rahat olanıdır.
//
// Yemler deterministiktir: aynı satır her zaman aynı yemleri alır. Böylece öğretmen
// yazdıkça yemler titreşip dikkat dağıtmaz.

export type DecoySpan = [text: string, cls: string];

const NBSP = ' ';
const ZWSP = '​';

const COMMON = [
  'x', 'i', 'n', 'k', 'tmp', 'val', 'idx', 'res', 'buf', 'key', 'out', 'obj', 'arr',
  'i += 1', 'n -= 1', 'x = 0', 'k = 2', 'tmp = []', 'res = None', 'return n', 'if k:',
  'pass', 'break', 'len(a)', 'f(x)', 'a[i]', '();', '{}', '[];', '= 1', '+ 2', '* 3', '-1',
  '0', '1', '2', '7', '42', '"a"', "'b'", '#', '//', ':', ';', '==', '!=', '->', '&&'
];

const BY_LANGUAGE: Record<string, string[]> = {
  python: ['def f():', 'self.x', 'import os', 'elif', 'None', 'True', 'print(x)', 'lambda', 'in range(3)', 'yield'],
  java: ['int i;', 'void', 'new A()', 'this.x', 'static', 'final', 'String s', 'i++;', 'null;', 'public'],
  javascript: ['let x', 'const k', '=> x', 'var n', 'this.v', 'null', 'await', '===', 'i++;', 'fn()'],
  typescript: ['let x', ': number', 'as any', 'type T', '=> x', 'const k', '?:', 'i++;'],
  c: ['int i;', 'char *p', 'i++;', 'NULL', 'sizeof', '&x', '->n', 'void', 'p[0]'],
  cpp: ['int i;', 'auto x', 'std::', 'i++;', 'nullptr', '::f()', '&x', '->n', 'cout'],
  csharp: ['var x', 'int i;', 'new T()', 'this.x', 'null;', 'i++;', 'void', 'string s'],
  php: ['$x', '$i++;', 'echo', '->n', 'null;', 'fn()', '$a[0]'],
  go: ['x :=', 'func f()', 'nil', 'err', 'i++', 'go f()', 'var n'],
  rust: ['let x', 'mut', 'fn f()', '&self', 'i += 1;', 'Some(x)', '::new()'],
  sql: ['SELECT', 'FROM t', 'WHERE', 'AND', 'id = 1', 'NULL', 'JOIN'],
  html: ['<div>', '</p>', 'id="a"', '<br>', 'class'],
  css: ['color:', 'px;', 'margin', '0;', '#fff', '{}']
};

function vocabularyFor(language: string): string[] {
  const key =
    language === 'jsx' ? 'javascript' : language === 'tsx' ? 'typescript' : language === 'scss' ? 'css' : language;
  return [...(BY_LANGUAGE[key] ?? []), ...COMMON];
}

// Küçük, hızlı, deterministik sayı üreteci (mulberry32).
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Tam olarak `width` karakterlik, kod benzeri yem metni üretir (boşluklar NBSP).
export function fillDecoy(width: number, vocab: string[], rand: () => number): string {
  if (width <= 0) return '';
  let out = '';
  let guard = 0;
  while (out.length < width && guard++ < 200) {
    const remaining = width - out.length;
    let token = vocab[Math.floor(rand() * vocab.length)];
    if (token.length > remaining) {
      // Kalan yere sığan kısa bir parça seç; yoksa tek karakter.
      const fitting = vocab.filter((t) => t.length <= remaining);
      token = fitting.length > 0 ? fitting[Math.floor(rand() * fitting.length)] : 'x;:_i'.charAt(Math.floor(rand() * 5));
    }
    out += token;
    if (out.length < width) out += ' ';
  }
  return out.slice(0, width).replace(/ /g, NBSP);
}

const SINGLE_GAP_CHARS = ['x', 'i', '_', '1', ':', ';', 'n', '.', 'l', 'o', '=', 'k'];

export type DecoyOptions = {
  level: number; // 0 kapalı, 1 hafif, 2 güçlü
  language: string;
  seed: string; // pad'e özgü (ör. view token)
  width: number; // yemlerin uzanacağı toplam sütun genişliği
};

// Zehirlenmiş satır span'larını alır, yem eklenmiş span'lar döndürür.
// Gerçek karakterler ve hizaları aynen korunur; yalnızca boşluk hücreleri yemle dolar.
export function decorateLine(spans: DecoySpan[], lineIndex: number, opts: DecoyOptions): DecoySpan[] {
  if (opts.level <= 0) return spans;
  const vocab = vocabularyFor(opts.language);
  const text = spans.map((s) => s[0]).join('').replace(new RegExp(ZWSP, 'g'), '');
  const rand = rng(hashString(`${opts.seed}:${lineIndex}:${text.length}:${text.slice(0, 24)}`));

  // Boş (ya da yalnızca boşluk) satır: baştan sona yem.
  if (text.replace(new RegExp(NBSP, 'g'), '').length === 0) {
    const w = Math.max(8, Math.min(opts.width, 12 + Math.floor(rand() * Math.max(1, opts.width - 12))));
    return [[fillDecoy(w, vocab, rand), 'tk-decoy']];
  }

  const out: DecoySpan[] = [];
  let leading = true;
  for (const [segText, cls] of spans) {
    let buf = '';
    let i = 0;
    const flush = (): void => {
      if (buf) {
        out.push([buf, cls]);
        buf = '';
      }
    };
    while (i < segText.length) {
      const ch = segText[i];
      if (leading && ch === NBSP && opts.level >= 2) {
        // Girinti bloğunu topla
        let j = i;
        while (j < segText.length && segText[j] === NBSP) j++;
        const run = j - i;
        flush();
        // Bir hücre boş kalsın ki gerçek kod gözle ayrılabilsin.
        if (run >= 2) out.push([fillDecoy(run - 1, vocab, rand) + NBSP, 'tk-decoy']);
        else out.push([NBSP, cls]);
        i = j;
        continue;
      }
      if (ch !== NBSP && ch !== ZWSP) leading = false;
      // Güçlü seviye: kelimeler arasındaki tekli boşluklara soluk karakter.
      if (
        opts.level >= 2 &&
        !leading &&
        ch === NBSP &&
        segText[i - 1] !== NBSP &&
        segText[i + 1] !== undefined &&
        segText[i + 1] !== NBSP &&
        rand() < 0.7
      ) {
        flush();
        out.push([SINGLE_GAP_CHARS[Math.floor(rand() * SINGLE_GAP_CHARS.length)], 'tk-decoy']);
        i++;
        continue;
      }
      buf += ch;
      i++;
    }
    flush();
  }

  // Satır sonu: iki hücre boşluk bırakıp genişliğe kadar yem.
  const visibleLen = text.length;
  const trail = opts.width - visibleLen - 2;
  if (trail >= 3) out.push([NBSP + NBSP + fillDecoy(trail, vocab, rand), 'tk-decoy']);
  return out;
}

// Tüm belge için yem genişliği: en uzun satır + biraz pay (en az 40, en fazla 110).
export function decoyWidthFor(lineLengths: number[]): number {
  const longest = lineLengths.reduce((m, n) => Math.max(m, n), 0);
  return Math.max(40, Math.min(110, longest + 14));
}
