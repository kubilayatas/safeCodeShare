// Plan rozeti, kilit işareti ve kullanım çubuğu.
import { Link } from 'react-router-dom';
import type { Entitlements, PlanId } from '@safecodeshare/shared';
import { useI18n, type I18n } from '../i18n';

export function PlanBadge({ plan, admin, suspended }: { plan: PlanId; admin?: boolean; suspended?: boolean }): JSX.Element {
  const { t } = useI18n();
  if (suspended) return <span className="plan-badge suspended">{t('plan.suspended')}</span>;
  if (admin) return <span className="plan-badge admin">{t('plan.admin')}</span>;
  return <span className={`plan-badge ${plan === 'pro' ? 'pro' : ''}`}>{t(plan === 'pro' ? 'plan.pro' : 'plan.free')}</span>;
}

// Kilitli özelliğin yanında görünen küçük "Pro" bağlantısı.
export function LockChip({ title }: { title?: string }): JSX.Element {
  const { t } = useI18n();
  return (
    <Link className="lock-chip" to="/plans" title={title ?? t('lock.title')}>
      🔒 {t('lock.chip')}
    </Link>
  );
}

export function UsageMeter({ label, used, max }: { label: string; used: number; max: number | null }): JSX.Element {
  const { t, formatNumber } = useI18n();
  const pct = max == null || max === 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="meter">
      <div className="meter-row">
        <span>{label}</span>
        <span className="muted">
          {formatNumber(used)} / {max == null ? t('usage.unlimited') : formatNumber(max)}
        </span>
      </div>
      {max != null && (
        <div className="meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={used} aria-label={label}>
          <div className={`meter-fill ${used >= max ? 'full' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function planExpiryText(ent: Entitlements, i18n: I18n): string | null {
  if (ent.unlimited || ent.plan !== 'pro' || ent.planExpiresAt == null) return null;
  return i18n.t('plan.until', { date: i18n.formatDate(ent.planExpiresAt) });
}
