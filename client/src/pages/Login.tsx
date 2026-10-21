import { useState } from 'react';
import type { PublicUser } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useToast } from '../components/Toast';

type Props = {
  onLogin: (user: PublicUser) => void;
};

export default function Login({ onLogin }: Props): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch<{ user: PublicUser }>('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      toast.show('Giriş başarılı', 'success');
      onLogin(res.user);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Beklenmeyen bir hata oluştu';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} noValidate>
        <h1 className="login-title">SafeCodeShare</h1>
        <p className="login-sub">Öğretmen girişi</p>

        {error && <div className="alert">{error}</div>}

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

        <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </form>
    </div>
  );
}