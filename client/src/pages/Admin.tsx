// Yönetim paneli: genel bakış, kullanıcılar, plan limitleri ve site ayarları.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FEATURE_KEYS,
  FEATURE_LABELS,
  PLAN_LABELS,
  type AdminStats,
  type AdminUser,
  type FeatureKey,
  type PlanId,
  type PlanLimits,
  type SiteSettings
} from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useAccount } from '../account';
import { useToast } from '../components/Toast';
import Shell from '../components/Shell';
import ConfirmDialog from '../components/ConfirmDialog';
import { PlanBadge } from '../components/PlanBits';

type Tab = 'overview' | 'users' | 'plans' | 'site';

function fmtDate(ms: number | null): string {
  return ms == null ? '—' : new Date(ms).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function errMsg(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function Admin(): JSX.Element {
  const [tab, setTab] = useState<Tab>('users');
  const tabs: Array<[Tab, string]> = [
    ['overview', 'Genel bakış'],
    ['users', 'Kullanıcılar'],
    ['plans', 'Planlar ve limitler'],
    ['site', 'Site ayarları']
  ];
  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>Yönetim</h1>
          <p>Kullanıcıları, planları ve kayıt ayarlarını buradan yönet.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} className="tab" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users />}
      {tab === 'plans' && <PlansEditor />}
      {tab === 'site' && <SiteSettingsForm />}
    </Shell>
  );
}

// ---------------- Genel bakış ----------------
function Overview(): JSX.Element {
  const toast = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  useEffect(() => {
    apiFetch<AdminStats>('/api/admin/stats')
      .then(setStats)
      .catch((err) => toast.show(errMsg(err, 'İstatistikler yüklenemedi'), 'error'));
  }, [toast]);
  if (!stats) return <div className="spinner" />;
  const items: Array<[number, string]> = [
    [stats.users, 'Toplam kullanıcı'],
    [stats.signups7d, 'Son 7 günde kayıt'],
    [stats.activeUsers30d, 'Son 30 günde giriş yapan'],
    [stats.proUsers, 'Pro kullanıcı'],
    [stats.suspendedUsers, 'Askıdaki hesap'],
    [stats.courses, 'Ders'],
    [stats.pads, 'Kod']
  ];
  return (
    <>
      <div className="stat-strip">
        {items.map(([n, label]) => (
          <div className="stat" key={label}>
            <b>{n}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>Yedek</h2>
        <p className="muted">Veritabanının tam bir kopyasını bilgisayarına indir. Düzenli olarak yapman önerilir.</p>
        <a className="btn" href="/api/admin/backup">Yedeği indir</a>
      </section>
    </>
  );
}

// ---------------- Kullanıcılar ----------------
type UserList = { users: AdminUser[]; total: number; page: number; pageSize: number };

function Users(): JSX.Element {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UserList | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (q.trim()) params.set('q', q.trim());
    if (plan) params.set('plan', plan);
    if (status) params.set('status', status);
    try {
      setData(await apiFetch<UserList>(`/api/admin/users?${params.toString()}`));
    } catch (err) {
      toast.show(errMsg(err, 'Kullanıcılar yüklenemedi'), 'error');
    }
  }, [q, plan, status, page, toast]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(t);
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <div className="toolbar-row">
        <input
          className="input grow"
          placeholder="Ad veya e-posta ara"
          aria-label="Kullanıcı ara"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select className="select" aria-label="Plan" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}>
          <option value="">Tüm planlar</option>
          <option value="free">Ücretsiz</option>
          <option value="pro">Pro</option>
          <option value="admin">Yöneticiler</option>
        </select>
        <select className="select" aria-label="Durum" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tüm durumlar</option>
          <option value="active">Etkin</option>
          <option value="suspended">Askıda</option>
        </select>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>Kullanıcı ekle</button>
      </div>

      {!data ? (
        <div className="spinner" />
      ) : data.users.length === 0 ? (
        <div className="empty-state"><p>Bu filtreye uyan kullanıcı yok.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Plan</th>
                <th>Ders / kod</th>
                <th>Son giriş</th>
                <th>Kayıt</th>
                <th><span className="sr-only">İşlem</span></th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className={openId === u.id ? 'selected' : ''}>
                  <td>
                    <b>{u.name}</b>
                    <span className="cell-sub">{u.email}</span>
                  </td>
                  <td>
                    <PlanBadge plan={u.effectivePlan} admin={u.role === 'admin'} suspended={u.status === 'suspended'} />
                    {u.plan === 'pro' && u.planExpiresAt && (
                      <span className="cell-sub">{fmtDate(u.planExpiresAt)} bitiş</span>
                    )}
                  </td>
                  <td>{u.usage.courses} / {u.usage.pads}</td>
                  <td>{fmtDate(u.lastLoginAt)}</td>
                  <td>
                    {fmtDate(u.createdAt)}
                    <span className="cell-sub">{u.signupSource === 'self' ? 'Kendi kaydoldu' : 'Yönetici ekledi'}</span>
                  </td>
                  <td>
                    <button className="btn btn-sm" onClick={() => setOpenId(u.id)}>Yönet</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && pages > 1 && (
        <div className="toolbar-row" style={{ marginTop: 12 }}>
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Önceki</button>
          <span className="muted">Sayfa {page} / {pages} ({data.total} kullanıcı)</span>
          <button className="btn btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Sonraki</button>
        </div>
      )}

      {openId && <UserDrawer id={openId} onClose={() => setOpenId(null)} onChanged={() => void load()} />}
      {adding && <AddUserModal onClose={() => setAdding(false)} onAdded={() => { setAdding(false); void load(); }} />}
    </>
  );
}

type UserDetail = {
  user: AdminUser;
  courses: Array<{ id: string; title: string; padCount: number }>;
  pads: Array<{ id: string; title: string; language: string; updatedAt: number; courseTitle: string | null }>;
};

function toDateInput(ms: number | null): string {
  if (ms == null) return '';
  const d = new Date(ms);
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function UserDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }): JSX.Element {
  const toast = useToast();
  const { user: me } = useAccount();
  const [d, setD] = useState<UserDetail | null>(null);
  const [plan, setPlan] = useState<PlanId>('free');
  const [expiry, setExpiry] = useState('');
  const [note, setNote] = useState('');
  const [override, setOverride] = useState<Partial<PlanLimits>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch<UserDetail>(`/api/admin/users/${id}`);
      setD(r);
      setPlan(r.user.plan);
      setExpiry(toDateInput(r.user.planExpiresAt));
      setNote(r.user.adminNote);
      setOverride(r.user.limitsOverride ?? {});
    } catch (err) {
      toast.show(errMsg(err, 'Kullanıcı yüklenemedi'), 'error');
    }
  }, [id, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function patch(body: Record<string, unknown>, ok: string): Promise<void> {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'PATCH', body });
      toast.show(ok, 'success');
      await load();
      onChanged();
    } catch (err) {
      toast.show(errMsg(err, 'Kaydedilemedi'), 'error');
    } finally {
      setBusy(false);
    }
  }

  function savePlan(): void {
    const expiresAt = expiry ? new Date(`${expiry}T23:59:59`).getTime() : null;
    void patch({ plan, planExpiresAt: plan === 'pro' ? expiresAt : null, adminNote: note }, 'Plan kaydedildi');
  }

  function saveOverride(): void {
    const clean: Partial<PlanLimits> = {};
    for (const [k, v] of Object.entries(override)) if (v !== undefined) (clean as Record<string, unknown>)[k] = v;
    void patch({ limitsOverride: Object.keys(clean).length ? clean : null }, 'Özel limitler kaydedildi');
  }

  function resetPassword(): void {
    const pw = window.prompt('Yeni parola (en az 8 karakter). Kullanıcıya kendin iletmelisin:');
    if (!pw) return;
    if (pw.length < 8) return toast.show('Parola en az 8 karakter olmalı', 'error');
    void patch({ password: pw }, 'Parola sıfırlandı; kullanıcının açık oturumları kapatıldı');
  }

  async function remove(): Promise<void> {
    setConfirmDelete(false);
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      toast.show('Kullanıcı ve tüm içeriği silindi', 'success');
      onChanged();
      onClose();
    } catch (err) {
      toast.show(errMsg(err, 'Silinemedi'), 'error');
    }
  }

  const u = d?.user;
  const isSelf = u?.id === me?.id;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Kullanıcıyı yönet" onClick={(e) => e.stopPropagation()}>
        {!u ? (
          <div className="spinner" />
        ) : (
          <>
            <div className="drawer-head">
              <div>
                <h2 style={{ margin: 0 }}>{u.name}</h2>
                <span className="muted">{u.email}</span>
                <div style={{ marginTop: 8 }}>
                  <PlanBadge plan={u.effectivePlan} admin={u.role === 'admin'} suspended={u.status === 'suspended'} />
                </div>
              </div>
              <button className="icon-btn" onClick={onClose} aria-label="Kapat">✕</button>
            </div>

            {u.role !== 'admin' && (
              <section className="panel">
                <h2>Plan</h2>
                <div className="panel-row">
                  <div className="field">
                    <label htmlFor="d-plan">Plan</label>
                    <select id="d-plan" className="select" value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
                      <option value="free">Ücretsiz</option>
                      <option value="pro">Pro</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="d-exp">Pro bitiş tarihi</label>
                    <input id="d-exp" className="input" type="date" value={expiry} disabled={plan !== 'pro'} onChange={(e) => setExpiry(e.target.value)} />
                    <span className="hint">Boş bırakırsan süresiz olur. Tarih geçince hesap kendiliğinden Ücretsiz'e döner.</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="d-note">Yönetici notu</label>
                  <textarea id="d-note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Ör. ödeme tarihi, okul adı" />
                  <span className="hint">Yalnızca yöneticiler görür.</span>
                </div>
                <button className="btn btn-primary" disabled={busy} onClick={savePlan}>Planı kaydet</button>
              </section>
            )}

            {u.role !== 'admin' && (
              <section className="panel">
                <h2>Bu kullanıcıya özel limitler</h2>
                <p className="muted" style={{ marginTop: 0 }}>
                  "Plana göre" seçili olanlar kullanıcının planından gelir. Burada değiştirdiğin her ayar yalnızca bu kişiyi etkiler.
                </p>
                <div className="limit-grid">
                  <span className="head">Limit</span>
                  <span className="head">Değer</span>
                  <span className="head" />
                  {(['maxCourses', 'maxPads'] as const).map((k) => (
                    <NumberOverride
                      key={k}
                      label={k === 'maxCourses' ? 'En fazla ders' : 'En fazla kod'}
                      value={override[k]}
                      onChange={(v) => setOverride((o) => ({ ...o, [k]: v }))}
                    />
                  ))}
                  {FEATURE_KEYS.map((k) => (
                    <FeatureOverride key={k} k={k} value={override[k]} onChange={(v) => setOverride((o) => ({ ...o, [k]: v }))} />
                  ))}
                </div>
                <div className="toolbar-row" style={{ marginTop: 14, marginBottom: 0 }}>
                  <button className="btn btn-primary" disabled={busy} onClick={saveOverride}>Özel limitleri kaydet</button>
                  <button className="btn" disabled={busy} onClick={() => setOverride({})}>Hepsini plana döndür</button>
                </div>
              </section>
            )}

            <section className="panel">
              <h2>Hesap</h2>
              <div className="toolbar-row" style={{ marginBottom: 0 }}>
                {u.status === 'active' ? (
                  <button className="btn" disabled={busy || isSelf} onClick={() => void patch({ status: 'suspended' }, 'Hesap askıya alındı; paylaşımları kapandı')}>
                    Askıya al
                  </button>
                ) : (
                  <button className="btn" disabled={busy} onClick={() => void patch({ status: 'active' }, 'Hesap yeniden etkin')}>
                    Askıdan çıkar
                  </button>
                )}
                <button className="btn" disabled={busy} onClick={resetPassword}>Parolayı sıfırla</button>
                <button className="btn" disabled={busy || isSelf} onClick={() => void patch({ role: u.role === 'admin' ? 'teacher' : 'admin' }, 'Rol değiştirildi')}>
                  {u.role === 'admin' ? 'Yöneticilikten çıkar' : 'Yönetici yap'}
                </button>
                <button className="btn btn-danger" disabled={busy || isSelf} onClick={() => setConfirmDelete(true)}>Hesabı sil</button>
              </div>
              <p className="muted" style={{ marginBottom: 0 }}>
                Askıya alınan kullanıcı giriş yapamaz; öğrencilerle paylaştığı linkler de çalışmaz.
              </p>
            </section>

            <section className="panel">
              <h2>İçerik ({d.courses.length} ders, {u.usage.pads} kod)</h2>
              {d.pads.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>Henüz kod yok.</p>
              ) : (
                <ul className="feature-list">
                  {d.pads.slice(0, 50).map((p) => (
                    <li key={p.id}>
                      <span className="lang-badge">{p.language}</span>
                      <Link to={`/pad/${p.id}`}>{p.title}</Link>
                      <span className="muted">{p.courseTitle ?? 'Derssiz'}, {fmtDate(p.updatedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <ConfirmDialog
              open={confirmDelete}
              title="Hesabı sil"
              message={`${u.name} hesabı, tüm dersleri ve kodlarıyla birlikte kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
              onConfirm={() => void remove()}
              onCancel={() => setConfirmDelete(false)}
              danger
              confirmLabel="Hesabı sil"
            />
          </>
        )}
      </aside>
    </div>
  );
}

function NumberOverride({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (v: number | null | undefined) => void }): JSX.Element {
  const mode = value === undefined ? 'plan' : value === null ? 'unlimited' : 'custom';
  return (
    <>
      <span>{label}</span>
      <select className="select" aria-label={`${label} ayarı`} value={mode} onChange={(e) => {
        const m = e.target.value;
        onChange(m === 'plan' ? undefined : m === 'unlimited' ? null : 10);
      }}>
        <option value="plan">Plana göre</option>
        <option value="unlimited">Sınırsız</option>
        <option value="custom">Özel sayı</option>
      </select>
      {mode === 'custom' ? (
        <input className="input" type="number" min={0} aria-label={label} value={value ?? 0} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))} />
      ) : (
        <span />
      )}
    </>
  );
}

function FeatureOverride({ k, value, onChange }: { k: FeatureKey; value: boolean | undefined; onChange: (v: boolean | undefined) => void }): JSX.Element {
  return (
    <>
      <span>{FEATURE_LABELS[k]}</span>
      <select className="select" aria-label={`${FEATURE_LABELS[k]} ayarı`} value={value === undefined ? 'plan' : value ? 'on' : 'off'} onChange={(e) => {
        const v = e.target.value;
        onChange(v === 'plan' ? undefined : v === 'on');
      }}>
        <option value="plan">Plana göre</option>
        <option value="on">Açık</option>
        <option value="off">Kapalı</option>
      </select>
      <span />
    </>
  );
}

function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }): JSX.Element {
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'teacher', plan: 'pro' });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (f.password.length < 8) return toast.show('Parola en az 8 karakter olmalı', 'error');
    setBusy(true);
    try {
      await apiFetch('/api/admin/users', { method: 'POST', body: f });
      toast.show('Kullanıcı eklendi', 'success');
      onAdded();
    } catch (err) {
      toast.show(errMsg(err, 'Kullanıcı eklenemedi'), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="modal-card" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Kullanıcı ekle</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">✕</button>
        </div>
        <div className="field">
          <label htmlFor="a-name">Ad soyad</label>
          <input id="a-name" className="input" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} required />
        </div>
        <div className="field">
          <label htmlFor="a-email">E-posta</label>
          <input id="a-email" className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="a-pass">Geçici parola</label>
          <input id="a-pass" className="input" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          <span className="hint">En az 8 karakter. Kullanıcı girdikten sonra Hesabım sayfasından değiştirebilir.</span>
        </div>
        <div className="panel-row">
          <div className="field">
            <label htmlFor="a-role">Rol</label>
            <select id="a-role" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="teacher">Öğretmen</option>
              <option value="admin">Yönetici</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="a-plan">Plan</label>
            <select id="a-plan" className="select" value={f.plan} disabled={f.role === 'admin'} onChange={(e) => setF({ ...f, plan: e.target.value })}>
              <option value="pro">Pro</option>
              <option value="free">Ücretsiz</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Vazgeç</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>Kullanıcı ekle</button>
        </div>
      </form>
    </div>
  );
}

// ---------------- Plan limitleri ----------------
function PlansEditor(): JSX.Element {
  const toast = useToast();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<SiteSettings>('/api/admin/settings')
      .then(setS)
      .catch((err) => toast.show(errMsg(err, 'Ayarlar yüklenemedi'), 'error'));
  }, [toast]);

  if (!s) return <div className="spinner" />;

  function setLimit(plan: PlanId, key: keyof PlanLimits, value: number | null | boolean): void {
    setS((prev) => (prev ? { ...prev, plans: { ...prev.plans, [plan]: { ...prev.plans[plan], [key]: value } } } : prev));
  }

  async function save(): Promise<void> {
    if (!s) return;
    setBusy(true);
    try {
      setS(await apiFetch<SiteSettings>('/api/admin/settings', { method: 'PATCH', body: { plans: s.plans } }));
      toast.show('Plan limitleri kaydedildi', 'success');
    } catch (err) {
      toast.show(errMsg(err, 'Kaydedilemedi'), 'error');
    } finally {
      setBusy(false);
    }
  }

  const plans: PlanId[] = ['free', 'pro'];
  return (
    <section className="panel">
      <h2>Planlar ve limitler</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Değişiklikler kaydedildiği anda o plandaki herkese uygulanır. Bir özelliği kapatmak, kullanıcıların daha önce açtığı
        ayarları geri almaz; yalnızca yeniden açmalarını engeller.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Limit</th>
              {plans.map((p) => <th key={p}>{PLAN_LABELS[p]}</th>)}
            </tr>
          </thead>
          <tbody>
            {(['maxCourses', 'maxPads'] as const).map((k) => (
              <tr key={k}>
                <td>{k === 'maxCourses' ? 'En fazla ders' : 'En fazla kod'}</td>
                {plans.map((p) => {
                  const v = s.plans[p][k];
                  return (
                    <td key={p}>
                      <label className="check-row" style={{ marginBottom: 6 }}>
                        <input type="checkbox" checked={v === null} onChange={(e) => setLimit(p, k, e.target.checked ? null : 10)} />
                        Sınırsız
                      </label>
                      {v !== null && (
                        <input className="input" type="number" min={0} style={{ width: 110 }} aria-label={`${PLAN_LABELS[p]} ${k}`} value={v} onChange={(e) => setLimit(p, k, Math.max(0, Number(e.target.value) || 0))} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {FEATURE_KEYS.map((k) => (
              <tr key={k}>
                <td>{FEATURE_LABELS[k]}</td>
                {plans.map((p) => (
                  <td key={p}>
                    <label className="check-row">
                      <input type="checkbox" checked={s.plans[p][k]} onChange={(e) => setLimit(p, k, e.target.checked)} />
                      {s.plans[p][k] ? 'Açık' : 'Kapalı'}
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>Limitleri kaydet</button>
      </div>
    </section>
  );
}

// ---------------- Site ayarları ----------------
function SiteSettingsForm(): JSX.Element {
  const toast = useToast();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<SiteSettings>('/api/admin/settings')
      .then(setS)
      .catch((err) => toast.show(errMsg(err, 'Ayarlar yüklenemedi'), 'error'));
  }, [toast]);

  if (!s) return <div className="spinner" />;

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!s) return;
    setBusy(true);
    try {
      setS(
        await apiFetch<SiteSettings>('/api/admin/settings', {
          method: 'PATCH',
          body: { registrationOpen: s.registrationOpen, upgradeInfo: s.upgradeInfo }
        })
      );
      toast.show('Site ayarları kaydedildi', 'success');
    } catch (err) {
      toast.show(errMsg(err, 'Kaydedilemedi'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={save}>
      <h2>Site ayarları</h2>
      <label className="check-row" style={{ marginBottom: 6 }}>
        <input type="checkbox" checked={s.registrationOpen} onChange={(e) => setS({ ...s, registrationOpen: e.target.checked })} />
        <span>
          <b>Herkes hesap oluşturabilsin</b>
          <span className="cell-sub">Kapatırsan yalnızca senin eklediğin kullanıcılar giriş yapabilir. Mevcut hesaplar etkilenmez.</span>
        </span>
      </label>
      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="s-upgrade">Pro'ya geçiş bilgisi</label>
        <textarea
          id="s-upgrade"
          className="textarea"
          value={s.upgradeInfo}
          maxLength={2000}
          onChange={(e) => setS({ ...s, upgradeInfo: e.target.value })}
        />
        <span className="hint">Planlar sayfasında görünür. Ücret, ödeme yöntemi ve iletişim adresini buraya yaz.</span>
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>Ayarları kaydet</button>
    </form>
  );
}
