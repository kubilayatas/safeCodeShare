import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { PublicUser } from '@safecodeshare/shared';
import { apiFetch } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PadOwner from './pages/PadOwner';
import PadEdit from './pages/PadEdit';
import PadView from './pages/PadView';
import Course from './pages/Course';
import Embed from './pages/Embed';
import History from './pages/History';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import { ToastProvider } from './components/Toast';

type MeResponse = { user: PublicUser };

export default function App(): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Public rotalarda oturum sorgulamak zorunlu değil ama hata vermemeli.
  const isPublic =
    location.pathname.startsWith('/v/') ||
    location.pathname.startsWith('/e/') ||
    location.pathname.startsWith('/c/') ||
    location.pathname.startsWith('/embed/');

  useEffect(() => {
    let cancelled = false;
    apiFetch<MeResponse>('/api/auth/me')
      .then((r) => {
        if (!cancelled) setUser(r.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // Public rotalarda loading ekranı göstermeden hızlı render
  if (loading && !isPublic) {
    return (
      <div className="app-loading">
        <div className="spinner" aria-label="Yükleniyor" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={setUser} />}
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard user={user} onLogout={() => setUser(null)} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/pad/:id" element={user ? <PadOwner /> : <Navigate to="/login" replace />} />
        <Route path="/pad/:id/history" element={user ? <History /> : <Navigate to="/login" replace />} />
        <Route
          path="/admin"
          element={
            user && user.role === 'admin' ? <Admin /> : <Navigate to={user ? '/dashboard' : '/login'} replace />
          }
        />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/login" replace />} />
        <Route path="/e/:editToken" element={<PadEdit />} />
        <Route path="/v/:viewToken" element={<PadView />} />
        <Route path="/c/:courseViewToken" element={<Course />} />
        <Route path="/embed/:viewToken" element={<Embed />} />
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  );
}