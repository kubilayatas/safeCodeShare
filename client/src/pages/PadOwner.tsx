import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { PadFull } from '@safecodeshare/shared';
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
import ShareDialog from '../components/ShareDialog';
import ShortcutsHelp from '../components/ShortcutsHelp';
import StatusBar from '../components/StatusBar';
import Toolbar from '../components/Toolbar';
import { applyFormatted } from '../editor/applyFormatted';
import { can, useAccount } from '../account';
import { useI18n } from '../i18n';
import { useLangLabel } from '../i18n/LocalePicker';
import { createBroadcastController, type BroadcastController } from '../editor/follow';
import {
  colorForName,
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

export default function PadOwner(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { entitlements: ent } = useAccount();
  const { t } = useI18n();
  const langLabel = useLangLabel();
  const canBeautify = can(ent, 'beautify');
  const canHistory = can(ent, 'versionHistory');

  const [pad, setPad] = useState<PadFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [presence, setPresence] = useState<Presence>({ owners: 0, editors: 0, viewers: 0 });
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(searchParams.get('share') === '1');
  const [showHelp, setShowHelp] = useState(false);
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [ctx, setCtx] = useState<EditorContext | null>(null);
  const [cursor, setCursor] = useState<CursorInfo>(EMPTY_CURSOR);
  const [dirty, setDirty] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [beautifying, setBeautifying] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const dirtyTimer = useRef<number | null>(null);
  const prePresentationFontSize = useRef<number | null>(null);
  const broadcastRef = useRef<BroadcastController | null>(null);

  const nickname = useMemo(
    () =>
      settings.nickname && settings.nickname.trim().length > 0 ? settings.nickname : t('view.teacher'),
    [settings.nickname]
  );
  const color = useMemo(() => colorForName(nickname), [nickname]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    apiFetch<{ pad: PadFull }>(`/api/pads/${id}`)
      .then((r) => {
        if (cancelled) return;
        setPad(r.pad);
        setTitleDraft(r.pad.title);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : t('pad.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!ctx) return;
    const ctrl = createBroadcastController(ctx.view, ctx.awareness);
    broadcastRef.current = ctrl;
    return () => {
      ctrl.destroy();
      broadcastRef.current = null;
    };
  }, [ctx]);

  const toggleBroadcast = useCallback((): void => {
    const ctrl = broadcastRef.current;
    if (!ctrl) return;
    if (ctrl.isEnabled()) {
      ctrl.disable();
      setBroadcasting(false);
      toast.show(t('pad.broadcastStopped'), 'info');
    } else {
      ctrl.enable();
      setBroadcasting(true);
      toast.show(t('pad.broadcastStarted'), 'success');
    }
  }, [toast]);

  const saveVersion = useCallback(async (): Promise<void> => {
    if (!pad) return;
    if (!canHistory) {
      toast.show(t('pad.versionLocked'), 'info');
      return;
    }
    const label = window.prompt(t('pad.versionPrompt'), '') ?? '';
    try {
      await apiFetch(`/api/pads/${pad.id}/versions`, {
        method: 'POST',
        body: label.trim().length > 0 ? { label: label.trim() } : {}
      });
      toast.show(t('pad.versionSaved'), 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('pad.versionFailed');
      toast.show(msg, 'error');
    }
  }, [pad, toast, canHistory]);

  const enterPresentation = useCallback(async (): Promise<void> => {
    if (presentation) return;
    prePresentationFontSize.current = settings.fontSize;
    setPresentation(true);
    setSettings((s) => ({ ...s, fontSize: 24 }));
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {
      /* yut */
    }
  }, [presentation, settings.fontSize]);

  const exitPresentation = useCallback(async (): Promise<void> => {
    if (!presentation) return;
    setPresentation(false);
    if (prePresentationFontSize.current != null) {
      const prev = prePresentationFontSize.current;
      setSettings((s) => ({ ...s, fontSize: prev }));
      prePresentationFontSize.current = null;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* yut */
    }
  }, [presentation]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape' && presentation) void exitPresentation();
    }
    function onFsChange(): void {
      if (!document.fullscreenElement && presentation) void exitPresentation();
    }
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [presentation, exitPresentation]);

  const changeLanguage = useCallback(
    async (language: string) => {
      if (!ctx || !pad) return;
      try {
        await ctx.setLanguage(language);
        const res = await apiFetch<{ pad: PadFull }>(`/api/pads/${pad.id}`, {
          method: 'PATCH',
          body: { language }
        });
        setPad(res.pad);
        toast.show(t('pad.languageChanged'), 'success');
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : t('pad.languageFailed');
        toast.show(msg, 'error');
      }
    },
    [ctx, pad, toast]
  );

  const runBeautify = useCallback(async (): Promise<void> => {
    if (!ctx || !pad) return;
    if (beautifying) return;
    if (!canBeautify) {
      toast.show(t('pad.formatLocked'), 'info');
      return;
    }
    setBeautifying(true);
    try {
      const res = await formatCode({
        language: pad.language,
        code: ctx.getText(),
        tabWidth: settings.tabSize,
        useTabs: settings.useTabs
      });
      const applied = applyFormatted(ctx.view, res.code);
      toast.show(t(applied ? 'pad.formatted' : 'pad.alreadyFormatted'), 'success');
    } catch (err) {
      const fmtErr = err as FormatError;
      if (fmtErr.status === 422) {
        const message =
          fmtErr.line == null
            ? fmtErr.message
            : fmtErr.column != null
              ? t('pad.formatAtLineCol', { message: fmtErr.message, line: fmtErr.line, col: fmtErr.column })
              : t('pad.formatAtLine', { message: fmtErr.message, line: fmtErr.line });
        toast.show(message, 'error');
        if (fmtErr.line != null) {
          try {
            const line = ctx.view.state.doc.line(fmtErr.line);
            const col = Math.max(1, Math.min(fmtErr.column ?? 1, line.length + 1));
            ctx.view.dispatch({
              selection: { anchor: line.from + (col - 1) },
              scrollIntoView: true
            });
            ctx.view.focus();
          } catch {
            /* yut */
          }
        }
      } else {
        toast.show(err instanceof Error ? err.message : t('pad.formatFailed'), 'error');
      }
    } finally {
      setBeautifying(false);
    }
  }, [ctx, pad, beautifying, canBeautify, settings.tabSize, settings.useTabs, toast]);

  async function saveTitle(): Promise<void> {
    if (!pad) return;
    const nextTitle = titleDraft.trim();
    if (nextTitle.length === 0 || nextTitle === pad.title) {
      setTitleEdit(false);
      setTitleDraft(pad.title);
      return;
    }
    try {
      const res = await apiFetch<{ pad: PadFull }>(`/api/pads/${pad.id}`, {
        method: 'PATCH',
        body: { title: nextTitle }
      });
      setPad(res.pad);
      setTitleEdit(false);
      toast.show(t('pad.titleSaved'), 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('pad.titleFailed');
      toast.show(msg, 'error');
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
    if (!pad) return;
    window.location.href = `/api/pads/${pad.id}/download`;
  }

  const onContentChange = useCallback(() => {
    setDirty(true);
    if (dirtyTimer.current) window.clearTimeout(dirtyTimer.current);
    dirtyTimer.current = window.setTimeout(() => setDirty(false), 1400);
  }, []);

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
        <h2>{t('common.error')}</h2>
        <p>{error ?? t('pad.notFound')}</p>
        <button className="btn" onClick={() => navigate('/dashboard')}>{t('pad.backToDashboard')}</button>
      </div>
    );
  }

  const publicUrl = window.location.origin;

  return (
    <div className={`pad-page theme-${settings.theme} ${presentation ? 'presentation' : ''}`}>
      {!presentation && (
        <Toolbar
          left={
            <>
              <button className="btn btn-sm" onClick={() => navigate('/dashboard')}>{t('pad.back')}</button>
              {titleEdit ? (
                <input
                  className="input pad-title-input"
                  value={titleDraft}
                  autoFocus
                  maxLength={120}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={() => void saveTitle()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveTitle();
                    if (e.key === 'Escape') {
                      setTitleEdit(false);
                      setTitleDraft(pad.title);
                    }
                  }}
                />
              ) : (
                <button className="btn btn-sm" onClick={() => setTitleEdit(true)} title={t('pad.editTitle')}>
                  {pad.title} ✎
                </button>
              )}
            </>
          }
          center={
            <>
              <LanguagePicker value={pad.language} onChange={(id) => void changeLanguage(id)} />
              <button
                className="btn btn-sm"
                onClick={() => void runBeautify()}
                disabled={beautifying || !ctx || !canBeautify}
                title={t(canBeautify ? 'pad.formatTitle' : 'pad.formatLocked')}
              >
                {t(beautifying ? 'pad.formatting' : 'pad.format')}
              </button>
            </>
          }
          right={
            <>
              <button className="btn btn-sm" onClick={() => setShowShare(true)}>{t('pad.share')}</button>
              <button
                className={`btn btn-sm ${broadcasting ? 'btn-primary' : ''}`}
                onClick={toggleBroadcast}
                title={t(broadcasting ? 'pad.broadcastTitleOn' : 'pad.broadcastTitleOff')}
              >
                {t(broadcasting ? 'pad.broadcastOn' : 'pad.broadcast')}
              </button>
              <button
                className="btn btn-sm"
                onClick={() => window.open(`/v/${pad.viewToken}`, '_blank', 'noopener')}
                title={t('pad.studentView')}
                aria-label={t('pad.studentView')}
              >
                👁
              </button>
              <button
                className="btn btn-sm"
                onClick={() => navigate(`/pad/${pad.id}/history`)}
                disabled={!canHistory}
                title={t(canHistory ? 'pad.historyTitle' : 'pad.historyLocked')}
              >
                {t('pad.history')}
              </button>
              <button className="btn btn-sm" onClick={() => void copyAll()} title={t('pad.copyAll')} aria-label={t('pad.copyAll')}>📋</button>
              <button className="btn btn-sm" onClick={download} title={t('pad.download')} aria-label={t('pad.download')}>⬇</button>
              <button className="btn btn-sm" onClick={() => void enterPresentation()} title={t('pad.present')} aria-label={t('pad.present')}>🎬</button>
              <button className="btn btn-sm" onClick={() => setShowHelp(true)} title={t('pad.shortcuts')} aria-label={t('pad.shortcuts')}>⌨</button>
              <button className="btn btn-sm" onClick={() => setShowSettings((v) => !v)} title={t('pad.settings')} aria-label={t('pad.settings')}>⚙</button>
              <ConnectionDot status={status} />
              <PresenceBar presence={presence} selfName={nickname} selfColor={color} />
            </>
          }
        />
      )}

      <div className="pad-body">
        <Editor
          padId={pad.id}
          readOnly={false}
          initialLanguage={pad.language}
          settings={settings}
          displayName={nickname}
          displayColor={color}
          role="owner"
          themeClass={settings.theme}
          actions={{
            onBeautify: () => void runBeautify(),
            onSaveVersion: () => void saveVersion(),
            onHelp: () => setShowHelp(true),
            onTogglePresentation: () => {
              if (presentation) void exitPresentation();
              else void enterPresentation();
            }
          }}
          onConnectionStatus={setStatus}
          onPresence={setPresence}
          onCursorChange={setCursor}
          onContentChange={onContentChange}
          onReady={setCtx}
          onError={() => toast.show(t('view.unavailable'), 'error')}
        />
      </div>

      <StatusBar language={pad.language} cursor={cursor} dirty={dirty} />

      <SettingsPanel
        open={showSettings && !presentation}
        settings={settings}
        onChange={setSettings}
        onClose={() => setShowSettings(false)}
        showNickname={false}
      />

      <ShareDialog
        open={showShare}
        pad={pad}
        publicUrl={publicUrl}
        onClose={() => setShowShare(false)}
        onPadChange={(p) => setPad(p)}
      />

      <ShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />

      {presentation && (
        <button
          className="presentation-exit"
          onClick={() => void exitPresentation()}
          title={t('pad.exitPresentationTitle')}
        >
          {t('pad.exitPresentation')}
        </button>
      )}

      <div className="sr-only" aria-live="polite">
        {langLabel(pad.language)}, {t(status === 'connected' ? 'conn.connected' : status === 'connecting' ? 'conn.connecting' : 'conn.disconnected')}
        {broadcasting ? `, ${t('pad.broadcastingSr')}` : ''}
      </div>
    </div>
  );
}