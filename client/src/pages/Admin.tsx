import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicUser, Role } from '@kodsinif/shared';
import { apiFetch, ApiError } from '../api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';

type AddForm = {
  open: boolean;
  email: string;
  name: string;
  password: string;
  role: Role;
};

export default function Admin(): JSX.Element {
  const toast = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AddForm>({
    open: false,
    email: '',
    name: '',
    password: '',
    role: 'teacher'
  });
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const r = await apiFetch<{ users: PublicUser[] }>('/api/admin/users');
      setUsers(r.users);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Kullanıcılar yüklenemedi';
      toast.show(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitAdd(): Promise<void> {
    if (form.email.trim().length === 0 || form.name.trim().length === 0) {
      toast.show('E-posta ve ad zorunlu', 'error');
      return;
    }
    if (form.password.length < 8) {
      toast.show('Parola en az 8 karakter olmalı', 'error');
      return;
    }
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: {
          email: form.email.trim(),
          name: form.name.trim(),
          password: form.password,
          role: form.role
        }
      });
      toast.show('Kullanıcı eklendi', 'success');
      setForm({ open: false, email: '', name: '', password: '', role: 'teacher' });
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Eklenemedi';
      toast.show(msg, 'error');
    }
  }

  function resetPassword(u: PublicUser): void {
    const pw = window.prompt(`${u.name} için yeni parola (en az 8 karakter):`);
    if (!pw) return;
    if (pw.length < 8) {
      toast.show('Parola en az 8 karakter olmalı', 'error');
      return;
    }
    void (async () => {
      try {
        await apiFetch(`/api/admin/users/${u.id}`, {
          method: 'PATCH',
          body: { password: pw }
        });
        toast.show('Parola güncellendi', 'success');
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Güncellenemedi';
        toast.show(msg, 'error');
      }
    })();
  }

  function toggleRole(u: PublicUser): void {
    const next: Role = u.role === 'admin' ? 'teacher' : 'admin';
    void (async () => {
      try {
        await apiFetch(`/api/admin/users/${u.id}`, {
          method: 'PATCH',
          body: { role: next }
        });
        toast.show(`Rol: ${next === 'admin' ? 'Yönetici' : 'Öğretmen'}`, 'success');
        await load();
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Rol değiştirilemedi';
        toast.show(msg, 'error');
      }
    })();
  }

  function askDelete(u: PublicUser): void {
    setConfirm({
      open: true,
      title: 'Kullanıcıyı sil',
      message: `"${u.name}" (${u.email}) silinsin mi? Kullanıcının tüm dersleri ve padleri de silinir.`,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        try {
          await apiFetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
          toast.show('Kullanıcı silindi', 'success');
          await load();
        } catch (err) {
          const msg = err instanceof ApiError ? err.message : 'Silinemedi';
          toast.show(msg, 'error');
        }
      }
    });
  }

  function downloadBackup(): void {
    window.location.href = '/api/admin/backup';
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>← Panel</button>
        <h1>⚙️ Admin — Kullanıcı yönetimi</h1>
        <div className="admin-header-actions">
          <button className="btn btn-sm" onClick={downloadBackup}>⬇ Tam yedek indir</button>
          <button className="btn btn-sm btn-primary" onClick={() => setForm((f) => ({ ...f, open: true }))}>
            + Kullanıcı ekle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="app-loading"><div className="spinner" /></div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>E-posta</th>
              <th>Rol</th>
              <th>Kayıt</th>
              <th style={{ width: 320 }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role === 'admin' ? 'Yönetici' : 'Öğretmen'}</td>
                <td>{new Date(u.createdAt).toLocaleString('tr-TR')}</td>
                <td>
                  <button className="btn btn-sm" onClick={() => resetPassword(u)}>Parola sıfırla</button>{' '}
                  <button className="btn btn-sm" onClick={() => toggleRole(u)}>
                    {u.role === 'admin' ? 'Öğretmen yap' : 'Admin yap'}
                  </button>{' '}
                  <button className="btn btn-sm btn-danger" onClick={() => askDelete(u)}>Sil</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {form.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3 style={{ marginTop: 0 }}>Kullanıcı ekle</h3>
            <div className="field">
              <label>Ad</label>
              <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={120} autoFocus />
            </div>
            <div className="field">
              <label>E-posta</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="field">
              <label>Parola (en az 8 karakter)</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="field">
              <label>Rol</label>
              <select className="select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
                <option value="teacher">Öğretmen</option>
                <option value="admin">Yönetici</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setForm((f) => ({ ...f, open: false }))}>Vazgeç</button>
              <button className="btn btn-primary" onClick={() => void submitAdd()}>Ekle</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
        danger
        confirmLabel="Sil"
      />
    </div>
  );
}