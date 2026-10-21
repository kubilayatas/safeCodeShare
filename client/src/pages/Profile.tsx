import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FEATURE_KEYS, FEATURE_LABELS, type MeResponse } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useAccount } from '../account';
import { useToast } from '../components/Toast';
import Shell from '../components/Shell';
import { PlanBadge, UsageMeter, planExpiryText } from '../components/PlanBits';
import { loadSettings, saveSettings, type AppSettings, type ThemeId, type UiTheme } from '../editor/settings';

export default function Profile(): JSX.Element {
  const { user, entitlements, setMe } = useAccount();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [currentPw, setCurrentPw] = useState('');
  const [nextPw, setNextPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  if (!user || !entitlements) return <Shell><div className="spinner" /></Shell>;

  function updateSettings(next: AppSettings): void {
    setSettings(next);
    saveSettings(next);
  }

  async function saveName(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return toast.show('Ad boş olamaz', 'error');
    setBusy(true);
    try {
      setMe(await apiFetch<MeResponse>('/api/auth/profile', { method: 'PATCH', body: { name: trimmed } }));
      toast.show('Ad kaydedildi', 'success');
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Ad kaydedilemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (nextPw.length < 8) return toast.show('Yeni parola en az 8 karakter olmalı', 'error');
    if (nextPw !== confirmPw) return toast.show('Yeni parolalar aynı değil', 'error');
    setBusy(true);
    try {
      await apiFetch('/api/auth/change-password', { method: 'POST', body: { current: currentPw, next: nextPw } });
      toast.show('Parola değiştirildi', 'success');
      setCurrentPw('');
      setNextPw('');
      setConfirmPw('');
    } catch (err) {
      toast.show(err instanceof ApiError ? err.message : 'Parola değiştirilemedi', 'error');
    } finally {
      setBusy(false);
    }
  }

  const ent = entitlements;
  const expiry = planExpiryText(ent);

  return (
    <Shell narrow>
      <div className="page-head">
        <div>
          <h1>Hesabım</h1>
          <p>{user.email}</p>
        </div>
        <PlanBadge plan={ent.plan} admin={ent.unlimited} />
      </div>

      <section className="panel">
        <h2>Plan ve kullanım</h2>
        {ent.unlimited ? (
          <p className="muted" style={{ margin: 0 }}>Yönetici hesabında hiçbir sınır yok.</p>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>
              {ent.plan === 'pro' ? 'Pro plandasın' : 'Ücretsiz plandasın'}
              {expiry ? ` (${expiry})` : ''}.
            </p>
            <div className="panel-row" style={{ marginBottom: 16 }}>
              <UsageMeter label="Dersler" used={ent.usage.courses} max={ent.limits.maxCourses} />
              <UsageMeter label="Kodlar" used={ent.usage.pads} max={ent.limits.maxPads} />
            </div>
            <ul className="feature-list">
              {FEATURE_KEYS.map((k) => (
                <li key={k}>
                  <span className={ent.limits[k] ? 'yes' : 'no'} aria-label={ent.limits[k] ? 'açık' : 'kapalı'}>
                    {ent.limits[k] ? '✓' : '–'}
                  </span>
                  <span className={ent.limits[k] ? '' : 'muted'}>{FEATURE_LABELS[k]}</span>
                </li>
              ))}
            </ul>
            {ent.plan !== 'pro' && (
              <p style={{ marginBottom: 0 }}>
                <Link to="/plans">Pro planı incele</Link>
              </p>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <h2>Görünüm</h2>
        <div className="panel-row">
          <div className="field">
            <label htmlFor="ui-theme">Arayüz</label>
            <select
              id="ui-theme"
              className="select"
              value={settings.uiTheme}
              onChange={(e) => updateSettings({ ...settings, uiTheme: e.target.value as UiTheme })}
            >
              <option value="auto">Sistem ayarına uy</option>
              <option value="light">Açık</option>
              <option value="dark">Koyu</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="ed-theme">Kod teması</label>
            <select
              id="ed-theme"
              className="select"
              value={settings.theme}
              onChange={(e) => updateSettings({ ...settings, theme: e.target.value as ThemeId })}
            >
              <option value="monokai">Monokai (Sublime, koyu)</option>
              <option value="onedark">One Dark (koyu)</option>
              <option value="notepad">Notepad++ (açık)</option>
            </select>
          </div>
        </div>
      </section>

      <form className="panel" onSubmit={saveName}>
        <h2>Ad</h2>
        <div className="field">
          <label htmlFor="p-name">Öğrencilerin gördüğü ad</label>
          <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>Adı kaydet</button>
      </form>

      <form className="panel" onSubmit={savePassword}>
        <h2>Parola</h2>
        <div className="field">
          <label htmlFor="p-cur">Mevcut parola</label>
          <input id="p-cur" className="input" type="password" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
        </div>
        <div className="panel-row">
          <div className="field">
            <label htmlFor="p-new">Yeni parola</label>
            <input id="p-new" className="input" type="password" autoComplete="new-password" value={nextPw} onChange={(e) => setNextPw(e.target.value)} />
            <span className="hint">En az 8 karakter.</span>
          </div>
          <div className="field">
            <label htmlFor="p-new2">Yeni parola (tekrar)</label>
            <input id="p-new2" className="input" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>Parolayı değiştir</button>
        <p className="muted" style={{ marginBottom: 0 }}>Parola değişince diğer cihazlardaki oturumların kapanır.</p>
      </form>
    </Shell>
  );
}
