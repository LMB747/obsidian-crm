import React, { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout/Layout';
import { LoginScreen } from './components/Auth/LoginScreen';
import { PageSkeleton } from './components/ui/Skeleton';
import { loginAPI, getSession, clearSession } from './lib/authService';

const Dashboard       = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Clients         = lazy(() => import('./pages/Clients').then(m => ({ default: m.Clients })));
const Freelancers     = lazy(() => import('./pages/Freelancers').then(m => ({ default: m.Freelancers })));
const Projects        = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const WorkTracking    = lazy(() => import('./pages/WorkTracking').then(m => ({ default: m.WorkTracking })));
const Invoices        = lazy(() => import('./pages/Invoices').then(m => ({ default: m.Invoices })));
const Documents       = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const PayToSnooze     = lazy(() => import('./pages/PayToSnooze').then(m => ({ default: m.PayToSnooze })));
const Analytics       = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const MediaBuying     = lazy(() => import('./pages/MediaBuying').then(m => ({ default: m.MediaBuying })));
const Settings        = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Admin           = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const FreelancerPortal = lazy(() => import('./pages/FreelancerPortal').then(m => ({ default: m.FreelancerPortal })));
const ProspectionCRM  = lazy(() => import('./pages/ProspectionCRM').then(m => ({ default: m.ProspectionCRM })));
const CalendarPage    = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const NotFound        = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

const pageMap: Record<string, React.ComponentType> = {
  dashboard:           Dashboard,
  clients:             Clients,
  freelancers:         Freelancers,
  projects:            Projects,
  worktracking:        WorkTracking,
  invoices:            Invoices,
  documents:           Documents,
  snooze:              PayToSnooze,
  analytics:           Analytics,
  'media-buying':      MediaBuying,
  prospection:         ProspectionCRM,
  calendar:            CalendarPage,
  settings:            Settings,
  admin:               Admin,
  'freelancer-portal': FreelancerPortal,
};

const App: React.FC = () => {
  const { activeSection, currentUser, login } = useStore();
  const setActiveSection = useStore((s) => s.setActiveSection);

  // ── Restore session on mount ──────────────────────────────────────────────
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If no currentUser in store, check for saved API session
    if (!currentUser) {
      const saved = getSession();
      if (saved) {
        useStore.getState().syncSessionUser({
          email: saved.email,
          role: saved.role || 'admin',
          nom: saved.nom || '',
          prenom: '',
        });
      }
    }
    setReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isLoggedIn = !!currentUser;

  // ── Login: API first → local store fallback ───────────────────────────────
  const handleLogin = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Try API (Vercel serverless)
    const apiResult = await loginAPI(email, password);
    if (apiResult.success && apiResult.user) {
      useStore.getState().syncSessionUser({
        email: apiResult.user.email,
        role: apiResult.user.role || 'admin',
        nom: apiResult.user.nom || '',
        prenom: '',
      });
      return { success: true };
    }

    // Fallback: local store (dev)
    const storeResult = await login(email, password);
    if (storeResult.success) return { success: true };

    return { success: false, error: apiResult.error || storeResult.error || 'Identifiants incorrects.' };
  }, [login]);

  // Sync URL hash ↔ activeSection
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== activeSection && hash in pageMap) {
      setActiveSection(hash);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoggedIn) window.location.hash = activeSection;
  }, [activeSection, isLoggedIn]);

  useEffect(() => {
    const onPopState = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash in pageMap) {
        setActiveSection(hash);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setActiveSection]);

  // ── Rendering ──────────────────────────────────────────────────────────────

  if (!ready) return <PageSkeleton />;

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Si freelancer → portail limité (sauf si section autorisée dans permissions)
  if (currentUser?.role === 'freelancer') {
    const allowedSections = currentUser.permissions as string[];
    if (
      activeSection === 'freelancer-portal' ||
      !allowedSections.includes(activeSection)
    ) {
      return (
        <Layout>
          <Suspense fallback={<PageSkeleton />}>
            <FreelancerPortal />
          </Suspense>
        </Layout>
      );
    }
  }

  const Page = pageMap[activeSection] || NotFound;
  return (
    <Layout>
      <Suspense fallback={<PageSkeleton />}>
        <Page />
      </Suspense>
    </Layout>
  );
};

export default App;
