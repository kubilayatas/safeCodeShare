import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MeResponse } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useAccount } from '../account';
import { useToast } from '../components/Toast';
import AuthLayout from '../components/AuthLayout';

export default function Login(): JSX.Element {
  const { setMe } = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const toast = useToast();

  useEffect(() => {
    apiFetch<{ registrationOpen: boolean }>('/api/public/site')
      .then((s) => setRegistrationOpen(s.registrationOpen))
      .catch(() => {
        /* bilgi alınamazsa bağlantıyı göstermeye devam et */
      });
  }, []);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const me = await apiFetch<MeResponse>('/api/auth/login', { method: 'POST', body: { email, password } });
      toast.show(`Hoş geldin, ${me.user.name}`, 'success');
      setMe(me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <form className="login-card" onSubmit={submit} noValidate>
        <h1 className="login-title">Giriş yap</h1>
        <p className="login-sub">Öğretmen hesabınla devam et.</p>

        {error && <div className="alert" role="alert">{error}</div>}

        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Parola</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>

        <p className="login-foot">
          {registrationOpen ? (
            <>Hesabın yok mu? <Link to="/register">Ücretsiz hesap oluştur</Link></>
          ) : (
            <>Yeni hesap oluşturma şu anda kapalı.</>
          )}
          <br />
          Parolanı unuttuysan site yöneticisinden sıfırlamasını iste.
        </p>
      </form>
    </AuthLayout>
  );
}
