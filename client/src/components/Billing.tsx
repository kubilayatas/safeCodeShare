// Ödeme (Lemon Squeezy) arayüz parçaları: fiyatlar, satın alma ve abonelik yönetimi.
import { useEffect, useState } from 'react';
import type { BillingConfig, BillingInfo, BillingInterval } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useToast } from './Toast';
import { useI18n, type I18n } from '../i18n';

let configPromise: Promise<BillingConfig> | null = null;

// Ödeme ayarları sayfa başına bir kez alınır.
export function useBillingConfig(): BillingConfig | null {
  const [cfg, setCfg] = useState<BillingConfig | null>(null);
  useEffect(() => {
    configPromise ??= apiFetch<BillingConfig>('/api/billing/config').catch(() => {
      configPromise = null;
      return { enabled: false, intervals: [], currency: 'USD', prices: { month: null, year: null } } satisfies BillingConfig;
    });
    let alive = true;
    void configPromise.then((c) => alive && setCfg(c));
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}

export function formatPrice(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

// Yıllık ödemede aylığa göre yüzde kaç tasarruf (tam sayı); anlamlı değilse null.
export function yearlySavings(cfg: BillingConfig): number | null {
  const m = cfg.prices.month;
  const y = cfg.prices.year;
  if (!m || !y) return null;
  const pct = Math.round((1 - y / (m * 12)) * 100);
  return pct >= 5 ? pct : null;
}

async function openPortal(t: I18n['t'], toast: ReturnType<typeof useToast>): Promise<void> {
  try {
    const { url } = await apiFetch<{ url: string }>('/api/billing/portal');
    window.location.assign(url);
  } catch (err) {
    toast.show(err instanceof ApiError ? err.message : t('billing.portalFailed'), 'error');
  }
}

export function BuyButtons({ cfg }: { cfg: BillingConfig }): JSX.Element {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState<BillingInterval | null>(null);

  async function buy(interval: BillingInterval): Promise<void> {
    setBusy(interval);
    try {
      const { url } = await apiFetch<{ url: string }>('/api/billing/checkout', { method: 'POST', body: { interval } });
      window.location.assign(url);
    } catch (err) {
      setBusy(null);
      if (err instanceof ApiError && err.code === 'ALREADY_SUBSCRIBED') return openPortal(t, toast);
      toast.show(err instanceof ApiError ? err.message : t('billing.checkoutFailed'), 'error');
    }
  }

  return (
    <div className="buy-row">
      {cfg.intervals.map((i) => (
        <button
          key={i}
          className={`btn ${i === 'year' ? 'btn-primary' : ''}`}
          disabled={busy !== null}
          onClick={() => void buy(i)}
        >
          {busy === i ? t('billing.opening') : t(i === 'month' ? 'billing.buyMonthly' : 'billing.buyYearly')}
        </button>
      ))}
    </div>
  );
}

export function ManageButton({ primary, label }: { primary?: boolean; label?: string }): JSX.Element {
  const { t } = useI18n();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`btn ${primary ? 'btn-primary' : ''}`}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void openPortal(t, toast).finally(() => setBusy(false));
      }}
    >
      {busy ? t('billing.opening') : (label ?? t('billing.manage'))}
    </button>
  );
}

export function PriceLines({ cfg }: { cfg: BillingConfig }): JSX.Element | null {
  const { t, locale } = useI18n();
  const save = yearlySavings(cfg);
  if (cfg.prices.month === null && cfg.prices.year === null) return null;
  return (
    <p className="price-lines">
      {cfg.prices.month !== null && (
        <span className="price">{t('billing.perMonth', { price: formatPrice(cfg.prices.month, cfg.currency, locale) })}</span>
      )}
      {cfg.prices.year !== null && (
        <span className="price">
          {t('billing.perYear', { price: formatPrice(cfg.prices.year, cfg.currency, locale) })}
          {save !== null && <span className="save-chip">{t('billing.save', { percent: save })}</span>}
        </span>
      )}
    </p>
  );
}

// Aboneliğin durumunu tek cümleyle anlatır.
export function BillingStatusText({ billing }: { billing: BillingInfo }): JSX.Element {
  const { t, formatDate } = useI18n();
  let text: string;
  switch (billing.status) {
    case 'active':
    case 'on_trial':
      text = billing.renewsAt ? t('billing.renewsOn', { date: formatDate(billing.renewsAt) }) : t('billing.status.active');
      break;
    case 'cancelled':
      text = billing.hasAccess && billing.endsAt ? t('billing.endsOn', { date: formatDate(billing.endsAt) }) : t('billing.ended');
      break;
    case 'past_due':
    case 'unpaid':
      text = t('billing.pastDue');
      break;
    case 'paused':
      text = t('billing.paused');
      break;
    default:
      text = t('billing.ended');
  }
  return <>{text}</>;
}

export function BillingSummary({ billing }: { billing: BillingInfo }): JSX.Element {
  const { t } = useI18n();
  const problem = billing.status === 'past_due' || billing.status === 'unpaid';
  return (
    <div className={`billing-box ${problem ? 'warn' : ''}`}>
      <div className="billing-head">
        <strong>{t('billing.title')}</strong>
        <span className="plan-badge">{t(`billing.status.${billing.status}` as const)}</span>
        {billing.interval && <span className="muted">{t(billing.interval === 'month' ? 'billing.monthlyPlan' : 'billing.yearlyPlan')}</span>}
        {billing.testMode && <span className="plan-badge suspended">{t('billing.testMode')}</span>}
      </div>
      <p style={{ margin: '6px 0 0' }}>
        <BillingStatusText billing={billing} />
      </p>
      {billing.cardLast4 && (
        <p className="muted" style={{ margin: '4px 0 0' }} dir="auto">
          {t('billing.card', { brand: (billing.cardBrand ?? '').toUpperCase(), last4: billing.cardLast4 })}
        </p>
      )}
      <div className="toolbar-row" style={{ marginTop: 12, marginBottom: 0 }}>
        {problem && <ManageButton primary label={t('billing.updateCard')} />}
        {billing.status !== 'expired' && <ManageButton />}
      </div>
    </div>
  );
}
