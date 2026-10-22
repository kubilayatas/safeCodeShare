import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import type { MeResponse } from '@safecodeshare/shared';
import { apiFetch } from './api';
import { AccountProvider, useAccount } from './account';
import { applyUiTheme, loadSettings } from './editor/settings';
import Login from './pages/Login';
import Register from './pages/Register';
import Plans from './pages/Plans';
import Terms from './pages/Terms';
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
import { I18nProvider, detectInitialLocale } from './i18n';

export default function App(): JSX.Element {
  const [initial, setInitial] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyUiTheme(loadSettings().uiTheme);
    let cancelled = false;
    // Öğrenci sayfaları oturum gerektirmez; 401 normaldir.
    apiFetch<MeResponse>('/api/auth/me')
      .then((r) => !cancelled && setInitial(r))
      .catch(() => !cancelled && setInitial(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  return (
    <I18nProvider initial={detectInitialLocale(initial?.user.locale)}>
      <AccountProvider initial={initial}>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AccountProvider>
    </I18nProvider>
  );
}

function RequireUser({ children, admin = false }: { children: ReactNode; admin?: boolean }): JSX.Element {
  const { user } = useAccount();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes(): JSX.Element {
  const { user } = useAccount();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/plans" element={<Plans />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/dashboard" element={<RequireUser><Dashboard /></RequireUser>} />
      <Route path="/pad/:id" element={<RequireUser><PadOwner /></RequireUser>} />
      <Route path="/pad/:id/history" element={<RequireUser><History /></RequireUser>} />
      <Route path="/admin" element={<RequireUser admin><Admin /></RequireUser>} />
      <Route path="/profile" element={<RequireUser><Profile /></RequireUser>} />
      <Route path="/e/:editToken" element={<PadEdit />} />
      <Route path="/v/:viewToken" element={<PadView />} />
      <Route path="/c/:courseViewToken" element={<Course />} />
      <Route path="/embed/:viewToken" element={<Embed />} />
      <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
