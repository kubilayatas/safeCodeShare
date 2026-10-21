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
};

export default function PadView(): JSX.Element {
  const { viewToken } = useParams<{ viewToken: string }>();
  const toast = useToast();

  const [info, setInfo] = useState<PublicViewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [pStatus, setPStatus] = useState<ProtectedConnectionStatus>('connecting');
  const [presence, setPresence] = useState<Presence>({ owners: 0, editors: 0, viewers: 0 });
  const [settings, setSettings] = useState<AppSettings>(() => ensureNickname(loadSettings()));
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
          requiresPassword: err.code === 'PASSWORD_REQUIRED'
        });
      } else {
        setError({ status: 0, code: 'UNKNOWN', message: 'Yüklenemedi', requiresPassword: false });
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
    () => (settings.nickname.trim().length > 0 ? settings.nickname : 'İzleyici'),
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
      toast.show('Şifre doğru', 'success');
      setPassword('');
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Şifre hatalı';
      toast.show(msg, 'error');
    } finally {
      setUnlocking(false);
    }
  }

  async function copyAll(): Promise<void> {
    if (!ctx) return;
    try {
      await navigator.clipboard.writeText(ctx.getText());
      toast.show('Kod kopyalandı', 'success');
    } catch {
      toast.show('Kopyalanamadı', 'error');
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
          <h2>🔒 Bu kod şifreli</h2>
          <p className="muted">Devam etmek için şifreyi girin.</p>
          <div className="field">
            <label>Şifre</label>
            <input
              className="input"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={unlocking}>
            {unlocking ? 'Kontrol ediliyor…' : 'Aç'}
          </button>
        </form>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="public-gate">
        <div className="public-card">
          <h2>Erişilemiyor</h2>
          <p>{error?.message ?? 'Bu paylaşım mevcut değil.'}</p>
        </div>
      </div>
    );
  }

  const isProtected = info.protected;

  return (
    <div className={`pad-page theme-${settings.theme}`}>
      <div className={`viewer-banner ${isProtected ? 'protected' : ''}`}>
        {isProtected ? (
          <>🛡 Bu kod kopyalamaya kapalı. Okuyarak ve elle yazarak öğren.</>
        ) : (
          <>👁 Salt okunur. Öğretmen yazdıkça kod burada canlı güncellenir.</>
        )}
      </div>

      <Toolbar
        left={<span className="pad-title-static">💻 {info.title}</span>}
        center={info.courseTitle ? <span className="muted">{info.courseTitle}</span> : <span />}
        right={
          <>
            {!isProtected && (
              <>
                <button className="btn btn-sm" onClick={() => void copyAll()}>📋 Kopyala</button>
                <button className="btn btn-sm" onClick={download}>⬇ İndir</button>
              </>
            )}
            <button
              className="btn btn-sm"
              onClick={() => setSettings((s) => ({ ...s, fontSize: Math.max(12, s.fontSize - 1) }))}
              title="Yazıyı küçült"
            >
              A−
            </button>
            <button
              className="btn btn-sm"
              onClick={() => setSettings((s) => ({ ...s, fontSize: Math.min(32, s.fontSize + 1) }))}
              title="Yazıyı büyüt"
            >
              A+
            </button>
            <label className="btn btn-sm follow-toggle" title="Öğretmeni takip et">
              <input
                type="checkbox"
                checked={follow}
                onChange={(e) => setFollow(e.target.checked)}
              />{' '}
              Öğretmeni takip et
            </label>
            <button className="btn btn-sm" onClick={() => setShowHelp(true)} title="Kısayollar (F1)">⌨</button>
            <button className="btn btn-sm" onClick={() => setShowSettings((v) => !v)}>⚙</button>
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
          <span className="sb-item">Korunan görünüm</span>
          <span className="sb-item">🧑‍🏫 {pCursor ? `Satır ${pCursor.line}` : 'öğretmen bekleniyor'}</span>
          <span className="sb-spacer" />
          <span className="sb-item">{resolvedLanguage}</span>
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