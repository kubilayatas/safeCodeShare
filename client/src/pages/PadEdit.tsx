import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PublicEditInfo } from '@kodsinif/shared';
import { apiFetch, ApiError, formatCode } from '../api';
import type { FormatError } from '../api';
import { useToast } from '../components/Toast';
import Editor from '../components/Editor';
import type {
  ConnectionStatus,
  CursorInfo,
  EditorContext,
  Presence
} from '../components/Editor';
import ConnectionDot from '../components/ConnectionDot';
import PresenceBar from '../components/PresenceBar';
import LanguagePicker from '../components/LanguagePicker';
import SettingsPanel from '../components/SettingsPanel';
import ShortcutsHelp from '../components/ShortcutsHelp';
import StatusBar from '../components/StatusBar';
import Toolbar from '../components/Toolbar';
import AdBanner from '../components/AdBanner';
import { applyFormatted } from '../editor/applyFormatted';
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

export default function PadEdit(): JSX.Element {
  const { editToken } = useParams<{ editToken: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [info, setInfo] = useState<PublicEditInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [presence, setPresence] = useState<Presence>({ owners: 0, editors: 0, viewers: 0 });
  const [settings, setSettings] = useState<AppSettings>(() => ensureNickname(loadSettings()));
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [ctx, setCtx] = useState<EditorContext | null>(null);
  const [cursor, setCursor] = useState<CursorInfo>(EMPTY_CURSOR);
  const [dirty, setDirty] = useState(false);
  const [beautifying, setBeautifying] = useState(false);

  useEffect(() => {
    if (!editToken) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<PublicEditInfo>(`/api/public/edit/${editToken}`)
      .then((r) => {
        if (cancelled) return;
        setInfo(r);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Düzenleme sayfası açılamadı');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editToken]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const nickname = useMemo(
    () => (settings.nickname.trim().length > 0 ? settings.nickname : 'Öğrenci'),
    [settings.nickname]
  );
  const color = useMemo(() => colorForName(nickname), [nickname]);

  const changeLanguage = useCallback(
    async (language: string) => {
      if (!ctx || !info) return;
      try {
        await ctx.setLanguage(language);
        toast.show('Dil güncellendi', 'success');
      } catch {
        toast.show('Dil değiştirilemedi', 'error');
      }
    },
    [ctx, info, toast]
  );

  const runBeautify = useCallback(async (): Promise<void> => {
    if (!ctx || !info || !editToken) return;
    if (beautifying) return;
    setBeautifying(true);
    try {
      const res = await formatCode(
        {
          language: info.language,
          code: ctx.getText(),
          tabWidth: settings.tabSize,
          useTabs: settings.useTabs
        },
        editToken
      );
      const applied = applyFormatted(ctx.view, res.code);
      toast.show(applied ? 'Kod biçimlendirildi' : 'Zaten biçimli', 'success');
    } catch (err) {
      const fmtErr = err as FormatError;
      if (fmtErr.status === 422) {
        const posInfo = fmtErr.line != null ? ` (satır ${fmtErr.line})` : '';
        toast.show(`${fmtErr.message}${posInfo}`, 'error');
      } else {
        toast.show(err instanceof Error ? err.message : 'Biçimlendirme başarısız', 'error');
      }
    } finally {
      setBeautifying(false);
    }
  }, [ctx, info, editToken, beautifying, settings.tabSize, settings.useTabs, toast]);

  const saveVersion = useCallback(async (): Promise<void> => {
    if (!info || !editToken) return;
    const label = window.prompt('Sürüm etiketi (boş bırakılabilir):', '') ?? '';
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Edit-Token': editToken
      };
      const res = await fetch(`/api/pads/${info.padId}/versions`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(label.trim().length > 0 ? { label: label.trim() } : {})
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Sürüm kaydedilemedi');
      }
      toast.show('Sürüm kaydedildi', 'success');
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Sürüm kaydedilemedi', 'error');
    }
  }, [info, editToken, toast]);

  async function copyAll(): Promise<void> {
    if (!ctx) return;
    try {
      await navigator.clipboard.writeText(ctx.getText());
      toast.show('Kod kopyalandı', 'success');
    } catch {
      toast.show('Kopyalanamadı', 'error');
    }
  }

  const onContentChange = useCallback(() => {
    setDirty(true);
    window.setTimeout(() => setDirty(false), 1400);
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="error-page">
        <h2>Düzenleme kapatıldı</h2>
        <p>{error ?? 'Bu düzenleme bağlantısı geçerli değil.'}</p>
        <button className="btn" onClick={() => navigate('/login')}>Giriş yap</button>
      </div>
    );
  }

  return (
    <div className={`pad-page theme-${settings.theme}`}>
      <Toolbar
        left={<span className="pad-title-static">💻 {info.title}</span>}
        center={
          <>
            <LanguagePicker value={info.language} onChange={(id) => void changeLanguage(id)} />
            <button
              className="btn btn-sm"
              onClick={() => void runBeautify()}
              disabled={beautifying || !ctx}
              title="Kodu biçimlendir (Ctrl+Alt+F)"
            >
              {beautifying ? '✨ …' : '✨ Düzenle'}
            </button>
          </>
        }
        right={
          <>
            <button className="btn btn-sm" onClick={() => void copyAll()}>📋 Kopyala</button>
            <button className="btn btn-sm" onClick={() => void saveVersion()} title="Sürüm kaydet (Ctrl+S)">💾</button>
            <button className="btn btn-sm" onClick={() => setShowHelp(true)} title="Kısayollar (F1)">⌨</button>
            <button className="btn btn-sm" onClick={() => setShowSettings((v) => !v)}>⚙</button>
            <ConnectionDot status={status} />
            <PresenceBar presence={presence} selfName={nickname} selfColor={color} />
          </>
        }
      />

      <div className="pad-body">
        <Editor
          padId={info.padId}
          token={editToken}
          readOnly={false}
          initialLanguage={info.language}
          settings={settings}
          displayName={nickname}
          displayColor={color}
          role="editor"
          themeClass={settings.theme}
          actions={{
            onBeautify: () => void runBeautify(),
            onSaveVersion: () => void saveVersion(),
            onHelp: () => setShowHelp(true)
          }}
          onConnectionStatus={setStatus}
          onPresence={setPresence}
          onCursorChange={setCursor}
          onContentChange={onContentChange}
          onReady={setCtx}
          onError={(msg) => toast.show(msg, 'error')}
        />
      </div>

      <StatusBar language={info.language} cursor={cursor} dirty={dirty} />

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