import React, { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout/Layout';
import { LoginScreen } from './components/Auth/LoginScreen';
import { PageSkeleton } from './components/ui/Skeleton';
import { signIn, signOut, getCurrentUser, isSupabaseConfigured } from './lib/supabaseAuth';
import { loginAPI, getSession, clearSession, saveSession } from './lib/authService';

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

// ─── Helper: sync user into Zustand store ──────────────────────────────────
function syncToStore(email: string, nom: string, role: string) {
  useStore.getState().syncSessionUser({ email, role, nom, prenom: '' });
}

// ─── App ────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const { activeSection, currentUser, login } = useStore();
  const setActiveSection = useStore((s) => s.setActiveSection);
  const [ready, setReady] = useState(false);

  // ── 1. On mount: restore session ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Try Supabase session first
      if (isSupabaseConfigured()) {
        const user = await getCurrentUser();
        if (user) {
          syncToStore(user.email, `${user.prenom} ${user.nom}`.trim(), user.role);
          setReady(true);
          return;
        }
      }
      // Try saved API session
      const saved = getSession();
      if (saved) {
        syncToStore(saved.email, saved.nom, saved.role || 'admin');
      }
      setReady(true);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2. Login handler ──────────────────────────────────────────────────────
  const handleLogin = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // A. Supabase (if configured)
    if (isSupabaseConfigured()) {
      const result = await signIn(email, password);
      if (result.success && result.user) {
        syncToStore(result.user.email, `${result.user.prenom} ${result.user.nom}`.trim(), result.user.role);
        return { success: true };
      }
      if (result.error) return { success: false, error: result.error };
    }

    // B. API serverless (Vercel env vars)
    try {
      const apiResult = await loginAPI(email, password);
      if (apiResult.success && apiResult.user) {
        syncToStore(apiResult.user.email, apiResult.user.nom, apiResult.user.role || 'admin');
        return { success: true };
      }
      if (apiResult.error && !apiResult.error.includes('non disponible')) {
        return { success: false, error: apiResult.error };
      }
    } catch {}

    // C. Local store (dev only)
    const storeResult = await login(email, password);
    if (storeResult.success) return { success: true };

    return { success: false, error: 'Email ou mot de passe incorrect.' };
  }, [login]);

  // ── 3. URL hash sync ──────────────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== activeSection && hash in pageMap) setActiveSection(hash);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentUser) window.location.hash = activeSection;
  }, [activeSection, currentUser]);

  useEffect(() => {
    const onPop = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash in pageMap) setActiveSection(hash);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setActiveSection]);

  // ── 4. Render ─────────────────────────────────────────────────────────────
  if (!ready) return <PageSkeleton />;

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  if (currentUser.role === 'freelancer') {
    const allowed = currentUser.permissions as string[];
    if (activeSection === 'freelancer-portal' || !allowed.includes(activeSection)) {
      return <Layout><Suspense fallback={<PageSkeleton />}><FreelancerPortal /></Suspense></Layout>;
    }
  }

  const Page = pageMap[activeSection] || NotFound;
  return <Layout><Suspense fallback={<PageSkeleton />}><Page /></Suspense></Layout>;
};

export default App;
