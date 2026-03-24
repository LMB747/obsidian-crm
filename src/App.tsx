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
const PersonalSpace   = lazy(() => import('./pages/PersonalSpace').then(m => ({ default: m.PersonalSpace })));
const ClientPortal    = lazy(() => import('./pages/ClientPortal'));
const Proposals        = lazy(() => import('./pages/Proposals'));
const DealPipeline    = lazy(() => import('./pages/DealPipeline'));
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
  personal:            PersonalSpace,
  settings:            Settings,
  admin:               Admin,
  'freelancer-portal': FreelancerPortal,
  'client-portal': ClientPortal,
  'proposals': Proposals,
  'pipeline': DealPipeline,
};

// ─── Helper: sync user into Zustand store ──────────────────────────────────
function syncToStore(opts: { id?: string; email: string; nom: string; prenom: string; role: string; permissions?: string[] }) {
  useStore.getState().syncSessionUser(opts);
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
          syncToStore({ id: user.id, email: user.email, nom: user.nom || '', prenom: user.prenom || '', role: user.role, permissions: user.permissions });
          setReady(true);
          return;
        }
      }
      // Try saved API session
      const saved = getSession();
      if (saved) {
        syncToStore({ email: saved.email, nom: saved.nom || '', prenom: '', role: saved.role || 'admin' });
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
        syncToStore({ id: result.user.id, email: result.user.email, nom: result.user.nom || '', prenom: result.user.prenom || '', role: result.user.role, permissions: result.user.permissions });
        useStore.getState()._audit('login', undefined, `Connexion Supabase — ${result.user.email}`);
        return { success: true };
      }
      if (result.error) return { success: false, error: result.error };
    }

    // B. API serverless (Vercel env vars)
    try {
      const apiResult = await loginAPI(email, password);
      if (apiResult.success && apiResult.user) {
        syncToStore({ email: apiResult.user.email, nom: apiResult.user.nom || '', prenom: '', role: apiResult.user.role || 'admin' });
        useStore.getState()._audit('login', undefined, `Connexion API — ${apiResult.user.email}`);
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
    // Support client-portal/TOKEN format
    const section = hash.startsWith('client-portal') ? 'client-portal' : hash;
    if (section && section !== activeSection && section in pageMap) setActiveSection(section);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentUser) window.location.hash = activeSection;
  }, [activeSection, currentUser]);

  useEffect(() => {
    const onPop = () => {
      const hash = window.location.hash.replace('#', '');
      const section = hash.startsWith('client-portal') ? 'client-portal' : hash;
      if (section && section in pageMap) setActiveSection(section);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setActiveSection]);

  // ── 4. Render ─────────────────────────────────────────────────────────────
  if (!ready) return <PageSkeleton />;

  // Client portal is accessible without authentication
  if (activeSection === 'client-portal') {
    return <Suspense fallback={<PageSkeleton />}><ClientPortal /></Suspense>;
  }

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  // ── Permission guard: enforce for ALL roles ────────────────────────────
  const userPermissions = (currentUser.permissions || []) as string[];

  // Admin section: admin role only
  if (activeSection === 'admin' && currentUser.role !== 'admin') {
    return <Layout><Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense></Layout>;
  }

  // Freelancer portal shortcut
  if (currentUser.role === 'freelancer' && activeSection === 'freelancer-portal') {
    return <Layout><Suspense fallback={<PageSkeleton />}><FreelancerPortal /></Suspense></Layout>;
  }

  // Check section permission for non-admin users
  if (currentUser.role !== 'admin' && !userPermissions.includes(activeSection)) {
    // Redirect to dashboard (or freelancer portal) if unauthorized
    if (currentUser.role === 'freelancer') {
      return <Layout><Suspense fallback={<PageSkeleton />}><FreelancerPortal /></Suspense></Layout>;
    }
    return <Layout><Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense></Layout>;
  }

  const Page = pageMap[activeSection] || NotFound;
  return <Layout><Suspense fallback={<PageSkeleton />}><Page /></Suspense></Layout>;
};

export default App;
