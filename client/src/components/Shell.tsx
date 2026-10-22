// Hesabım, yönetim, planlar ve koşullar sayfalarının ortak iskeleti.
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from '../account';
import { apiFetch } from '../api';
import { useToast } from './Toast';
import { useI18n } from '../i18n';
import { LocalePicker } from '../i18n/LocalePicker';

export default function Shell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }): JSX.Element {
  const { user, setMe } = useAccount();
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();

  async function logout(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* oturum zaten kapanmış olabilir */
    }
    setMe(null);
    toast.show(t('nav.loggedOut'), 'success');
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell">
      <header className="shell-top">
        <Link className="brand-mark" to={user ? '/dashboard' : '/login'}>
          SafeCodeShare
        </Link>
        <nav className="shell-nav" aria-label={t('nav.mainMenu')}>
          {user ? (
            <>
              <Link className="btn btn-sm btn-ghost" to="/dashboard">{t('nav.dashboard')}</Link>
              <Link className="btn btn-sm btn-ghost" to="/plans">{t('nav.plans')}</Link>
              <Link className="btn btn-sm btn-ghost" to="/profile">{t('nav.account')}</Link>
              {user.role === 'admin' && <Link className="btn btn-sm btn-ghost" to="/admin">{t('nav.admin')}</Link>}
              <LocalePicker compact persist id="shell-locale" />
              <button className="btn btn-sm" onClick={() => void logout()}>{t('nav.logout')}</button>
            </>
          ) : (
            <>
              <Link className="btn btn-sm btn-ghost" to="/plans">{t('nav.plans')}</Link>
              <LocalePicker compact id="shell-locale" />
              <Link className="btn btn-sm" to="/login">{t('nav.login')}</Link>
              <Link className="btn btn-sm btn-primary" to="/register">{t('nav.register')}</Link>
            </>
          )}
        </nav>
      </header>
      <main className={`shell-main ${narrow ? 'narrow' : ''}`}>{children}</main>
    </div>
  );
}
