import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useExplorer } from './store/use-explorer';
import Shell from '../presentation/components/layout/Shell';
import ErrorBoundary from '../presentation/components/common/ErrorBoundary';
const Landing = lazy(() => import('../presentation/pages/Landing'));
const Explore = lazy(() => import('../presentation/pages/Explore'));
const Saved = lazy(() => import('../presentation/pages/Saved'));
const About = lazy(() => import('../presentation/pages/About'));
const Settings = lazy(() => import('../presentation/pages/Settings'));
function WorkspaceLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}
export default function App() {
  const theme = useExplorer((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="page-skeleton" role="status">
            Preparing SkySafe…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<WorkspaceLayout />}>
            <Route path="/explore" element={<Explore />} />
            <Route path="/checker" element={<Explore checker />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
