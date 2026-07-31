import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';

// Lazy-loaded pages
const LandingPage = lazy(() => import('@/features/auth/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const FileBrowserPage = lazy(() => import('@/features/files/FileBrowserPage').then(m => ({ default: m.FileBrowserPage })));
const TrashPage = lazy(() => import('@/features/files/TrashPage').then(m => ({ default: m.TrashPage })));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ApiKeysPage = lazy(() => import('@/features/apikeys/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const AdminDashboard = lazy(() => import('@/features/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const TenantsPage = lazy(() => import('@/features/admin/TenantsPage').then(m => ({ default: m.TenantsPage })));
const TenantDetailPage = lazy(() => import('@/features/admin/TenantDetailPage').then(m => ({ default: m.TenantDetailPage })));
const AdminApiKeysPage = lazy(() => import('@/features/admin/AdminApiKeysPage').then(m => ({ default: m.AdminApiKeysPage })));
const ActivityLogPage = lazy(() => import('@/features/admin/ActivityLogPage').then(m => ({ default: m.ActivityLogPage })));
const OfficeEditorPage = lazy(() => import('@/features/files/OfficeEditorPage').then(m => ({ default: m.OfficeEditorPage })));

function SuspenseWrapper({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>}>
      {children}
    </Suspense>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuthStore.getState();
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  if (!user?.is_superuser) {
    return <Navigate to="/files" replace />;
  }
  return <>{children}</>;
}

function TenantRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { accessToken, user } = useAuthStore.getState();
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  // Older saved sessions may not have the tenant status field. Treat an
  // omitted status as active and let the API enforce the authoritative value;
  // an explicitly inactive or missing tenant still cannot enter the workspace.
  if (!user?.tenant || user.tenant.is_active === false) {
    return <Navigate to={user?.is_superuser ? '/admin' : '/'} replace />;
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/files" replace />;
  }
  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { accessToken: token, user } = useAuthStore.getState();
  if (token) {
    return <Navigate to={user?.is_superuser && !user.tenant ? '/admin' : '/files'} replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SuspenseWrapper><LandingPage /></SuspenseWrapper>,
  },
  {
    path: '/login',
    element: (
      <GuestRoute>
        <SuspenseWrapper><LoginPage /></SuspenseWrapper>
      </GuestRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <GuestRoute>
        <SuspenseWrapper><RegisterPage /></SuspenseWrapper>
      </GuestRoute>
    ),
  },
  {
    path: '/office/:fileId',
    element: (
      <TenantRoute>
        <SuspenseWrapper><OfficeEditorPage /></SuspenseWrapper>
      </TenantRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'files', element: <TenantRoute><SuspenseWrapper><FileBrowserPage /></SuspenseWrapper></TenantRoute> },
      { path: 'trash', element: <TenantRoute><SuspenseWrapper><TrashPage /></SuspenseWrapper></TenantRoute> },
      { path: 'dashboard', element: <AdminRoute><SuspenseWrapper><DashboardPage /></SuspenseWrapper></AdminRoute> },
      { path: 'api-keys', element: <TenantRoute adminOnly><SuspenseWrapper><ApiKeysPage /></SuspenseWrapper></TenantRoute> },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <SuspenseWrapper><AdminDashboard /></SuspenseWrapper>
          </AdminRoute>
        ),
      },
      {
        path: 'admin/tenants',
        element: (
          <AdminRoute>
            <SuspenseWrapper><TenantsPage /></SuspenseWrapper>
          </AdminRoute>
        ),
      },
      {
        path: 'admin/tenants/:id',
        element: (
          <AdminRoute>
            <SuspenseWrapper><TenantDetailPage /></SuspenseWrapper>
          </AdminRoute>
        ),
      },
      {
        path: 'admin/api-keys',
        element: (
          <AdminRoute>
            <SuspenseWrapper><AdminApiKeysPage /></SuspenseWrapper>
          </AdminRoute>
        ),
      },
      {
        path: 'admin/activity',
        element: (
          <AdminRoute>
            <SuspenseWrapper><ActivityLogPage /></SuspenseWrapper>
          </AdminRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
