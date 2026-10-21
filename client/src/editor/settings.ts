// Kullanıcı ayarları localStorage'da `safecodeshare.settings` anahtarında saklanır.

export type ThemeId = 'monokai' | 'notepad' | 'onedark';

export type AppSettings = {
  theme: ThemeId;
  fontSize: number;
  tabSize: 2 | 4 | 8;
  useTabs: boolean;
  lineWrapping: boolean;
  nickname: string;
};

const KEY = 'safecodeshare.settings';
const LEGACY_KEY = 'kodsinif.settings'; // eski ad; varsa bir kez okunur

const DEFAULTS: AppSettings = {
  theme: 'monokai',
  fontSize: 15,
  tabSize: 2,
  useTabs: false,
  lineWrapping: false,
  nickname: ''
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    // Kaba doğrulama
    const merged: AppSettings = { ...DEFAULTS, ...parsed };
    if (!['monokai', 'notepad', 'onedark'].includes(merged.theme)) merged.theme = 'monokai';
    if (![2, 4, 8].includes(merged.tabSize)) merged.tabSize = 2;
    if (merged.fontSize < 12 || merged.fontSize > 32) merged.fontSize = 15;
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sessizce yut */
  }
}

export function randomStudentName(): string {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `Öğrenci-${n}`;
}

export function ensureNickname(s: AppSettings): AppSettings {
  if (s.nickname && s.nickname.trim().length > 0) return s;
  const next: AppSettings = { ...s, nickname: randomStudentName() };
  saveSettings(next);
  return next;
}

// Kullanıcıya sabit renk atamak için basit hash
const PALETTE = ['#F92672', '#A6E22E', '#66D9EF', '#AE81FF', '#FD971F', '#E6DB74', '#56B6C2', '#F8F8F2'];

export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % PALETTE.length;
  return PALETTE[idx]!;
}