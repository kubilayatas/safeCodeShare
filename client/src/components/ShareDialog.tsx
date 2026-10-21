import { useEffect, useMemo, useState } from 'react';
import type { PadFull } from '@safecodeshare/shared';
import { languageLabel } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useToast } from './Toast';
import QrCode from './QrCode';
import { can, useAccount } from '../account';
import { LockChip } from './PlanBits';

type Props = {
  open: boolean;
  pad: PadFull;
  publicUrl: string;
  onClose: () => void;
  onPadChange: (pad: PadFull) => void;
};

type ExpiresPreset = 'never' | '1h' | '1d' | '1w' | 'custom';

function toDatetimeLocalValue(ms: number | null): string {
  if (ms == null) return '';
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function fromDatetimeLocalValue(v: string): number | null {
  if (!v) return null;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export default function ShareDialog({
  open,
  pad,
  publicUrl,
  onClose,
  onPadChange
}: Props): JSX.Element | null {
  const toast = useToast();
  const { entitlements: ent } = useAccount();
  const [busy, setBusy] = useState(false);
  const [pwDraft, setPwDraft] = useState('');
  const [pwOpen, setPwOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const viewUrl = `${publicUrl}/v/${pad.viewToken}`;
  const editUrl = `${publicUrl}/e/${pad.editToken}`;
  const embedCode = `<iframe src="${publicUrl}/embed/${pad.viewToken}" width="100%" height="400" style="border:1px solid #ccc;border-radius:6px"></iframe>`;

  const expiresPreset: ExpiresPreset = useMemo(() => {
    if (pad.expiresAt == null) return 'never';
    return 'custom';
  }, [pad.expiresAt]);

  useEffect(() => {
    if (open) {
      setPwOpen(false);
      setPwDraft('');
      setQrOpen(false);
    }
  }, [open]);

  if (!open) return null;

  async function patch(body: Record<string, unknown>, successMsg?: string): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ pad: PadFull }>(`/api/pads/${pad.id}`, {
        method: 'PATCH',
        body
      });
      onPadChange(res.pad);
      if (successMsg) toast.show(successMsg, 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Güncelleme başarısız';
      toast.show(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function rotate(which: 'edit' | 'view' | 'both', label: string): Promise<void> {
    if (busy) return;
    if (!window.confirm(`${label} yenilenecek. Eski link çalışmayacak. Devam?`)) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ pad: PadFull }>(`/api/pads/${pad.id}/rotate-tokens`, {
        method: 'POST',
        body: { which }
      });
      onPadChange(res.pad);
      toast.show('Link yenilendi', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Yenileme başarısız';
      toast.show(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, label = 'Kopyalandı'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      toast.show(label, 'success');
    } catch {
      toast.show(text, 'info');
    }
  }

  function setExpiresPreset(p: ExpiresPreset): void {
    if (p === 'never') void patch({ expiresAt: null }, 'Süre kaldırıldı');
    else if (p === '1h') void patch({ expiresAt: Date.now() + 60 * 60 * 1000 }, 'Süre: 1 saat');
    else if (p === '1d') void patch({ expiresAt: Date.now() + 24 * 60 * 60 * 1000 }, 'Süre: 1 gün');
    else if (p === '1w') void patch({ expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }, 'Süre: 1 hafta');
  }

  async function submitPassword(): Promise<void> {
    if (pwDraft.trim().length === 0) {
      await patch({ password: null }, 'Şifre kaldırıldı');
    } else {
      await patch({ password: pwDraft }, 'Şifre kaydedildi');
    }
    setPwDraft('');
    setPwOpen(false);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card share-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{pad.title} kodunu paylaş</h3>
          <button className="icon-btn" onClick={onClose} title="Kapat">✕</button>
        </div>

        {/* İzleme linki */}
        <section className="share-section">
          <div className="share-row">
            <label className="share-toggle">
              <input
                type="checkbox"
                checked={pad.viewEnabled}
                disabled={busy}
                onChange={(e) => void patch({ viewEnabled: e.target.checked }, e.target.checked ? 'İzleme açıldı' : 'İzleme kapatıldı')}
              />
              İzleme linki {pad.viewEnabled ? 'açık' : 'kapalı'}
            </label>
          </div>
          <div className="share-link">
            <input className="input" readOnly value={viewUrl} onFocus={(e) => e.target.select()} />
            <button className="btn btn-sm" onClick={() => void copy(viewUrl, 'İzleme linki kopyalandı')}>Kopyala</button>
            <button className="btn btn-sm" onClick={() => setQrOpen((v) => !v)}>{qrOpen ? 'QR gizle' : 'QR göster'}</button>
            <button className="btn btn-sm" disabled={busy} onClick={() => void rotate('view', 'İzleme linki')}>Yenile</button>
          </div>

          {qrOpen && (
            <div className="qr-wrap">
              <QrCode value={viewUrl} size={320} />
            </div>
          )}

          {/* Şifre */}
          <div className="share-subrow">
            {!pad.hasPassword && !can(ent, 'passwordShares') ? (
              <>
                <button className="btn btn-sm" disabled>Şifre koy</button>
                <LockChip />
              </>
            ) : pad.hasPassword ? (
              <>
                <span className="badge-inline">🔒 Şifreli</span>
                <button className="btn btn-sm" disabled={busy} onClick={() => void patch({ password: null }, 'Şifre kaldırıldı')}>
                  Şifreyi kaldır
                </button>
              </>
            ) : (
              <>
                {!pwOpen ? (
                  <button className="btn btn-sm" onClick={() => setPwOpen(true)}>Şifre koy</button>
                ) : (
                  <div className="share-pw-form">
                    <input
                      className="input"
                      type="password"
                      placeholder="Yeni şifre"
                      value={pwDraft}
                      onChange={(e) => setPwDraft(e.target.value)}
                    />
                    <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void submitPassword()}>
                      Kaydet
                    </button>
                    <button className="btn btn-sm" onClick={() => { setPwOpen(false); setPwDraft(''); }}>Vazgeç</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Görünürlük */}
          <div className="share-subrow">
            <label className="muted" htmlFor="share-visible-from">Şu tarihten itibaren görünür:</label>
            <input
              id="share-visible-from"
              className="input"
              type="datetime-local"
              value={toDatetimeLocalValue(pad.visibleFrom)}
              disabled={busy || !can(ent, 'scheduledShares')}
              onChange={(e) => void patch({ visibleFrom: fromDatetimeLocalValue(e.target.value) })}
            />
            {pad.visibleFrom != null && (
              <button className="btn btn-sm" onClick={() => void patch({ visibleFrom: null })}>Kaldır</button>
            )}
            {!can(ent, 'scheduledShares') && <LockChip />}
          </div>
        </section>

        {/* Düzenleme linki */}
        <section className="share-section">
          <div className="share-row">
            <label className="share-toggle">
              <input
                type="checkbox"
                checked={pad.editEnabled}
                disabled={busy || (!pad.editEnabled && !can(ent, 'editLinks'))}
                onChange={(e) => {
                  if (e.target.checked) {
                    if (!window.confirm('Bu linke sahip herkes kodu değiştirebilir. Emin misiniz?')) return;
                  }
                  void patch({ editEnabled: e.target.checked }, e.target.checked ? 'Düzenleme açıldı' : 'Düzenleme kapatıldı');
                }}
              />
              ✏️ Düzenleme linki {pad.editEnabled ? 'açık' : 'kapalı'}
            </label>
            {!pad.editEnabled && !can(ent, 'editLinks') && <LockChip />}
          </div>
          {pad.editEnabled && (
            <>
              <p className="share-warn">⚠️ Bu linke sahip herkes kodu değiştirebilir.</p>
              <div className="share-link">
                <input className="input" readOnly value={editUrl} onFocus={(e) => e.target.select()} />
                <button className="btn btn-sm" onClick={() => void copy(editUrl, 'Düzenleme linki kopyalandı')}>Kopyala</button>
                <button className="btn btn-sm" disabled={busy} onClick={() => void rotate('edit', 'Düzenleme linki')}>Yenile</button>
              </div>
            </>
          )}
        </section>

        {/* Kopyalama koruması */}
        <section className="share-section">
          <label className="share-toggle">
            <input
              type="checkbox"
              checked={pad.copyProtect}
              disabled={busy || (!pad.copyProtect && !can(ent, 'copyProtect'))}
              onChange={(e) => void patch({ copyProtect: e.target.checked }, e.target.checked ? 'Kopyalama koruması açıldı' : 'Kopyalama koruması kapatıldı')}
            />
            🛡 Kopyalama koruması
          </label>
          {!pad.copyProtect && !can(ent, 'copyProtect') && <LockChip />}
          <p className="share-help">
            Öğrenciler kodu görür ama seçemez, kopyalayamaz, indiremez. Kopyalamayı başarsalar bile
            yapıştırılan kod çalışmaz. Düzenleme linkiyle girenler kodun temiz halini görür.
          </p>

          <div className="share-subrow" style={{ marginTop: 12 }}>
            <span className="share-toggle" id="ocr-label">🤖 AI/OCR koruması</span>
            <div className="segmented" role="group" aria-labelledby="ocr-label">
              {([0, 1, 2] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={pad.ocrProtect === lvl}
                  disabled={busy || (lvl > 0 && (!pad.copyProtect || !can(ent, 'ocrProtect')))}
                  onClick={() =>
                    void patch(
                      { ocrProtect: lvl },
                      lvl === 0 ? 'AI/OCR koruması kapatıldı' : `AI/OCR koruması: ${lvl === 1 ? 'hafif' : 'güçlü'}`
                    )
                  }
                >
                  {lvl === 0 ? 'Kapalı' : lvl === 1 ? 'Hafif' : 'Güçlü'}
                </button>
              ))}
            </div>
            {!can(ent, 'ocrProtect') && <LockChip />}
          </div>
          <p className="share-help">
            Kodun boşluklarına göze batmayan soluk sahte karakterler eklenir. Öğrenci ekranın fotoğrafını
            çekip yapay zekâya veya metin tanıma uygulamasına okutursa bu karakterler de okunur ve kod
            bozuk çıkar. Güçlü seviye kelime aralarına da karakter ekler; okunabilirliği biraz azaltır.
            {!pad.copyProtect && ' Önce kopyalama korumasını aç.'}
          </p>
        </section>

        {/* Ders sayfasında göster */}
        <section className="share-section">
          <label className="share-toggle">
            <input
              type="checkbox"
              checked={pad.visibleInCourse}
              disabled={busy}
              onChange={(e) => void patch({ visibleInCourse: e.target.checked }, e.target.checked ? 'Ders sayfasında görünecek' : 'Ders sayfasında gizlendi')}
            />
            📚 Ders sayfasında göster
          </label>
        </section>

        {/* Son geçerlilik */}
        <section className="share-section">
          <div className="share-row">
            <span className="muted">Son geçerlilik:</span>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={expiresPreset}
              disabled={busy || (!can(ent, 'scheduledShares') && pad.expiresAt == null)}
              onChange={(e) => setExpiresPreset(e.target.value as ExpiresPreset)}
            >
              <option value="never">Süresiz</option>
              <option value="1h">1 saat</option>
              <option value="1d">1 gün</option>
              <option value="1w">1 hafta</option>
              <option value="custom">Özel tarih…</option>
            </select>
            {!can(ent, 'scheduledShares') && <LockChip />}
          </div>
          {expiresPreset === 'custom' && (
            <div className="share-subrow">
              <input
                className="input"
                type="datetime-local"
                value={toDatetimeLocalValue(pad.expiresAt)}
                disabled={busy}
                onChange={(e) => void patch({ expiresAt: fromDatetimeLocalValue(e.target.value) })}
              />
              {pad.expiresAt != null && (
                <button className="btn btn-sm" onClick={() => void patch({ expiresAt: null })}>Kaldır</button>
              )}
            </div>
          )}
        </section>

        {/* Gömme kodu */}
        <section className="share-section">
          <div className="share-row">
            <span className="muted">Başka bir siteye gömme kodu (iframe):</span>
            {!can(ent, 'embed') && <LockChip />}
          </div>
          {can(ent, 'embed') ? (
            <div className="share-link">
              <input className="input" readOnly value={embedCode} onFocus={(e) => e.target.select()} />
              <button className="btn btn-sm" onClick={() => void copy(embedCode, 'Gömme kodu kopyalandı')}>Kopyala</button>
            </div>
          ) : (
            <p className="share-help">Planında gömme yok; kod başka sitelerin içinde açılmaz.</p>
          )}
        </section>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Kapat</button>
        </div>

        <div className="sr-only" aria-live="polite">
          Dil: {languageLabel(pad.language)}
        </div>
      </div>
    </div>
  );
}