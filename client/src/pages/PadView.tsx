import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicViewInfo } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import { useToast } from '../components/Toast';
import Editor from '../components/Editor';
import type {
  ConnectionStatus,
  CursorInfo,
  EditorContext,
  Presence
} from '../components/Editor';
import ProtectedCodeView from '../components/ProtectedCodeView';
import type {
  ProtectedConnectionStatus,
  ProtectedPresence,
  ProtectedTeacherCursor
} from '../components/ProtectedCodeView';
import ConnectionDot from '../components/ConnectionDot';
import PresenceBar from '../components/PresenceBar';
import SettingsPanel from '../components/SettingsPanel';
import ShortcutsHelp from '../components/ShortcutsHelp';
import StatusBar from '../components/StatusBar';
import Toolbar from '../components/Toolbar';
import AdBanner from '../components/AdBanner';
import { useI18n } from '../i18n';
import { useLangLabel } from '../i18n/LocalePicker';
import {
  colorForName,
  ensureNickname,
  loadSettings,
  saveSettings,
  type AppSettings
} from '../editor/settings';

const EMPTY_CURSOR: CursorInfo = {
  line: 1,
  col: 1,
  selectionLength: 0,
  selectionCount: 1,
  totalLines: 1
};

type LoadError = {
  status: number;
  code: string;
  message: string;
  requiresPassword: boolean;
  availableAt?: number;
};

export default function PadView(): JSX.Element {
  const { viewToken } = useParams<{ viewToken: string }>();
  const toast = useToast();
  const { t, formatDateTime } = useI18n();
  const langLabel = useLangLabel();

  const [info, setInfo] = useState<PublicViewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [pStatus, setPStatus] = useState<ProtectedConnectionStatus>('connecting');
  const [presence, setPresence] = useState<Presence>({ owners: 0, editors: 0, viewers: 0 });
  const [settings, setSettings] = useState<AppSettings>(() => ensureNickname(loadSettings(), t('view.student')));
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [ctx, setCtx] = useState<EditorContext | null>(null);
  const [cursor, setCursor] = useState<CursorInfo>(EMPTY_CURSOR);
  const [pCursor, setPCursor] = useState<ProtectedTeacherCursor>(null);
  const [follow, setFollow] = useState(true);
  const [resolvedLanguage, setResolvedLanguage] = useState<string>('plaintext');
  const followRef = useRef(follow);
  followRef.current = follow;
  const lastAuthReload = useRef(0);

  const load = useCallback(async (): Promise<void> => {
    if (!viewToken) return;
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch<PublicViewInfo>(`/api/public/view/${viewToken}`);
      setInfo(r);
      setResolvedLanguage(r.language);
    } catch (err) {
      if (err instanceof ApiError) {
        setError({
          status: err.status,
          code: err.code,
          message: err.message,
          requiresPassword: err.code === 'PASSWORD_REQUIRED',
          availableAt: typeof err.data.availableAt === 'number' ? err.data.availableAt : undefined
        });
      } else {
        setError({ status: 0, code: 'UNKNOWN', message: t('view.loadFailed'), requiresPassword: false });
      }
    } finally {
      setLoading(false);
    }
  }, [viewToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const nickname = useMemo(
    () => (settings.nickname.trim().length > 0 ? settings.nickname : t('view.viewer')),
    [settings.nickname]
  );
  const color = useMemo(() => colorForName(nickname), [nickname]);

  async function tryUnlock(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!viewToken) return;
    setUnlocking(true);
    try {
      await apiFetch(`/api/public/view/${viewToken}/unlock`, {
        method: 'POST',
        body: { password }
      });
      toast.show(t('view.passwordOk'), 'success');
      setPassword('');
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('view.passwordWrong');
      toast.show(msg, 'error');
    } finally {
      setUnlocking(false);
    }
  }

  async function copyAll(): Promise<void> {
    if (!ctx) return;
    try {
      await navigator.clipboard.writeText(ctx.getText());
      toast.show(t('pad.codeCopied'), 'success');
    } catch {
      toast.show(t('common.copyFailed'), 'error');
    }
  }

  function download(): void {
    if (!viewToken) return;
    window.location.href = `/api/public/view/${viewToken}/download`;
  }

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error?.requiresPassword) {
    return (
      <div className="public-gate">
        <form className="public-card" onSubmit={tryUnlock}>
          <h2>{t('view.passwordTitle')}</h2>
          <p className="muted">{t('view.passwordBody')}</p>
          <div className="field">
            <label htmlFor="view-password">{t('view.password')}</label>
            <input
              id="view-password"
              className="input"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={unlocking}>
            {t(unlocking ? 'view.checking' : 'view.unlock')}
          </button>
        </form>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="public-gate">
        <div className="public-card">
          <h2>{t('view.unavailable')}</h2>
          <p>
            {error?.availableAt
              ? t('view.availableAt', { date: formatDateTime(error.availableAt) })
              : error?.message ?? t('view.notFound')}
          </p>
        </div>
      </div>
    );
  }

  const isProtected = info.protected;

  return (
    <div className={`pad-page theme-${settings.theme}`} data-print-msg={t('protected.printBlocked')}>
      <div className={`viewer-banner ${isProtected ? 'protected' : ''}`}>
        {isProtected ? (
          <>{t('view.bannerProtected')}</>
        ) : (
          <>{t('view.bannerReadOnly')}</>
        )}
      </div>

      <Toolbar
        left={<span className="pad-title-static">💻 {info.title}</span>}
        center={info.courseTitle ? <span className="muted">{info.courseTitle}</span> : <span />}
        right={
          <>
            {!isProtected && (
              <>
                <button className="btn btn-sm" onClick={() => void copyAll()}>{t('view.copy')}</button>
                <button className="btn btn-sm" onClick={download}>{t('view.download')}</button>
              </>
            )}
            <button
              className="btn btn-sm"
              onClick={() => setSettings((s) => ({ ...s, fontSize: Math.max(12, s.fontSize - 1) }))}
              title={t('view.smaller')}
              aria-label={t('view.smaller')}
            >
              A−
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setSettings((s) => ({ ...s, fontSize: Math.min(32, s.fontSize + 1) }))}
              title={t('view.bigger')}
              aria-label={t('view.bigger')}
            >
              A+
            </button>
            <label className="btn btn-sm follow-toggle">
              <input
                type="checkbox"
                checked={follow}
                onChange={(e) => setFollow(e.target.checked)}
              />{' '}
              {t('view.follow')}
            </label>
            <button className="btn btn-sm" onClick={() => setShowHelp(true)} title={t('view.shortcuts')} aria-label={t('view.shortcuts')}>⌨</button>
            <button className="btn btn-sm" onClick={() => setShowSettings((v) => !v)} title={t('pad.settings')} aria-label={t('pad.settings')}>⚙</button>
            <ConnectionDot status={isProtected ? (pStatus === 'connected' ? 'connected' : pStatus === 'connecting' ? 'connecting' : 'disconnected') : status} />
            <PresenceBar presence={presence} selfName={nickname} selfColor={color} />
          </>
        }
      />

      <div className="pad-body">
        {isProtected ? (
          <ProtectedCodeView
            viewToken={viewToken!}
            ocrLevel={info.ocrProtect}
            language={resolvedLanguage}
            fontSize={settings.fontSize}
            lineWrapping={settings.lineWrapping}
            followEnabled={follow}
            onConnectionStatus={setPStatus}
            onPresence={(p: ProtectedPresence) => setPresence(p)}
            onTeacherCursor={setPCursor}
            onLanguageResolved={setResolvedLanguage}
            onReload={() => {
              // Meta bilgisi değişti: bilgiyi yeniden çek ve normal görüntüleyiciye geç
              void load();
            }}
          />
        ) : (
          <Editor
            padId={info.padId}
            token={viewToken}
            readOnly
            initialLanguage={info.language}
            settings={settings}
            displayName={nickname}
            displayColor={color}
            role="viewer"
            themeClass={settings.theme}
            actions={{ onHelp: () => setShowHelp(true) }}
            onConnectionStatus={setStatus}
            onPresence={setPresence}
            onCursorChange={setCursor}
            onReady={setCtx}
            onError={(msg) => {
              // Bağlantı reddedildiyse öğretmen ayarı değiştirmiştir (ör. kopyalama korumasını
              // açtı, linki kapattı, şifre koydu). Bilgiyi yeniden çekip doğru ekrana geç.
              const now = Date.now();
              if (now - lastAuthReload.current > 5000) {
                lastAuthReload.current = now;
                void load();
              } else {
                toast.show(msg, 'error');
              }
            }}
          />
        )}
      </div>

      {!isProtected && <StatusBar language={info.language} cursor={cursor} dirty={false} />}
      {isProtected && (
        <div className="statusbar">
          <span className="sb-item">{t('view.protectedView')}</span>
          <span className="sb-item">{pCursor ? t('view.teacherAtLine', { line: pCursor.line }) : t('view.waitingTeacher')}</span>
          <span className="sb-spacer" />
          <span className="sb-item">{langLabel(resolvedLanguage)}</span>
        </div>
      )}

      <AdBanner className="pad-ad-banner" format="horizontal" />

      <SettingsPanel
        open={showSettings}
        settings={settings}
        onChange={setSettings}
        onClose={() => setShowSettings(false)}
        showNickname
      />

      <ShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}