import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PublicCourseInfo } from '@safecodeshare/shared';
import { languageLabel } from '@safecodeshare/shared';
import { apiFetch, ApiError } from '../api';
import AdBanner from '../components/AdBanner';

type LoadError = { code: string; message: string; status: number };

function relative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'az önce';
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.floor(h / 24);
  return `${d} gün önce`;
}

export default function Course(): JSX.Element {
  const { courseViewToken } = useParams<{ courseViewToken: string }>();
  const [data, setData] = useState<PublicCourseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [q, setQ] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const load = async (): Promise<void> => {
    if (!courseViewToken) return;
    try {
      const r = await apiFetch<PublicCourseInfo>(`/api/public/course/${courseViewToken}`);
      setData(r);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError({ code: err.code, message: err.message, status: err.status });
      } else {
        setError({ code: 'UNKNOWN', message: 'Yüklenemedi', status: 0 });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const t = window.setInterval(() => {
      void load();
    }, 60_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseViewToken]);

  const filtered = useMemo(() => {
    if (!data) return { topics: [], loosePads: [] };
    const needle = q.trim().toLowerCase();
    if (!needle) return { topics: data.topics, loosePads: data.loosePads };
    const t = data.topics
      .map((topic) => ({
        title: topic.title,
        pads: topic.pads.filter((p) => p.title.toLowerCase().includes(needle))
      }))
      .filter((topic) => topic.pads.length > 0 || topic.title.toLowerCase().includes(needle));
    const loose = data.loosePads.filter((p) => p.title.toLowerCase().includes(needle));
    return { topics: t, loosePads: loose };
  }, [data, q]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    if (error.code === 'PAGE_DISABLED') {
      return (
        <div className="public-gate">
          <div className="public-card">
            <h2>Bu ders sayfası kapalı</h2>
            <p className="muted">Öğretmen bu sayfayı geçici olarak kapatmış olabilir.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="public-gate">
        <div className="public-card">
          <h2>Erişilemiyor</h2>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="app-loading"><div className="spinner" /></div>;

  const total = filtered.topics.reduce((n, t) => n + t.pads.length, 0) + filtered.loosePads.length;

  return (
    <div className={`course-page ${theme === 'dark' ? 'theme-onedark' : 'theme-notepad'}`}>
      <header className="course-header">
        <div className="course-title-wrap">
          <h1>{data.course.title}</h1>
          {data.course.description && <p className="muted">{data.course.description}</p>}
        </div>
        <div className="course-header-actions">
          <input
            className="input"
            placeholder="Kod ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="btn btn-sm"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title="Tema değiştir"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <p className="muted course-summary">{total} kod görüntüleniyor · her 60 saniyede bir yenilenir</p>

      <AdBanner className="course-ad-banner" format="auto" />

      {filtered.topics.map((topic) => (
        <section key={topic.title} className="course-section">
          <h2>📝 {topic.title}</h2>
          {topic.pads.length === 0 ? (
            <p className="muted">Bu konuda görünür kod yok.</p>
          ) : (
            <ul className="course-list">
              {topic.pads.map((p) => (
                <li key={p.viewToken} className="course-item">
                  <Link to={`/v/${p.viewToken}`} className="course-item-title">
                    {p.copyProtect && <span title="Kopyalama korumalı">🛡 </span>}
                    {p.hasPassword && <span title="Şifreli">🔒 </span>}
                    {p.title}
                  </Link>
                  <span className="muted">
                    {languageLabel(p.language)} · {p.lineCount} satır · {relative(p.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {filtered.loosePads.length > 0 && (
        <section className="course-section">
          <h2>📂 Konusuz kodlar</h2>
          <ul className="course-list">
            {filtered.loosePads.map((p) => (
              <li key={p.viewToken} className="course-item">
                <Link to={`/v/${p.viewToken}`} className="course-item-title">
                  {p.copyProtect && <span title="Kopyalama korumalı">🛡 </span>}
                  {p.hasPassword && <span title="Şifreli">🔒 </span>}
                  {p.title}
                </Link>
                <span className="muted">
                  {languageLabel(p.language)} · {p.lineCount} satır · {relative(p.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {filtered.topics.length === 0 && filtered.loosePads.length === 0 && (
        <p className="muted">Sonuç yok.</p>
      )}
    </div>
  );
}