// Yönetim paneli: genel bakış, kullanıcılar, plan limitleri ve site ayarları.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FEATURE_KEYS,
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
import { BillingStatusText } from '../components/Billing';
import { useI18n, type MessageKey } from '../i18n';
import { useLangLabel } from '../i18n/LocalePicker';

type Tab = 'overview' | 'users' | 'plans' | 'site';

function errMsg(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

const featureKey = (k: FeatureKey): MessageKey => `feature.${k}` as MessageKey;

export default function Admin(): JSX.Element {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('users');
  const tabs: Array<[Tab, MessageKey]> = [
    ['overview', 'admin.tabOverview'],
    ['users', 'admin.tabUsers'],
    ['plans', 'admin.tabPlans'],
    ['site', 'admin.tabSite']
  ];
  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1>{t('admin.title')}</h1>
          <p>{t('admin.subtitle')}</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} className="tab" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {t(label)}
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
  const { t, formatNumber } = useI18n();
  const [stats, setStats] = useState<AdminStats | null>(null);
  useEffect(() => {
    apiFetch<AdminStats>('/api/admin/stats')
      .then(setStats)
      .catch((err) => toast.show(errMsg(err, t('admin.statsFailed')), 'error'));
  }, [toast, t]);
  if (!stats) return <div className="spinner" />;
  const items: Array<[number, MessageKey]> = [
    [stats.users, 'admin.statUsers'],
    [stats.signups7d, 'admin.statSignups7d'],
    [stats.activeUsers30d, 'admin.statActive30d'],
    [stats.proUsers, 'admin.statPro'],
    [stats.suspendedUsers, 'admin.statSuspended'],
    [stats.courses, 'admin.statCourses'],
    [stats.pads, 'admin.statPads']
  ];
  return (
    <>
      <div className="stat-strip">
        {items.map(([n, label]) => (
          <div className="stat" key={label}>
            <b>{formatNumber(n)}</b>
            <span>{t(label)}</span>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>{t('admin.backupTitle')}</h2>
        <p className="muted">{t('admin.backupBody')}</p>
        <a className="btn" href="/api/admin/backup">{t('admin.backupDownload')}</a>
      </section>
    </>
  );
}

// ---------------- Kullanıcılar ----------------
type UserList = { users: AdminUser[]; total: number; page: number; pageSize: number };

function Users(): JSX.Element {
  const toast = useToast();
  const { t, formatDate } = useI18n();
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
      toast.show(errMsg(err, t('admin.usersFailed')), 'error');
    }
  }, [q, plan, status, page, toast, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const fmt = (ms: number | null): string => (ms == null ? '—' : formatDate(ms));

  return (
    <>
      <div className="toolbar-row">
        <input
          className="input grow"
          placeholder={t('admin.searchUsers')}
          aria-label={t('admin.searchLabel')}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select className="select" aria-label={t('admin.planFilter')} value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}>
          <option value="">{t('admin.allPlans')}</option>
          <option value="free">{t('plan.free')}</option>
          <option value="pro">{t('plan.pro')}</option>
          <option value="admin">{t('admin.admins')}</option>
        </select>
        <select className="select" aria-label={t('admin.statusFilter')} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">{t('admin.allStatuses')}</option>
          <option value="active">{t('admin.active')}</option>
          <option value="suspended">{t('admin.suspended')}</option>
        </select>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>{t('admin.addUser')}</button>
      </div>

      {!data ? (
        <div className="spinner" />
      ) : data.users.length === 0 ? (
        <div className="empty-state"><p>{t('admin.noUsers')}</p></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('admin.colUser')}</th>
                <th>{t('admin.colPlan')}</th>
                <th>{t('admin.colUsage')}</th>
                <th>{t('admin.colLastLogin')}</th>
                <th>{t('admin.colSignup')}</th>
                <th><span className="sr-only">{t('admin.colActions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className={openId === u.id ? 'selected' : ''}>
                  <td>
                    <b>{u.name}</b>
                    <span className="cell-sub" dir="ltr">{u.email}</span>
                  </td>
                  <td>
                    <PlanBadge plan={u.effectivePlan} admin={u.role === 'admin'} suspended={u.status === 'suspended'} />
                    {u.plan === 'pro' && u.planExpiresAt && (
                      <span className="cell-sub">{t('admin.planEnds', { date: fmt(u.planExpiresAt) })}</span>
                    )}
                  </td>
                  <td>{u.usage.courses} / {u.usage.pads}</td>
                  <td>{fmt(u.lastLoginAt)}</td>
                  <td>
                    {fmt(u.createdAt)}
                    <span className="cell-sub">{t(u.signupSource === 'self' ? 'admin.selfSignup' : 'admin.addedByAdmin')}</span>
                  </td>
                  <td>
                    <button className="btn btn-sm" onClick={() => setOpenId(u.id)}>{t('admin.manage')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && pages > 1 && (
        <div className="toolbar-row" style={{ marginTop: 12 }}>
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('admin.prev')}</button>
          <span className="muted">{t('admin.pageInfo', { page, pages })}</span>
          <button className="btn btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{t('admin.next')}</button>
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
  const { t, tn, formatDate } = useI18n();
  const langLabel = useLangLabel();
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
      toast.show(errMsg(err, t('admin.loadUserFailed')), 'error');
    }
  }, [id, toast, t]);

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
      toast.show(errMsg(err, t('admin.saveFailed')), 'error');
    } finally {
      setBusy(false);
    }
  }

  function savePlan(): void {
    const expiresAt = expiry ? new Date(`${expiry}T23:59:59`).getTime() : null;
    void patch({ plan, planExpiresAt: plan === 'pro' ? expiresAt : null, adminNote: note }, t('admin.planSaved'));
  }

  function saveOverride(): void {
    const clean: Partial<PlanLimits> = {};
    for (const [k, v] of Object.entries(override)) if (v !== undefined) (clean as Record<string, unknown>)[k] = v;
    void patch({ limitsOverride: Object.keys(clean).length ? clean : null }, t('admin.overrideSaved'));
  }

  function resetPassword(): void {
    const pw = window.prompt(t('admin.resetPrompt'));
    if (!pw) return;
    if (pw.length < 8) return toast.show(t('admin.passwordShort'), 'error');
    void patch({ password: pw }, t('admin.passwordReset'));
  }

  async function remove(): Promise<void> {
    setConfirmDelete(false);
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      toast.show(t('admin.deleted'), 'success');
      onChanged();
      onClose();
    } catch (err) {
      toast.show(errMsg(err, t('admin.deleteFailed')), 'error');
    }
  }

  const u = d?.user;
  const isSelf = u?.id === me?.id;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={t('admin.drawerLabel')} onClick={(e) => e.stopPropagation()}>
        {!u || !d ? (
          <div className="spinner" />
        ) : (
          <>
            <div className="drawer-head">
              <div>
                <h2 style={{ margin: 0 }}>{u.name}</h2>
                <span className="muted" dir="ltr">{u.email}</span>
                <div style={{ marginTop: 8 }}>
                  <PlanBadge plan={u.effectivePlan} admin={u.role === 'admin'} suspended={u.status === 'suspended'} />
                </div>
              </div>
              <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>✕</button>
            </div>

            {u.role !== 'admin' && (
              <section className="panel">
                <h2>{t('admin.planSection')}</h2>
                <div className="billing-box" style={{ marginTop: 0, marginBottom: 16 }}>
                  <div className="billing-head">
                    <strong>{t('admin.subscription')}</strong>
                    {u.billing && <span className="plan-badge">{t(`billing.status.${u.billing.status}` as const)}</span>}
                    {u.billing?.interval && (
                      <span className="muted">{t(u.billing.interval === 'month' ? 'billing.monthlyPlan' : 'billing.yearlyPlan')}</span>
                    )}
                    {u.billing?.testMode && <span className="plan-badge suspended">{t('billing.testMode')}</span>}
                  </div>
                  {u.billing ? (
                    <>
                      <p style={{ margin: '6px 0 0' }}>
                        <BillingStatusText billing={u.billing} />
                      </p>
                      <p className="muted" style={{ margin: '4px 0 0' }}>
                        {t('admin.subscriptionId', { id: u.billing.subscriptionId })} ·{' '}
                        <a href="https://app.lemonsqueezy.com/subscriptions" target="_blank" rel="noreferrer">
                          {t('admin.openLemon')} ↗
                        </a>
                      </p>
                    </>
                  ) : (
                    <p className="muted" style={{ margin: '6px 0 0' }}>{t('admin.noSubscription')}</p>
                  )}
                </div>
                <p className="hint" style={{ marginTop: 0 }}>{t('admin.manualPlanHint')}</p>
                <div className="panel-row">
                  <div className="field">
                    <label htmlFor="d-plan">{t('admin.colPlan')}</label>
                    <select id="d-plan" className="select" value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
                      <option value="free">{t('plan.free')}</option>
                      <option value="pro">{t('plan.pro')}</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="d-exp">{t('admin.proEnds')}</label>
                    <input id="d-exp" className="input" type="date" value={expiry} disabled={plan !== 'pro'} onChange={(e) => setExpiry(e.target.value)} />
                    <span className="hint">{t('admin.proEndsHint')}</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="d-note">{t('admin.note')}</label>
                  <textarea id="d-note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder={t('admin.notePlaceholder')} />
                  <span className="hint">{t('admin.noteHint')}</span>
                </div>
                <button className="btn btn-primary" disabled={busy} onClick={savePlan}>{t('admin.savePlan')}</button>
              </section>
            )}

            {u.role !== 'admin' && (
              <section className="panel">
                <h2>{t('admin.overrideTitle')}</h2>
                <p className="muted" style={{ marginTop: 0 }}>{t('admin.overrideHelp')}</p>
                <div className="limit-grid">
                  <span className="head">{t('admin.limit')}</span>
                  <span className="head">{t('admin.value')}</span>
                  <span className="head" />
                  {(['maxCourses', 'maxPads'] as const).map((k) => (
                    <NumberOverride
                      key={k}
                      label={t(k === 'maxCourses' ? 'admin.maxCourses' : 'admin.maxPads')}
                      value={override[k]}
                      onChange={(v) => setOverride((o) => ({ ...o, [k]: v }))}
                    />
                  ))}
                  {FEATURE_KEYS.map((k) => (
                    <FeatureOverride key={k} k={k} value={override[k]} onChange={(v) => setOverride((o) => ({ ...o, [k]: v }))} />
                  ))}
                </div>
                <div className="toolbar-row" style={{ marginTop: 14, marginBottom: 0 }}>
                  <button className="btn btn-primary" disabled={busy} onClick={saveOverride}>{t('admin.saveOverride')}</button>
                  <button className="btn" disabled={busy} onClick={() => setOverride({})}>{t('admin.resetOverride')}</button>
                </div>
              </section>
            )}

            <section className="panel">
              <h2>{t('admin.accountSection')}</h2>
              <div className="toolbar-row" style={{ marginBottom: 0 }}>
                {u.status === 'active' ? (
                  <button className="btn" disabled={busy || isSelf} onClick={() => void patch({ status: 'suspended' }, t('admin.suspendedToast'))}>
                    {t('admin.suspend')}
                  </button>
                ) : (
                  <button className="btn" disabled={busy} onClick={() => void patch({ status: 'active' }, t('admin.unsuspendedToast'))}>
                    {t('admin.unsuspend')}
                  </button>
                )}
                <button className="btn" disabled={busy} onClick={resetPassword}>{t('admin.resetPassword')}</button>
                <button className="btn" disabled={busy || isSelf} onClick={() => void patch({ role: u.role === 'admin' ? 'teacher' : 'admin' }, t('admin.roleChanged'))}>
                  {t(u.role === 'admin' ? 'admin.removeAdmin' : 'admin.makeAdmin')}
                </button>
                <button className="btn btn-danger" disabled={busy || isSelf} onClick={() => setConfirmDelete(true)}>{t('admin.deleteAccount')}</button>
              </div>
              <p className="muted" style={{ marginBottom: 0 }}>{t('admin.suspendNote')}</p>
              {u.billing?.hasAccess && u.billing.status !== 'cancelled' && (
                <p className="muted" style={{ marginBottom: 0 }}>{t('admin.suspendBillingNote')}</p>
              )}
            </section>

            <section className="panel">
              <h2>
                {t('admin.contentTitle')}
                <span className="muted" style={{ fontWeight: 400, marginInlineStart: 8 }}>
                  {tn('common.courseCount', d.courses.length)}, {tn('common.padCount', u.usage.pads)}
                </span>
              </h2>
              {d.pads.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>{t('admin.noPads')}</p>
              ) : (
                <ul className="feature-list">
                  {d.pads.slice(0, 50).map((p) => (
                    <li key={p.id}>
                      <span className="lang-badge">{langLabel(p.language)}</span>
                      <Link to={`/pad/${p.id}`}>{p.title}</Link>
                      <span className="muted">{p.courseTitle ?? t('admin.noCourse')}, {formatDate(p.updatedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <ConfirmDialog
              open={confirmDelete}
              title={t('admin.deleteAccount')}
              message={
                t('admin.deleteConfirmMsg', { name: u.name }) +
                (u.billing?.hasAccess && u.billing.status !== 'cancelled' ? ' ' + t('admin.deleteCancelsSub') : '')
              }
              onConfirm={() => void remove()}
              onCancel={() => setConfirmDelete(false)}
              danger
              confirmLabel={t('admin.deleteAccount')}
            />
          </>
        )}
      </aside>
    </div>
  );
}

function NumberOverride({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (v: number | null | undefined) => void }): JSX.Element {
  const { t } = useI18n();
  const mode = value === undefined ? 'plan' : value === null ? 'unlimited' : 'custom';
  return (
    <>
      <span>{label}</span>
      <select className="select" aria-label={t('admin.settingFor', { label })} value={mode} onChange={(e) => {
        const m = e.target.value;
        onChange(m === 'plan' ? undefined : m === 'unlimited' ? null : 10);
      }}>
        <option value="plan">{t('admin.followPlan')}</option>
        <option value="unlimited">{t('admin.unlimited')}</option>
        <option value="custom">{t('admin.customNumber')}</option>
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
  const { t } = useI18n();
  const label = t(featureKey(k));
  return (
    <>
      <span>{label}</span>
      <select className="select" aria-label={t('admin.settingFor', { label })} value={value === undefined ? 'plan' : value ? 'on' : 'off'} onChange={(e) => {
        const v = e.target.value;
        onChange(v === 'plan' ? undefined : v === 'on');
      }}>
        <option value="plan">{t('admin.followPlan')}</option>
        <option value="on">{t('admin.on')}</option>
        <option value="off">{t('admin.off')}</option>
      </select>
      <span />
    </>
  );
}

function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }): JSX.Element {
  const toast = useToast();
  const { t } = useI18n();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'teacher', plan: 'pro' });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (f.password.length < 8) return toast.show(t('admin.passwordShort'), 'error');
    setBusy(true);
    try {
      await apiFetch('/api/admin/users', { method: 'POST', body: f });
      toast.show(t('admin.userAdded'), 'success');
      onAdded();
    } catch (err) {
      toast.show(errMsg(err, t('admin.addFailed')), 'error');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="modal-card" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('admin.addTitle')}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}>✕</button>
        </div>
        <div className="field">
          <label htmlFor="a-name">{t('admin.fullName')}</label>
          <input id="a-name" className="input" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} required />
        </div>
        <div className="field">
          <label htmlFor="a-email">{t('admin.email')}</label>
          <input id="a-email" className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        </div>
        <div className="field">
          <label htmlFor="a-pass">{t('admin.tempPassword')}</label>
          <input id="a-pass" className="input" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
          <span className="hint">{t('admin.tempPasswordHint')}</span>
        </div>
        <div className="panel-row">
          <div className="field">
            <label htmlFor="a-role">{t('admin.role')}</label>
            <select id="a-role" className="select" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="teacher">{t('admin.roleTeacher')}</option>
              <option value="admin">{t('admin.roleAdmin')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="a-plan">{t('admin.colPlan')}</label>
            <select id="a-plan" className="select" value={f.plan} disabled={f.role === 'admin'} onChange={(e) => setF({ ...f, plan: e.target.value })}>
              <option value="pro">{t('plan.pro')}</option>
              <option value="free">{t('plan.free')}</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{t('admin.addUser')}</button>
        </div>
      </form>
    </div>
  );
}

// ---------------- Plan limitleri ----------------
function PlansEditor(): JSX.Element {
  const toast = useToast();
  const { t } = useI18n();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<SiteSettings>('/api/admin/settings')
      .then(setS)
      .catch((err) => toast.show(errMsg(err, t('admin.settingsFailed')), 'error'));
  }, [toast, t]);

  if (!s) return <div className="spinner" />;

  function setLimit(plan: PlanId, key: keyof PlanLimits, value: number | null | boolean): void {
    setS((prev) => (prev ? { ...prev, plans: { ...prev.plans, [plan]: { ...prev.plans[plan], [key]: value } } } : prev));
  }

  async function save(): Promise<void> {
    if (!s) return;
    setBusy(true);
    try {
      setS(await apiFetch<SiteSettings>('/api/admin/settings', { method: 'PATCH', body: { plans: s.plans } }));
      toast.show(t('admin.limitsSaved'), 'success');
    } catch (err) {
      toast.show(errMsg(err, t('admin.saveFailed')), 'error');
    } finally {
      setBusy(false);
    }
  }

  const plans: PlanId[] = ['free', 'pro'];
  const planName = (p: PlanId): string => t(p === 'pro' ? 'plan.pro' : 'plan.free');
  return (
    <section className="panel">
      <h2>{t('admin.plansTitle')}</h2>
      <p className="muted" style={{ marginTop: 0 }}>{t('admin.plansHelp')}</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.limit')}</th>
              {plans.map((p) => <th key={p}>{planName(p)}</th>)}
            </tr>
          </thead>
          <tbody>
            {(['maxCourses', 'maxPads'] as const).map((k) => {
              const label = t(k === 'maxCourses' ? 'admin.maxCourses' : 'admin.maxPads');
              return (
                <tr key={k}>
                  <td>{label}</td>
                  {plans.map((p) => {
                    const v = s.plans[p][k];
                    return (
                      <td key={p}>
                        <label className="check-row" style={{ marginBottom: 6 }}>
                          <input type="checkbox" checked={v === null} onChange={(e) => setLimit(p, k, e.target.checked ? null : 10)} />
                          {t('admin.unlimited')}
                        </label>
                        {v !== null && (
                          <input className="input" type="number" min={0} style={{ width: 110 }} aria-label={`${planName(p)}: ${label}`} value={v} onChange={(e) => setLimit(p, k, Math.max(0, Number(e.target.value) || 0))} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {FEATURE_KEYS.map((k) => (
              <tr key={k}>
                <td>{t(featureKey(k))}</td>
                {plans.map((p) => (
                  <td key={p}>
                    <label className="check-row">
                      <input type="checkbox" checked={s.plans[p][k]} onChange={(e) => setLimit(p, k, e.target.checked)} />
                      {t(s.plans[p][k] ? 'admin.on' : 'admin.off')}
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn btn-primary" disabled={busy} onClick={() => void save()}>{t('admin.saveLimits')}</button>
      </div>
    </section>
  );
}

// ---------------- Site ayarları ----------------
function SiteSettingsForm(): JSX.Element {
  const toast = useToast();
  const { t } = useI18n();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<SiteSettings>('/api/admin/settings')
      .then(setS)
      .catch((err) => toast.show(errMsg(err, t('admin.settingsFailed')), 'error'));
  }, [toast, t]);

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
      toast.show(t('admin.settingsSaved'), 'success');
    } catch (err) {
      toast.show(errMsg(err, t('admin.saveFailed')), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={save}>
      <h2>{t('admin.siteTitle')}</h2>
      <label className="check-row" style={{ marginBottom: 6 }}>
        <input type="checkbox" checked={s.registrationOpen} onChange={(e) => setS({ ...s, registrationOpen: e.target.checked })} />
        <span>
          <b>{t('admin.regOpen')}</b>
          <span className="cell-sub">{t('admin.regOpenHelp')}</span>
        </span>
      </label>
      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="s-upgrade">{t('admin.upgradeInfo')}</label>
        <textarea
          id="s-upgrade"
          className="textarea"
          value={s.upgradeInfo}
          maxLength={2000}
          placeholder={t('plans.defaultUpgrade')}
          onChange={(e) => setS({ ...s, upgradeInfo: e.target.value })}
        />
        <span className="hint">{t('admin.upgradeHint')}</span>
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy}>{t('admin.saveSettings')}</button>
    </form>
  );
}
