import { NavLink } from 'react-router-dom';
import {
  FolderIcon,
  KeyIcon,
  ShieldCheckIcon,
  ServerStackIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  TrashIcon,
  ClockIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { StorageBar } from '@/components/ui/StorageBar';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/files', label: 'My Files', icon: FolderIcon },
  { to: '/trash', label: 'Trash', icon: TrashIcon },
  { to: '/api-keys', label: 'API Keys', icon: KeyIcon },
];

const adminItems = [
  { to: '/admin', label: 'Dashboard', icon: ServerStackIcon },
  { to: '/admin/tenants', label: 'Tenants', icon: BuildingOfficeIcon },
  { to: '/admin/api-keys', label: 'API Keys', icon: ShieldCheckIcon },
  { to: '/admin/activity', label: 'Activity Log', icon: ClockIcon },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.is_superuser === true;

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-white/10 dark:bg-slate-900/80',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <ServerStackIcon className="h-7 w-7 text-blue-600 dark:text-cyan-300" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">FileServer</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
        >
          {collapsed ? (
            <ChevronDoubleRightIcon className="h-5 w-5" />
          ) : (
            <ChevronDoubleLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-cyan-300/10 dark:text-cyan-300'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-1 px-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Admin
                </p>
              </div>
            )}
            {collapsed && <div className="border-t border-gray-200 my-2 dark:border-white/10" />}
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-cyan-300/10 dark:text-cyan-300'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Storage & Tenant Info */}
      {!collapsed && user?.tenant && (
        <div className="border-t border-gray-200 p-4 space-y-3 dark:border-white/10">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-slate-500">
              Tenant
            </p>
            <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
              {user.tenant.name}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 dark:text-slate-500">
              Storage
            </p>
            <StorageBar
              used={user.tenant.storage_used}
              quota={user.tenant.storage_quota}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
