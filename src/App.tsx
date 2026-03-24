import React, { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout/Layout';
import { LoginScreen } from './components/Auth/LoginScreen';
import { FirstRunSetup } from './components/Auth/FirstRunSetup';
import { PageSkeleton } from './components/ui/Skeleton';
import { loginAPI, getSession, clearSession, type SessionUser } from './lib/authService';
import { signIn, signOut, getCurrentUser, onAuthStateChange, isSupabaseConfigured, type UserProfile } from './lib/supabaseAuth';

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
  const { activeSection, currentUser, login, setupComplete, completeSetup } = useStore();
  const setActiveSection = useStore((s) => s.setActiveSection);
  // ── Auth: Supabase → API fallback → Local store ────────────────────────────
  const [supabaseUser, setSupabaseUser] = useState<UserProfile | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(() => getSession());
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured());

  // Check Supabase session on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) { setAuthLoading(false); return; }
    getCurrentUser().then(user => {
      setSupabaseUser(user);
      setAuthLoading(false);
    });
    const { unsubscribe } = onAuthStateChange((authUser) => {
      if (!authUser) { setSupabaseUser(null); return; }
      getCurrentUser().then(setSupabaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Combined auth: Supabase OR API session OR store-based currentUser
  const isLoggedIn = !!supabaseUser || !!sessionUser || !!currentUser;

  // Unified login: Supabase → API → Local store
  const handleLogin = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Try Supabase auth (real database)
    if (isSupabaseConfigured()) {
      const result = await signIn(email, password);
      if (result.success && result.user) {
        setSupabaseUser(result.user);
        return { success: true };
      }
      // If Supabase is configured but login failed, return the error (don't fallback)
      return { success: false, error: result.error };
    }

    // 2. Try API-based login (Vercel env vars)
    const apiResult = await loginAPI(email, password);
    if (apiResult.success && apiResult.user) {
      setSessionUser(apiResult.user);
      return { success: true };
    }

    // 3. Fallback: local store (dev only)
    const storeResult = await login(email, password);
    if (storeResult.success) return { success: true };

    return { success: false, error: apiResult.error || storeResult.error || 'Identifiants incorrects.' };
  }, [login]);

  // Logout clears everything
  const handleLogout = useCallback(async () => {
    if (isSupabaseConfigured()) await signOut();
    clearSession();
    setSessionUser(null);
    setSupabaseUser(null);
    useStore.getState().logout();
  }, []);

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

  // Attendre que l'auth soit prête
  if (authLoading) {
    return <PageSkeleton />;
  }

  // Setup uniquement via URL #setup
  const [showSetup, setShowSetup] = useState(() => window.location.hash === '#setup');

  if (showSetup && !setupComplete) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <FirstRunSetup onSetup={(data) => { completeSetup(data); setShowSetup(false); }} />
      </Suspense>
    );
  }

  // Si pas connecté → login
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
