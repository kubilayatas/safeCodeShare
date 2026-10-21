// Plan rozeti, kilit işareti ve kullanım çubuğu.
import { Link } from 'react-router-dom';
import { PLAN_LABELS, type Entitlements, type PlanId } from '@safecodeshare/shared';

export function PlanBadge({
  plan,
  admin,
  suspended
}: {
  plan: PlanId;
  admin?: boolean;
  suspended?: boolean;
}): JSX.Element {
  if (suspended) return <span className="plan-badge suspended">Askıda</span>;
  if (admin) return <span className="plan-badge admin">Yönetici</span>;
  return <span className={`plan-badge ${plan === 'pro' ? 'pro' : ''}`}>{PLAN_LABELS[plan]}</span>;
}

// Kilitli özelliğin yanında görünen küçük "Pro" bağlantısı.
export function LockChip({ title }: { title?: string }): JSX.Element {
  return (
    <Link className="lock-chip" to="/plans" title={title ?? 'Bu özellik Pro planda. Planları gör.'}>
      🔒 Pro
    </Link>
  );
}

export function UsageMeter({ label, used, max }: { label: string; used: number; max: number | null }): JSX.Element {
  const pct = max == null || max === 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="meter">
      <div className="meter-row">
        <span>{label}</span>
        <span className="muted">
          {used} / {max == null ? 'sınırsız' : max}
        </span>
      </div>
      {max != null && (
        <div
          className="meter-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={used}
          aria-label={label}
        >
          <div className={`meter-fill ${used >= max ? 'full' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function planExpiryText(ent: Entitlements): string | null {
  if (ent.unlimited || ent.plan !== 'pro' || ent.planExpiresAt == null) return null;
  return `${new Date(ent.planExpiresAt).toLocaleDateString('tr-TR')} tarihine kadar`;
}
