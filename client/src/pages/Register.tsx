import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MeResponse } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useAccount } from '../account';
import { useToast } from '../components/Toast';
import AuthLayout from '../components/AuthLayout';

export default function Register(): JSX.Element {
  const { setMe } = useAccount();
  const toast = useToast();
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
    if (password.length < 8) return setError('Parola en az 8 karakter olmalı.');
    if (password !== password2) return setError('Parolalar aynı değil.');
    if (!accept) return setError('Devam etmek için kullanım koşullarını kabul etmelisin.');
    setBusy(true);
    try {
      const me = await apiFetch<MeResponse>('/api/auth/register', {
        method: 'POST',
        body: { name, email, password, acceptTerms: true, website }
      });
      toast.show('Hesabın oluşturuldu', 'success');
      setMe(me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  if (open === false) {
    return (
      <AuthLayout>
        <div className="login-card">
          <h1 className="login-title">Kayıtlar kapalı</h1>
          <p className="login-sub">Yeni hesap oluşturma şu anda kapalı. Hesabın varsa giriş yapabilirsin.</p>
          <Link className="btn btn-primary btn-block" to="/login">Giriş yap</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <form className="login-card" onSubmit={submit} noValidate>
        <h1 className="login-title">Hesap oluştur</h1>
        <p className="login-sub">Ücretsiz planla başlarsın; istediğin zaman Pro'ya geçebilirsin.</p>

        {error && <div className="alert" role="alert">{error}</div>}

        <div className="field">
          <label htmlFor="r-name">Ad soyad</label>
          <input id="r-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          <span className="hint">Öğrencilerin canlı derste bu adı görür.</span>
        </div>
        <div className="field">
          <label htmlFor="r-email">E-posta</label>
          <input id="r-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="r-pass">Parola</label>
          <input id="r-pass" className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <span className="hint">En az 8 karakter.</span>
        </div>
        <div className="field">
          <label htmlFor="r-pass2">Parola (tekrar)</label>
          <input id="r-pass2" className="input" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} required />
        </div>

        <div className="honeypot" aria-hidden="true">
          <label htmlFor="r-site">Web sitesi</label>
          <input id="r-site" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <label className="check-row" style={{ marginBottom: 16 }}>
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span>
            <Link to="/terms" target="_blank">Kullanım koşullarını ve gizlilik metnini</Link> okudum, kabul ediyorum.
          </span>
        </label>

        <button className="btn btn-primary btn-block" type="submit" disabled={busy || open === null}>
          {busy ? 'Hesap oluşturuluyor…' : 'Hesap oluştur'}
        </button>
        <p className="login-foot">
          Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
