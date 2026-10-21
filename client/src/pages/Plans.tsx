import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FEATURE_KEYS, FEATURE_LABELS, type PlanId, type PlanLimits } from '@safecodeshare/shared';
import { apiFetch } from '../api';
import { useAccount } from '../account';
import Shell from '../components/Shell';
import { PlanBadge } from '../components/PlanBits';

type Site = { registrationOpen: boolean; upgradeInfo: string; plans: Record<PlanId, PlanLimits> };

function limitText(n: number | null, unit: string): string {
  return n == null ? `Sınırsız ${unit}` : `En fazla ${n} ${unit}`;
}

export default function Plans(): JSX.Element {
  const { user, entitlements } = useAccount();
  const [site, setSite] = useState<Site | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch<Site>('/api/public/site')
      .then(setSite)
      .catch(() => setError(true));
  }, []);

  const current = entitlements && !entitlements.unlimited ? entitlements.plan : null;

  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Planlar</h1>
          <p>Ücretsiz planla derse hemen başlayabilirsin. Pro, sınırları kaldırır ve tüm korumaları açar.</p>
        </div>
        {user && entitlements && <PlanBadge plan={entitlements.plan} admin={entitlements.unlimited} />}
      </div>

      {error && <div className="alert">Plan bilgisi yüklenemedi. Sayfayı yenilemeyi dene.</div>}

      {site && (
        <>
          <div className="plan-compare">
            {(['free', 'pro'] as PlanId[]).map((id) => {
              const p = site.plans[id];
              return (
                <section key={id} className={`plan-col ${id === 'pro' ? 'highlight' : ''}`}>
                  <h2>
                    {id === 'free' ? 'Ücretsiz' : 'Pro'}
                    {current === id && <span className="plan-badge">Şu anki planın</span>}
                  </h2>
                  <p className="limits">
                    {limitText(p.maxCourses, 'ders')}
                    <br />
                    {limitText(p.maxPads, 'kod')}
                  </p>
                  <ul className="feature-list">
                    {FEATURE_KEYS.map((k) => (
                      <li key={k}>
                        <span className={p[k] ? 'yes' : 'no'} aria-label={p[k] ? 'var' : 'yok'}>
                          {p[k] ? '✓' : '–'}
                        </span>
                        <span className={p[k] ? '' : 'muted'}>{FEATURE_LABELS[k]}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <section className="panel" style={{ marginTop: 20 }}>
            <h2>Pro'ya nasıl geçilir?</h2>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{site.upgradeInfo}</p>
            {!user && (
              <p style={{ marginBottom: 0 }}>
                <Link className="btn btn-primary" to="/register">Ücretsiz hesap oluştur</Link>
              </p>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}
