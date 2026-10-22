import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MeResponse } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useAccount } from '../account';
import { useToast } from '../components/Toast';
import AuthLayout from '../components/AuthLayout';
import { useI18n } from '../i18n';
import { Rich } from '../i18n/LocalePicker';

export default function Register(): JSX.Element {
  const { setMe } = useAccount();
  const toast = useToast();
  const { t, locale } = useI18n();
  const [open, setOpen] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [accept, setAccept] = useState(false);
  const [website, setWebsite] = useState(''); // bot tuzağı
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ registrationOpen: boolean }>('/api/public/site')
      .then((s) => setOpen(s.registrationOpen))
      .catch(() => setOpen(true));
  }, []);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError(t('register.errPasswordShort'));
    if (password !== password2) return setError(t('register.errPasswordMismatch'));
    if (!accept) return setError(t('register.errTerms'));
    setBusy(true);
    try {
      const me = await apiFetch<MeResponse>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password, acceptTerms: true, website, locale }
      });
      toast.show(t('register.created'), 'success');
      setMe(me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.unreachable'));
    } finally {
      setBusy(false);
    }
  }

  if (open === false) {
    return (
      <AuthLayout>
        <div className="login-card">
          <h1 className="login-title">{t('register.closedTitle')}</h1>
          <p className="login-sub">{t('register.closedBody')}</p>
          <Link className="btn btn-primary btn-block" to="/login">{t('nav.login')}</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="login-card" onSubmit={submit} noValidate>
        <h1 className="login-title">{t('register.title')}</h1>
        <p className="login-sub">{t('register.subtitle')}</p>

        {error && <div className="alert" role="alert">{error}</div>}

        <div className="field">
          <label htmlFor="r-name">{t('register.name')}</label>
          <input id="r-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          <span className="hint">{t('register.nameHint')}</span>
        </div>
        <div className="field">
          <label htmlFor="r-email">{t('register.email')}</label>
          <input id="r-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="r-pass">{t('register.password')}</label>
          <input id="r-pass" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <span className="hint">{t('register.passwordHint')}</span>
        </div>
        <div className="field">
          <label htmlFor="r-pass2">{t('register.password2')}</label>
          <input id="r-pass2" className="input" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
        </div>

        <div className="honeypot" aria-hidden="true">
          <label htmlFor="r-site">{t('register.website')}</label>
          <input id="r-site" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <label className="check-row" style={{ marginBottom: 16 }}>
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span>
            <Rich
              text={t('register.accept')}
              slots={{ link: <Link to="/terms" target="_blank">{t('register.acceptLink')}</Link> }}
            />
          </span>
        </label>

        <button className="btn btn-primary btn-block" type="submit" disabled={busy || open === null}>
          {t(busy ? 'register.submitting' : 'register.submit')}
        </button>
        <p className="login-foot">
          {t('register.haveAccount')} <Link to="/login">{t('nav.login')}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
