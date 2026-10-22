// Planlar, limitler ve site ayarları — sunucu tarafında TEK doğru kaynak.
// Her özellik kontrolü buradan geçer; istemcideki kilitler yalnızca görseldir.
import {
  DEFAULT_SITE_SETTINGS,
  PLAN_LABELS,
  UNLIMITED,
  normalizeLimits,
  type Entitlements,
  type FeatureKey,
  type PlanId,
  type PlanLimits,
  type SiteSettings
} from '@safecodeshare/shared';
import { FEATURE_LABELS } from '@safecodeshare/shared';
import type { DB } from '../db';
import { HttpError } from '../util/errors';
import { latestSubscription, toBillingInfo } from '../billing/subscriptions';

// ---------------- Site ayarları ----------------

type SettingsRow = { key: string; value: string };

export function getSiteSettings(db: DB): SiteSettings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as SettingsRow[];
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const parse = (k: string): unknown => {
    const v = map.get(k);
    if (v === undefined) return undefined;
    try {
      return JSON.parse(v) as unknown;
    } catch {
      return undefined;
    }
  };
  const reg = parse('registrationOpen');
  const info = parse('upgradeInfo');
  const plans = parse('plans') as Partial<Record<PlanId, unknown>> | undefined;
  return {
    registrationOpen: typeof reg === 'boolean' ? reg : DEFAULT_SITE_SETTINGS.registrationOpen,
    // Boşsa istemci kendi dilinde varsayılan metni gösterir.
    upgradeInfo: typeof info === 'string' ? info : '',
    plans: {
      free: normalizeLimits(plans?.free, DEFAULT_SITE_SETTINGS.plans.free),
      pro: normalizeLimits(plans?.pro, DEFAULT_SITE_SETTINGS.plans.pro)
    }
  };
}

export function saveSiteSettings(db: DB, patch: Partial<SiteSettings>): SiteSettings {
  const now = Date.now();
  const stmt = db.prepare(
    'INSERT INTO settings(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  );
  const tx = db.transaction(() => {
    if (patch.registrationOpen !== undefined) stmt.run('registrationOpen', JSON.stringify(patch.registrationOpen), now);
    if (patch.upgradeInfo !== undefined) stmt.run('upgradeInfo', JSON.stringify(patch.upgradeInfo), now);
    if (patch.plans !== undefined) stmt.run('plans', JSON.stringify(patch.plans), now);
  });
  tx();
  return getSiteSettings(db);
}

// ---------------- Kullanıcı hakları ----------------

type AccountRow = {
  id: string;
  role: 'admin' | 'teacher';
  plan: string;
  plan_expires_at: number | null;
  limits_override: string | null;
};

// Yöneticinin elle verdiği plan (users.plan). Ödemeyle gelen Pro ayrıca eklenir: billingUntil.
export function effectivePlan(
  row: { plan: string; plan_expires_at: number | null },
  now = Date.now(),
  billingUntil = 0
): PlanId {
  if (row.plan === 'pro' && (row.plan_expires_at == null || row.plan_expires_at > now)) return 'pro';
  if (billingUntil > now) return 'pro';
  return 'free';
}

export function parseOverride(raw: string | null): Partial<PlanLimits> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === 'object' ? (v as Partial<PlanLimits>) : null;
  } catch {
    return null;
  }
}

export function getUsage(db: DB, userId: string): { courses: number; pads: number } {
  const c = db.prepare('SELECT COUNT(*) AS n FROM courses WHERE owner_id = ?').get(userId) as { n: number };
  const p = db.prepare('SELECT COUNT(*) AS n FROM pads WHERE owner_id = ?').get(userId) as { n: number };
  return { courses: c.n, pads: p.n };
}

export function getEntitlements(db: DB, userId: string, settings?: SiteSettings): Entitlements {
  const s = settings ?? getSiteSettings(db);
  const row = db
    .prepare('SELECT id, role, plan, plan_expires_at, limits_override FROM users WHERE id = ?')
    .get(userId) as AccountRow | undefined;
  if (!row) throw new HttpError(401, 'Kullanıcı bulunamadı', 'UNAUTHORIZED');
  const usage = getUsage(db, userId);
  const now = Date.now();
  const sub = latestSubscription(db, userId, now);
  const billing = sub ? toBillingInfo(sub, now) : null;
  if (row.role === 'admin') {
    return { plan: 'pro', planExpiresAt: null, unlimited: true, limits: UNLIMITED, usage, upgradeInfo: s.upgradeInfo, billing };
  }
  const billingUntil = sub && billing?.hasAccess ? sub.access_until : 0;
  const plan = effectivePlan(row, now, billingUntil);
  const base = s.plans[plan];
  const limits = normalizeLimits(parseOverride(row.limits_override), base);

  // Pro'nun ne zaman biteceği: süresiz elle verilmiş Pro veya yenilenen abonelik → null (bitiş yok).
  const manualActive = row.plan === 'pro' && (row.plan_expires_at == null || row.plan_expires_at > now);
  let planExpiresAt: number | null = null;
  if (plan === 'pro') {
    const manualOpenEnded = manualActive && row.plan_expires_at == null;
    const billingRenewing = Boolean(billing?.hasAccess && billing.status !== 'cancelled');
    if (!manualOpenEnded && !billingRenewing) {
      const candidates = [manualActive ? row.plan_expires_at : null, billing?.hasAccess ? billing.endsAt : null].filter(
        (v): v is number => typeof v === 'number'
      );
      planExpiresAt = candidates.length ? Math.max(...candidates) : null;
    }
  }
  return { plan, planExpiresAt, unlimited: false, limits, usage, upgradeInfo: s.upgradeInfo, billing };
}

// Özellik kapalıysa 403 fırlatır. Hata kodu istemcinin "Pro'ya geç" mesajını göstermesi içindir.
export function requireFeature(ent: Entitlements, key: FeatureKey): void {
  if (ent.unlimited || ent.limits[key]) return;
  throw new HttpError(
    403,
    '"{feature}" özelliği {plan} planınızda yok.',
    'PLAN_LIMIT',
    { feature: FEATURE_LABELS[key], plan: PLAN_LABELS[ent.plan] },
    ['feature', 'plan']
  );
}

export function requireCapacity(ent: Entitlements, kind: 'courses' | 'pads', adding = 1): void {
  if (ent.unlimited) return;
  const max = kind === 'courses' ? ent.limits.maxCourses : ent.limits.maxPads;
  if (max == null) return;
  if (ent.usage[kind] + adding > max) {
    throw new HttpError(
      403,
      kind === 'courses'
        ? '{plan} planında en fazla {max} ders oluşturabilirsiniz.'
        : '{plan} planında en fazla {max} kod oluşturabilirsiniz.',
      'PLAN_LIMIT',
      { plan: PLAN_LABELS[ent.plan], max },
      ['plan']
    );
  }
}
