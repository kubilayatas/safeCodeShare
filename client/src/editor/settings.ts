// Kullanıcı ayarları localStorage'da `safecodeshare.settings` anahtarında saklanır.

export type ThemeId = 'monokai' | 'notepad' | 'onedark';
export type UiTheme = 'auto' | 'light' | 'dark';

export type AppSettings = {
  theme: ThemeId;
  fontSize: number;
  tabSize: 2 | 4 | 8;
  useTabs: boolean;
  lineWrapping: boolean;
  nickname: string;
  uiTheme: UiTheme; // panel, profil, yönetim gibi sayfaların görünümü
};

const KEY = 'safecodeshare.settings';
const LEGACY_KEY = 'kodsinif.settings'; // eski ad; varsa bir kez okunur

const DEFAULTS: AppSettings = {
  theme: 'monokai',
  fontSize: 15,
  tabSize: 2,
  useTabs: false,
  lineWrapping: false,
  nickname: '',
  uiTheme: 'auto'
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
    if (!['auto', 'light', 'dark'].includes(merged.uiTheme)) merged.uiTheme = 'auto';
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
  applyUiTheme(s.uiTheme);
}

// <html data-theme="..."> ayarlar. 'auto' sistem tercihini izler (CSS'teki prefers-color-scheme).
export function applyUiTheme(t: UiTheme): void {
  try {
    if (t === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  } catch {
    /* sunucu tarafı / test ortamı */
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