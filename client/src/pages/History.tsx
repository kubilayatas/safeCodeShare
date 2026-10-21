import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PadFull, VersionFull, VersionSummary } from '@safecodeshare/shared';
import { languageLabel } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useToast } from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import ReadOnlyCodeView from '../components/ReadOnlyCodeView';
import { loadSettings, type AppSettings } from '../editor/settings';

function fmtDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString('tr-TR');
}

function relative(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  return `${d} gün önce`;
}

export default function History(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [settings] = useState<AppSettings>(() => loadSettings());

  const [pad, setPad] = useState<PadFull | null>(null);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<VersionFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const loadAll = useCallback(async (): Promise<void> => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [padRes, versionsRes] = await Promise.all([
        apiFetch<{ pad: PadFull }>(`/api/pads/${id}`),
        apiFetch<{ versions: VersionSummary[] }>(`/api/pads/${id}/versions`)
      ]);
      setPad(padRes.pad);
      setVersions(versionsRes.versions);
      if (versionsRes.versions.length > 0) {
        setSelectedId(versionsRes.versions[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sürümler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Seçili sürümün içeriğini yükle
  useEffect(() => {
    if (!id || selectedId == null) {
      setSelected(null);
      return;
    }
    let cancelled = false;
    setLoadingContent(true);
    apiFetch<{ version: VersionFull }>(`/api/pads/${id}/versions/${selectedId}`)
      .then((r) => {
        if (!cancelled) setSelected(r.version);
      })
      .catch((err) => {
        if (!cancelled) toast.show(err instanceof ApiError ? err.message : 'İçerik yüklenemedi', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, selectedId, toast]);

  const onRestore = (): void => {
    if (!pad || !selected) return;
    setConfirm({
      open: true,
      title: 'Bu sürüme geri dön',
      message: `Mevcut hali "Geri yükleme öncesi" etiketiyle kaydedilecek ve bu sürüm uygulanacak. Devam?`,
      onConfirm: async () => {
        setConfirm((c) => ({ ...c, open: false }));
        setRestoring(true);
        try {
          await apiFetch(`/api/pads/${pad.id}/versions/${selected.id}/restore`, { method: 'POST' });
          toast.show('Sürüm geri yüklendi', 'success');
          await loadAll();
        } catch (err) {
          const msg = err instanceof ApiError ? err.message : 'Geri yükleme başarısız';
          toast.show(msg, 'error');
        } finally {
          setRestoring(false);
        }
      }
    });
  };

  const onDuplicate = async (): Promise<void> => {
    if (!pad || !selected) return;
    try {
      const r = await apiFetch<{ pad: { id: string } }>(
        `/api/pads/${pad.id}/versions/${selected.id}/duplicate`,
        { method: 'POST' }
      );
      toast.show('Yeni pad oluşturuldu', 'success');
      navigate(`/pad/${r.pad.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Kopyalama başarısız';
      toast.show(msg, 'error');
    }
  };

  const list = useMemo(() => versions, [versions]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !pad) {
    return (
      <div className="error-page">
        <h2>Hata</h2>
        <p>{error ?? 'Pad bulunamadı'}</p>
        <button className="btn" onClick={() => navigate('/dashboard')}>Panele dön</button>
      </div>
    );
  }

  return (
    <div className={`history-page theme-${settings.theme}`}>
      <div className="history-header">
        <button className="btn btn-sm" onClick={() => navigate(`/pad/${pad.id}`)}>← Pad'e dön</button>
        <h1>🕘 Sürüm geçmişi — {pad.title}</h1>
        <span className="muted">{versions.length} sürüm</span>
      </div>

      <div className="history-body">
        <aside className="history-list">
          {list.length === 0 && <p className="muted">Bu padde henüz kayıtlı sürüm yok.</p>}
          {list.map((v) => (
            <button
              key={v.id}
              className={`history-item ${selectedId === v.id ? 'active' : ''}`}
              onClick={() => setSelectedId(v.id)}
            >
              <div className="history-item-title">
                {v.isAuto ? '🤖 Otomatik' : `✏️ ${v.label ?? 'Manuel sürüm'}`}
              </div>
              <div className="history-item-sub muted">
                {relative(v.createdAt)} · {fmtDate(v.createdAt)}
              </div>
            </button>
          ))}
        </aside>

        <section className="history-content">
          {selected && (
            <>
              <div className="history-content-head">
                <div>
                  <strong>
                    {selected.isAuto ? '🤖 Otomatik' : `✏️ ${selected.label ?? 'Manuel sürüm'}`}
                  </strong>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {fmtDate(selected.createdAt)} · {languageLabel(selected.language)} ·{' '}
                    {selected.contentText.length} karakter
                  </div>
                </div>
                <div className="history-content-actions">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={onRestore}
                    disabled={restoring}
                  >
                    {restoring ? 'Uygulanıyor…' : 'Bu sürüme geri dön'}
                  </button>
                  <button className="btn btn-sm" onClick={() => void onDuplicate()}>
                    Yeni pad olarak kopyala
                  </button>
                  <a
                    className="btn btn-sm"
                    href={`/api/pads/${pad.id}/versions/${selected.id}/download`}
                  >
                    ⬇ İndir
                  </a>
                </div>
              </div>
              <div className="history-content-code">
                {loadingContent ? (
                  <div className="app-loading"><div className="spinner" /></div>
                ) : (
                  <ReadOnlyCodeView
                    code={selected.contentText}
                    language={selected.language}
                    fontSize={settings.fontSize}
                    theme={settings.theme}
                    lineWrapping={settings.lineWrapping}
                  />
                )}
              </div>
            </>
          )}
          {!selected && <p className="muted">Soldan bir sürüm seçin.</p>}
        </section>
      </div>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />
    </div>
  );
}