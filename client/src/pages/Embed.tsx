import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicViewInfo } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import Editor from '../components/Editor';
import ProtectedCodeView from '../components/ProtectedCodeView';
import { loadSettings, type AppSettings } from '../editor/settings';
import { useI18n } from '../i18n';

type LoadError = { code: string; message: string; requiresPassword: boolean };

// /embed/:viewToken — minimal gömme görünümü.
export default function Embed(): JSX.Element {
  const { viewToken } = useParams<{ viewToken: string }>();
  const [info, setInfo] = useState<PublicViewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [settings] = useState<AppSettings>(() => loadSettings());
  const { t } = useI18n();

  useEffect(() => {
    if (!viewToken) return;
    let cancelled = false;
    apiFetch<PublicViewInfo>(`/api/public/view/${viewToken}`)
      .then((r) => {
        if (!cancelled) setInfo(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError({
            code: err.code,
            message: err.message,
            requiresPassword: err.code === 'PASSWORD_REQUIRED'
          });
        } else {
          setError({ code: 'UNKNOWN', message: t('view.loadFailed'), requiresPassword: false });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewToken]);

  if (loading) {
    return (
      <div className="embed-root">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="embed-root embed-error">
        {error?.requiresPassword
          ? t('embed.password')
          : error?.message ?? t('embed.notFound')}
      </div>
    );
  }

  return (
    <div className={`embed-root theme-${settings.theme}`}>
      <div className="embed-header">
        <span className="embed-title">💻 {info.title}</span>
        <a
          className="embed-open"
          href={`/v/${viewToken}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('embed.openFull')}
        </a>
      </div>
      <div className="embed-body">
        {info.protected ? (
          <ProtectedCodeView
            viewToken={viewToken!}
            ocrLevel={info.ocrProtect}
            language={info.language}
            fontSize={settings.fontSize}
            lineWrapping={settings.lineWrapping}
            followEnabled
          />
        ) : (
          <Editor
            padId={info.padId}
            token={viewToken}
            readOnly
            initialLanguage={info.language}
            settings={settings}
            displayName={t('view.viewer')}
            displayColor="#888"
            role="viewer"
            themeClass={settings.theme}
          />
        )}
      </div>
    </div>
  );
}