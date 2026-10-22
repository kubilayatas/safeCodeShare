import { useEffect, useMemo, useState } from 'react';
import type { PadFull } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useToast } from './Toast';
import QrCode from './QrCode';
import { can, useAccount } from '../account';
import { LockChip } from './PlanBits';
import { useI18n } from '../i18n';
import { useLangLabel } from '../i18n/LocalePicker';

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
  const { t } = useI18n();
  const langLabel = useLangLabel();
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
      const msg = err instanceof ApiError ? err.message : t('share.updateFailed');
      toast.show(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function rotate(which: 'edit' | 'view' | 'both', label: string): Promise<void> {
    if (busy) return;
    if (!window.confirm(t('share.renewConfirm', { label }))) return;
    setBusy(true);
    try {
      const res = await apiFetch<{ pad: PadFull }>(`/api/pads/${pad.id}/rotate-tokens`, {
        method: 'POST',
        body: { which }
      });
      onPadChange(res.pad);
      toast.show(t('share.renewed'), 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('share.renewFailed');
      toast.show(msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, label = t('common.copied')): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      toast.show(label, 'success');
    } catch {
      toast.show(text, 'info');
    }
  }

  function setExpiresPreset(p: ExpiresPreset): void {
    if (p === 'never') void patch({ expiresAt: null }, t('share.expiryRemoved'));
    else if (p === '1h') void patch({ expiresAt: Date.now() + 60 * 60 * 1000 }, t('share.expirySet'));
    else if (p === '1d') void patch({ expiresAt: Date.now() + 24 * 60 * 60 * 1000 }, t('share.expirySet'));
    else if (p === '1w') void patch({ expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 }, t('share.expirySet'));
  }

  async function submitPassword(): Promise<void> {
    if (pwDraft.trim().length === 0) {
      await patch({ password: null }, t('share.passwordRemoved'));
    } else {
      await patch({ password: pwDraft }, t('share.passwordSaved'));
    }
    setPwDraft('');
    setPwOpen(false);
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card share-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{t('share.title', { title: pad.title })}</h3>
          <button className="icon-btn" onClick={onClose} title={t('common.close')} aria-label={t('common.close')}>✕</button>
        </div>

        {/* İzleme linki */}
        <section className="share-section">
          <div className="share-row">
            <label className="share-toggle">
              <input
                type="checkbox"
                checked={pad.viewEnabled}
                disabled={busy}
                onChange={(e) => void patch({ viewEnabled: e.target.checked }, t(e.target.checked ? 'share.viewEnabled' : 'share.viewDisabled'))}
              />
              {t(pad.viewEnabled ? 'share.viewOn' : 'share.viewOff')}
            </label>
          </div>
          <div className="share-link">
            <input className="input" dir="ltr" readOnly aria-label={t('share.viewOn')} value={viewUrl} onFocus={(e) => e.target.select()} />
            <button className="btn btn-sm" onClick={() => void copy(viewUrl, t('share.viewCopied'))}>{t('common.copy')}</button>
            <button className="btn btn-sm" onClick={() => setQrOpen((v) => !v)}>{t(qrOpen ? 'share.hideQr' : 'share.showQr')}</button>
            <button className="btn btn-sm" disabled={busy} onClick={() => void rotate('view', t('share.viewLinkName'))}>{t('share.renew')}</button>
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
                <button className="btn btn-sm" disabled>{t('share.setPassword')}</button>
                <LockChip />
              </>
            ) : pad.hasPassword ? (
              <>
                <span className="badge-inline">{t('share.passwordProtected')}</span>
                <button className="btn btn-sm" disabled={busy} onClick={() => void patch({ password: null }, t('share.passwordRemoved'))}>
                  {t('share.removePassword')}
                </button>
              </>
            ) : (
              <>
                {!pwOpen ? (
                  <button className="btn btn-sm" onClick={() => setPwOpen(true)}>{t('share.setPassword')}</button>
                ) : (
                  <div className="share-pw-form">
                    <input
                      className="input"
                      type="password"
                      placeholder={t('share.newPassword')}
                      aria-label={t('share.newPassword')}
                      value={pwDraft}
                      onChange={(e) => setPwDraft(e.target.value)}
                    />
                    <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void submitPassword()}>
                      {t('common.save')}
                    </button>
                    <button className="btn btn-sm" onClick={() => { setPwOpen(false); setPwDraft(''); }}>{t('common.cancel')}</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Görünürlük */}
          <div className="share-subrow">
            <label className="muted" htmlFor="share-visible-from">{t('share.visibleFrom')}</label>
            <input
              id="share-visible-from"
              className="input"
              type="datetime-local"
              value={toDatetimeLocalValue(pad.visibleFrom)}
              disabled={busy || !can(ent, 'scheduledShares')}
              onChange={(e) => void patch({ visibleFrom: fromDatetimeLocalValue(e.target.value) })}
            />
            {pad.visibleFrom != null && (
              <button className="btn btn-sm" onClick={() => void patch({ visibleFrom: null })}>{t('share.remove')}</button>
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
                    if (!window.confirm(t('share.editConfirm'))) return;
                  }
                  void patch({ editEnabled: e.target.checked }, t(e.target.checked ? 'share.editEnabled' : 'share.editDisabled'));
                }}
              />
              {t(pad.editEnabled ? 'share.editOn' : 'share.editOff')}
            </label>
            {!pad.editEnabled && !can(ent, 'editLinks') && <LockChip />}
          </div>
          {pad.editEnabled && (
            <>
              <p className="share-warn">{t('share.editWarn')}</p>
              <div className="share-link">
                <input className="input" dir="ltr" readOnly aria-label={t('share.editOn')} value={editUrl} onFocus={(e) => e.target.select()} />
                <button className="btn btn-sm" onClick={() => void copy(editUrl, t('share.editCopied'))}>{t('common.copy')}</button>
                <button className="btn btn-sm" disabled={busy} onClick={() => void rotate('edit', t('share.editLinkName'))}>{t('share.renew')}</button>
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
              onChange={(e) => void patch({ copyProtect: e.target.checked }, t(e.target.checked ? 'share.copyProtectOn' : 'share.copyProtectOff'))}
            />
            {t('share.copyProtect')}
          </label>
          {!pad.copyProtect && !can(ent, 'copyProtect') && <LockChip />}
          <p className="share-help">
            {t('share.copyProtectHelp')}
          </p>

          <div className="share-subrow" style={{ marginTop: 12 }}>
            <span className="share-toggle" id="ocr-label">{t('share.ocr')}</span>
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
                      t(lvl === 0 ? 'share.ocrSetOff' : lvl === 1 ? 'share.ocrSetLight' : 'share.ocrSetStrong')
                    )
                  }
                >
                  {t(lvl === 0 ? 'share.ocrOff' : lvl === 1 ? 'share.ocrLight' : 'share.ocrStrong')}
                </button>
              ))}
            </div>
            {!can(ent, 'ocrProtect') && <LockChip />}
          </div>
          <p className="share-help">
            {t('share.ocrHelp')}
            {!pad.copyProtect && <> <b>{t('share.ocrNeedsCopy')}</b></>}
          </p>
        </section>

        {/* Ders sayfasında göster */}
        <section className="share-section">
          <label className="share-toggle">
            <input
              type="checkbox"
              checked={pad.visibleInCourse}
              disabled={busy}
              onChange={(e) => void patch({ visibleInCourse: e.target.checked }, t(e.target.checked ? 'share.shownInCourse' : 'share.hiddenInCourse'))}
            />
            {t('share.showInCourse')}
          </label>
        </section>

        {/* Son geçerlilik */}
        <section className="share-section">
          <div className="share-row">
            <label className="muted" htmlFor="share-expiry">{t('share.expiry')}</label>
            <select
              id="share-expiry"
              className="select"
              style={{ width: 'auto' }}
              value={expiresPreset}
              disabled={busy || (!can(ent, 'scheduledShares') && pad.expiresAt == null)}
              onChange={(e) => setExpiresPreset(e.target.value as ExpiresPreset)}
            >
              <option value="never">{t('share.never')}</option>
              <option value="1h">{t('share.1h')}</option>
              <option value="1d">{t('share.1d')}</option>
              <option value="1w">{t('share.1w')}</option>
              <option value="custom">{t('share.custom')}</option>
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
                <button className="btn btn-sm" onClick={() => void patch({ expiresAt: null })}>{t('share.remove')}</button>
              )}
            </div>
          )}
        </section>

        {/* Gömme kodu */}
        <section className="share-section">
          <div className="share-row">
            <span className="muted">{t('share.embed')}</span>
            {!can(ent, 'embed') && <LockChip />}
          </div>
          {can(ent, 'embed') ? (
            <div className="share-link">
              <input className="input" dir="ltr" readOnly aria-label={t('share.embed')} value={embedCode} onFocus={(e) => e.target.select()} />
              <button className="btn btn-sm" onClick={() => void copy(embedCode, t('share.embedCopied'))}>{t('common.copy')}</button>
            </div>
          ) : (
            <p className="share-help">{t('share.embedLocked')}</p>
          )}
        </section>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>{t('common.close')}</button>
        </div>

        <div className="sr-only" aria-live="polite">
          {langLabel(pad.language)}
        </div>
      </div>
    </div>
  );
}