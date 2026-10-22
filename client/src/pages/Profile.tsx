import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FEATURE_KEYS, type MeResponse } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useAccount } from '../account';
import { useToast } from '../components/Toast';
import Shell from '../components/Shell';
import { PlanBadge, UsageMeter, planExpiryText } from '../components/PlanBits';
import { loadSettings, saveSettings, type AppSettings, type ThemeId, type UiTheme } from '../editor/settings';
import { useI18n } from '../i18n';
import { LocalePicker } from '../i18n/LocalePicker';
import { BillingSummary, BuyButtons, useBillingConfig } from '../components/Billing';

export default function Profile(): JSX.Element {
  const { user, entitlements, setMe, refresh } = useAccount();
  const toast = useToast();
  const i18n = useI18n();
  const { t } = i18n;
  const [name, setName] = useState(user?.name ?? '');
  const [currentPw, setCurrentPw] = useState('');
  const [nextPw, setNextPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const billingCfg = useBillingConfig();
  const [params, setParams] = useSearchParams();
  // Ödeme sayfasından dönüş: Lemon Squeezy'nin bildirimi birkaç saniye içinde gelir; o arada bekle.
  const [confirming, setConfirming] = useState<'idle' | 'waiting' | 'slow'>(
    params.get('billing') === 'success' ? 'waiting' : 'idle'
  );
  const activeRef = useRef(false);
  activeRef.current = Boolean(entitlements?.billing?.hasAccess);

  useEffect(() => {
    if (confirming !== 'waiting') return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries++;
      void refresh().then(() => {
        if (activeRef.current) {
          window.clearInterval(timer);
          setConfirming('idle');
          setParams({}, { replace: true });
          toast.show(t('billing.activated'), 'success');
        } else if (tries >= 20) {
          window.clearInterval(timer);
          setConfirming('slow');
          setParams({}, { replace: true });
        }
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [confirming, refresh, setParams, toast, t]);

  if (!user || !entitlements) return <Shell><div className="spinner" /></Shell>;

  function updateSettings(next: AppSettings): void {
    setSettings(next);
    saveSettings(next);
  }

  async function saveName(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast.show(t('account.nameEmpty'), 'error');
    setBusy(true);
    try {
      setMe(await apiFetch<MeResponse>('/api/auth/profile', { method: 'PATCH', body: { name: trimmed } }));
      toast.show(t('account.nameSaved'), 'success');
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : t('account.nameFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (nextPw.length < 8) return toast.show(t('account.passwordShort'), 'error');
    if (nextPw !== confirmPw) return toast.show(t('account.passwordMismatch'), 'error');
    setBusy(true);
    try {
      await apiFetch('/api/auth/change-password', { method: 'POST', body: { current: currentPw, next: nextPw } });
      toast.show(t('account.passwordChanged'), 'success');
      setCurrentPw('');
      setNextPw('');
      setConfirmPw('');
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : t('account.passwordFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  const ent = entitlements;
  const expiry = planExpiryText(ent, i18n);

  return (
    <Shell narrow>
      <div className="page-head">
        <div>
          <h1>{t('account.title')}</h1>
          <p>{user.email}</p>
        </div>
        <PlanBadge plan={ent.plan} admin={ent.unlimited} />
      </div>

      {confirming === 'waiting' && <div className="alert alert-info" role="status">{t('billing.thanks')}</div>}
      {confirming === 'slow' && <div className="alert alert-warn" role="status">{t('billing.slow')}</div>}

      <section className="panel">
        <h2>{t('account.planSection')}</h2>
        {ent.unlimited ? (
          <p className="muted" style={{ margin: 0 }}>{t('account.adminNoLimits')}</p>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              {t(ent.plan === 'pro' ? 'account.onPro' : 'account.onFree')}
              {expiry ? ` (${expiry})` : ''}.
            </p>
            <div className="panel-row" style={{ marginBottom: 16 }}>
              <UsageMeter label={t('usage.courses')} used={ent.usage.courses} max={ent.limits.maxCourses} />
              <UsageMeter label={t('usage.pads')} used={ent.usage.pads} max={ent.limits.maxPads} />
            </div>
            <ul className="feature-list">
              {FEATURE_KEYS.map((k) => (
                <li key={k}>
                  <span className={ent.limits[k] ? 'yes' : 'no'} aria-label={t(ent.limits[k] ? 'feature.included' : 'feature.notIncluded')}>
                    {ent.limits[k] ? '✓' : '–'}
                  </span>
                  <span className={ent.limits[k] ? '' : 'muted'}>{t(`feature.${k}` as const)}</span>
                </li>
              ))}
            </ul>
            {ent.billing && ent.billing.status !== 'expired' && <BillingSummary billing={ent.billing} />}
            {ent.plan !== 'pro' && (
              <>
                {billingCfg?.enabled && billingCfg.intervals.length > 0 && confirming !== 'waiting' && (
                  <div style={{ marginTop: 16 }}>
                    <BuyButtons cfg={billingCfg} />
                  </div>
                )}
                <p style={{ marginBottom: 0 }}>
                  <Link to="/plans">{t('account.seePro')}</Link>
                </p>
              </>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <h2>{t('account.appearance')}</h2>
        <div className="panel-row">
          <div className="field">
            <label htmlFor="ui-theme">{t('account.uiTheme')}</label>
            <select
              id="ui-theme"
              className="select"
              value={settings.uiTheme}
              onChange={(e) => updateSettings({ ...settings, uiTheme: e.target.value as UiTheme })}
            >
              <option value="auto">{t('account.uiAuto')}</option>
              <option value="light">{t('account.uiLight')}</option>
              <option value="dark">{t('account.uiDark')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ed-theme">{t('account.codeTheme')}</label>
            <select
              id="ed-theme"
              className="select"
              value={settings.theme}
              onChange={(e) => updateSettings({ ...settings, theme: e.target.value as ThemeId })}
            >
              <option value="monokai">{t('theme.monokai')}</option>
              <option value="onedark">{t('theme.onedark')}</option>
              <option value="notepad">{t('theme.notepad')}</option>
            </select>
          </div>
          <div className="field">
            <LocalePicker persist id="profile-locale" />
          </div>
        </div>
      </section>

      <form className="panel" onSubmit={saveName}>
        <h2>{t('account.nameSection')}</h2>
        <div className="field">
          <label htmlFor="p-name">{t('account.nameLabel')}</label>
          <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>{t('account.saveName')}</button>
      </form>

      <form className="panel" onSubmit={savePassword}>
        <h2>{t('account.passwordSection')}</h2>
        <div className="field">
          <label htmlFor="p-cur">{t('account.currentPassword')}</label>
          <input id="p-cur" className="input" type="password" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
        </div>
        <div className="panel-row">
          <div className="field">
            <label htmlFor="p-new">{t('account.newPassword')}</label>
            <input id="p-new" className="input" type="password" autoComplete="new-password" value={nextPw} onChange={(e) => setNextPw(e.target.value)} />
            <span className="hint">{t('register.passwordHint')}</span>
          </div>
          <div className="field">
            <label htmlFor="p-new2">{t('account.newPassword2')}</label>
            <input id="p-new2" className="input" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>{t('account.changePassword')}</button>
        <p className="muted" style={{ marginBottom: 0 }}>{t('account.passwordNote')}</p>
      </form>
    </Shell>
  );
}
