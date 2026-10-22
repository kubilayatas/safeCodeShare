// Planlar ve özellik limitleri — istemci ve sunucu aynı tanımı kullanır.

export type PlanId = 'free' | 'pro';
export type UserStatus = 'active' | 'suspended';

export type PlanLimits = {
  maxCourses: number | null; // null = sınırsız
  maxPads: number | null;
  copyProtect: boolean;
  ocrProtect: boolean;
  passwordShares: boolean;
  scheduledShares: boolean; // "şu tarihten itibaren görünür" ve son geçerlilik
  editLinks: boolean;
  versionHistory: boolean;
  exportZip: boolean;
  embed: boolean;
  beautify: boolean;
};

export type FeatureKey = Exclude<keyof PlanLimits, 'maxCourses' | 'maxPads'>;

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  copyProtect: 'Kopyalama koruması',
  ocrProtect: 'AI/OCR koruması',
  passwordShares: 'Şifreli paylaşım',
  scheduledShares: 'Zamanlı paylaşım ve son geçerlilik',
  editLinks: 'Öğrenci düzenleme linki',
  versionHistory: 'Sürüm geçmişi',
  exportZip: 'Dersi zip olarak indirme',
  embed: 'Başka sitelere gömme (iframe)',
  beautify: 'Kod biçimlendirme (✨ Biçimlendir)'
};

export const FEATURE_KEYS = Object.keys(FEATURE_LABELS) as FeatureKey[];

export const PLAN_LABELS: Record<PlanId, string> = { free: 'Ücretsiz', pro: 'Pro' };

export const DEFAULT_PLANS: Record<PlanId, PlanLimits> = {
  free: {
    maxCourses: 3,
    maxPads: 30,
    copyProtect: true,
    ocrProtect: false,
    passwordShares: false,
    scheduledShares: false,
    editLinks: true,
    versionHistory: false,
    exportZip: false,
    embed: false,
    beautify: true
  },
  pro: {
    maxCourses: null,
    maxPads: null,
    copyProtect: true,
    ocrProtect: true,
    passwordShares: true,
    scheduledShares: true,
    editLinks: true,
    versionHistory: true,
    exportZip: true,
    embed: true,
    beautify: true
  }
};

export const UNLIMITED: PlanLimits = { ...DEFAULT_PLANS.pro, maxCourses: null, maxPads: null };

export type SiteSettings = {
  registrationOpen: boolean;
  upgradeInfo: string; // Pro'ya geçmek isteyenlere gösterilecek metin (iletişim, ödeme bilgisi vb.)
  plans: Record<PlanId, PlanLimits>;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  registrationOpen: true,
  upgradeInfo: '', // boşsa istemci kendi dilinde varsayılan metni gösterir
  plans: DEFAULT_PLANS
};

export type Usage = { courses: number; pads: number };

// ---------------- Ödeme (Lemon Squeezy) ----------------

// Lemon Squeezy abonelik durumları
export const BILLING_STATUSES = ['on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];
export type BillingInterval = 'month' | 'year';

// Kullanıcının en güncel aboneliğinin özeti (istemciye gider)
export type BillingInfo = {
  status: BillingStatus;
  interval: BillingInterval | null;
  renewsAt: number | null; // bir sonraki ödeme
  endsAt: number | null; // iptal edildiyse Pro'nun biteceği an
  hasAccess: boolean; // bu abonelik şu an Pro sağlıyor mu
  cardBrand: string | null;
  cardLast4: string | null;
  testMode: boolean;
};

// Planlar sayfası için herkese açık ödeme bilgisi
export type BillingConfig = {
  enabled: boolean; // Lemon Squeezy ayarları yapılmış mı
  intervals: BillingInterval[]; // satın alınabilen dönemler (varyantı tanımlı olanlar)
  currency: string; // ISO kodu, ör. USD
  prices: Record<BillingInterval, number | null>; // en küçük birimde (sent)
};

export type Entitlements = {
  plan: PlanId; // etkin plan (süresi dolan pro → free)
  planExpiresAt: number | null;
  unlimited: boolean; // yönetici
  limits: PlanLimits;
  usage: Usage;
  upgradeInfo: string;
  billing: BillingInfo | null; // ödeme sistemiyle alınmış abonelik (yoksa null)
};

// Ham değeri güvenli bir PlanLimits'e çevirir (eksik alanlar varsayılandan).
export function normalizeLimits(raw: unknown, fallback: PlanLimits): PlanLimits {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, d: number | null): number | null =>
    v === null ? null : typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : d;
  const out: PlanLimits = {
    ...fallback,
    maxCourses: num(src.maxCourses, fallback.maxCourses),
    maxPads: num(src.maxPads, fallback.maxPads)
  };
  for (const k of FEATURE_KEYS) {
    if (typeof src[k] === 'boolean') out[k] = src[k] as boolean;
  }
  return out;
}
