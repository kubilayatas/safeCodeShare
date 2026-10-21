// Profil, yönetim, planlar ve koşullar sayfalarının ortak iskeleti.
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from '../account';
import { apiFetch } from '../api';
import { useToast } from './Toast';

export default function Shell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }): JSX.Element {
  const { user, setMe } = useAccount();
  const navigate = useNavigate();
  const toast = useToast();

  async function logout(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* oturum zaten kapanmış olabilir */
    }
    setMe(null);
    toast.show('Çıkış yapıldı', 'success');
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell">
      <header className="shell-top">
        <Link className="brand-mark" to={user ? '/dashboard' : '/login'}>
          SafeCodeShare
        </Link>
        <nav className="shell-nav" aria-label="Ana menü">
          {user ? (
            <>
              <Link className="btn btn-sm btn-ghost" to="/dashboard">Panel</Link>
              <Link className="btn btn-sm btn-ghost" to="/plans">Planlar</Link>
              <Link className="btn btn-sm btn-ghost" to="/profile">Hesabım</Link>
              {user.role === 'admin' && (
                <Link className="btn btn-sm btn-ghost" to="/admin">Yönetim</Link>
              )}
              <button className="btn btn-sm" onClick={() => void logout()}>Çıkış yap</button>
            </>
          ) : (
            <>
              <Link className="btn btn-sm btn-ghost" to="/plans">Planlar</Link>
              <Link className="btn btn-sm" to="/login">Giriş yap</Link>
              <Link className="btn btn-sm btn-primary" to="/register">Hesap oluştur</Link>
            </>
          )}
        </nav>
      </header>
      <main className={`shell-main ${narrow ? 'narrow' : ''}`}>{children}</main>
    </div>
  );
}
