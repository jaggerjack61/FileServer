import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useCurrentUser } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser, setUser]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.06),_transparent_40%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.05),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]">
      {mobileSidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => {
            setMobileSidebarOpen(false);
            setSidebarCollapsed(!sidebarCollapsed);
          }}
          onNavigate={() => setMobileSidebarOpen(false)}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
