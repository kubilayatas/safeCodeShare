import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicViewInfo } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import Editor from '../components/Editor';
import ProtectedCodeView from '../components/ProtectedCodeView';
import { loadSettings, type AppSettings } from '../editor/settings';

type LoadError = { code: string; message: string; requiresPassword: boolean };

// /embed/:viewToken — minimal gömme görünümü.
export default function Embed(): JSX.Element {
  const { viewToken } = useParams<{ viewToken: string }>();
  const [info, setInfo] = useState<PublicViewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [settings] = useState<AppSettings>(() => loadSettings());

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
          setError({ code: 'UNKNOWN', message: 'Yüklenemedi', requiresPassword: false });
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
          ? 'Bu kod şifreli. Tam görünümde açın.'
          : error?.message ?? 'Kod bulunamadı.'}
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
          Tam ekran aç ↗
        </a>
      </div>
      <div className="embed-body">
        {info.protected ? (
          <ProtectedCodeView
            viewToken={viewToken!}
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
            displayName="İzleyici"
            displayColor="#888"
            role="viewer"
            themeClass={settings.theme}
          />
        )}
      </div>
    </div>
  );
}