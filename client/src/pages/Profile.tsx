import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicUser } from '@kodsinif/shared';
import { apiFetch, ApiError } from '../api';
import { useToast } from '../components/Toast';

export default function Profile(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [name, setName] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [nextPw, setNextPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ user: PublicUser }>('/api/auth/me')
      .then((r) => {
        setUser(r.user);
        setName(r.user.name);
      })
      .catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  async function saveName(): Promise<void> {
    if (busy) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      toast.show('Ad gerekli', 'error');
      return;
    }
    setBusy(true);
    try {
      const r = await apiFetch<{ user: PublicUser }>('/api/auth/profile', {
        method: 'PATCH',
        body: { name: trimmed }
      });
      setUser(r.user);
      toast.show('Ad güncellendi', 'success');
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Güncellenemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(): Promise<void> {
    if (busy) return;
    if (nextPw.length < 8) {
      toast.show('Yeni parola en az 8 karakter olmalı', 'error');
      return;
    }
    if (nextPw !== confirmPw) {
      toast.show('Parolalar eşleşmiyor', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: { current: currentPw, next: nextPw }
      });
      toast.show('Parola güncellendi', 'success');
      setCurrentPw('');
      setNextPw('');
      setConfirmPw('');
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Parola değiştirilemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>← Panel</button>
        <h1>👤 Profil</h1>
      </div>

      <section className="profile-section">
        <h2>Kişisel bilgiler</h2>
        <div className="field">
          <label>Ad</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <div className="field">
          <label>E-posta</label>
          <input className="input" value={user.email} readOnly />
        </div>
        <div className="field">
          <label>Rol</label>
          <input className="input" value={user.role === 'admin' ? 'Yönetici' : 'Öğretmen'} readOnly />
        </div>
        <button className="btn btn-primary" onClick={() => void saveName()} disabled={busy}>
          Adı kaydet
        </button>
      </section>

      <section className="profile-section">
        <h2>Parola değiştir</h2>
        <div className="field">
          <label>Mevcut parola</label>
          <input className="input" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
        </div>
        <div className="field">
          <label>Yeni parola (en az 8 karakter)</label>
          <input className="input" type="password" value={nextPw} onChange={(e) => setNextPw(e.target.value)} />
        </div>
        <div className="field">
          <label>Yeni parola (tekrar)</label>
          <input className="input" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => void savePassword()} disabled={busy}>
          Parolayı değiştir
        </button>
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Parola değişince diğer tüm oturumlar kapatılır.
        </p>
      </section>
    </div>
  );
}