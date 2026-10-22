import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FEATURE_KEYS, type PlanId, type PlanLimits } from '@safecodeshare/shared';
import { apiFetch } from '../api';
import { useAccount } from '../account';
import Shell from '../components/Shell';
import { PlanBadge } from '../components/PlanBits';
import { BuyButtons, ManageButton, PriceLines, useBillingConfig } from '../components/Billing';
import { useI18n } from '../i18n';

type Site = { registrationOpen: boolean; upgradeInfo: string; plans: Record<PlanId, PlanLimits> };

export default function Plans(): JSX.Element {
  const { user, entitlements } = useAccount();
  const { t, tn } = useI18n();
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState(false);
  const billing = useBillingConfig();

  useEffect(() => {
    apiFetch<Site>('/api/public/site')
      .then(setSite)
      .catch(() => setError(true));
  }, []);

  const current = entitlements && !entitlements.unlimited ? entitlements.plan : null;
  const paying = Boolean(entitlements?.billing?.hasAccess);
  const canBuy = Boolean(billing?.enabled && user && entitlements && !entitlements.unlimited && current !== 'pro');

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>{t('plans.title')}</h1>
          <p>{t('plans.subtitle')}</p>
        </div>
        {user && entitlements && <PlanBadge plan={entitlements.plan} admin={entitlements.unlimited} />}
      </div>

      {error && <div className="alert">{t('plans.loadError')}</div>}

      {site && (
        <>
          <div className="plan-compare">
            {(['free', 'pro'] as PlanId[]).map((id) => {
              const p = site.plans[id];
              return (
                <section key={id} className={`plan-col ${id === 'pro' ? 'highlight' : ''}`}>
                  <h2>
                    {t(id === 'free' ? 'plan.free' : 'plan.pro')}
                    {current === id && <span className="plan-badge">{t('plans.current')}</span>}
                  </h2>
                  <p className="limits">
                    {p.maxCourses == null ? t('plans.unlimitedCourses') : tn('plans.maxCourses', p.maxCourses)}
                    <br />
                    {p.maxPads == null ? t('plans.unlimitedPads') : tn('plans.maxPads', p.maxPads)}
                  </p>
                  {id === 'pro' && billing?.enabled && <PriceLines cfg={billing} />}
                  <ul className="feature-list">
                    {FEATURE_KEYS.map((k) => (
                      <li key={k}>
                        <span className={p[k] ? 'yes' : 'no'} aria-label={t(p[k] ? 'feature.included' : 'feature.notIncluded')}>
                          {p[k] ? '✓' : '–'}
                        </span>
                        <span className={p[k] ? '' : 'muted'}>{t(`feature.${k}` as const)}</span>
                      </li>
                    ))}
                  </ul>
                  {id === 'pro' && billing?.enabled && (
                    <div className="plan-cta">
                      {canBuy && <BuyButtons cfg={billing} />}
                      {paying && <ManageButton />}
                      {!user && (
                        <>
                          <p className="muted" style={{ margin: '0 0 10px' }}>{t('billing.signupFirst')}</p>
                          <Link className="btn btn-primary" to="/register">{t('plans.createFree')}</Link>
                        </>
                      )}
                      <p className="hint" style={{ marginBottom: 0 }}>{t('billing.taxNote')}</p>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Ödeme kuruluysa bu kutu yalnızca yönetici bir not yazdıysa görünür. */}
          {(!billing?.enabled || site.upgradeInfo) && (
          <section className="panel" style={{ marginTop: 20 }}>
            <h2>{t('plans.howToUpgrade')}</h2>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{site.upgradeInfo || t('plans.defaultUpgrade')}</p>
            {!user && !billing?.enabled && (
              <p style={{ marginBottom: 0 }}>
                <Link className="btn btn-primary" to="/register">{t('plans.createFree')}</Link>
              </p>
            )}
          </section>
          )}
        </>
      )}
    </Shell>
  );
}
