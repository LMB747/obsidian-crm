import React, { lazy, Suspense } from 'react';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout/Layout';
import { LoginScreen } from './components/Auth/LoginScreen';
import { FirstRunSetup } from './components/Auth/FirstRunSetup';
import { PageSkeleton } from './components/ui/Skeleton';

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
  settings:            Settings,
  admin:               Admin,
  'freelancer-portal': FreelancerPortal,
};

const App: React.FC = () => {
  const { activeSection, currentUser, login, setupComplete, completeSetup } = useStore();

  // Premier lancement → configuration initiale
  if (!setupComplete) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <FirstRunSetup onSetup={completeSetup} />
      </Suspense>
    );
  }

  // Si pas connecté → écran de login
  if (!currentUser) {
    return <LoginScreen onLogin={login} />;
  }

  // Si freelancer → portail limité (sauf si section autorisée dans permissions)
  if (currentUser.role === 'freelancer') {
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

  const Page = pageMap[activeSection] || Dashboard;
  return (
    <Layout>
      <Suspense fallback={<PageSkeleton />}>
        <Page />
      </Suspense>
    </Layout>
  );
};

export default App;
