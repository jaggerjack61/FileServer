import { MagnifyingGlassIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useLogout } from '@/hooks/useAuth';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { useSearchParams } from 'react-router-dom';

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useThemeStore();
  const logoutMutation = useLogout();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchValue = searchParams.get('search') || '';

  const handleSearch = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  return (
    <header className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-white dark:border-white/10 dark:bg-slate-900/80 dark:backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors lg:hidden dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-40 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors sm:w-64 md:w-80 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-300 dark:focus:bg-slate-950/80 dark:focus:ring-cyan-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-cyan-300"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <MoonIcon className="h-5 w-5" />
          ) : (
            <SunIcon className="h-5 w-5" />
          )}
        </button>
        <DropdownMenu
          trigger={
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors dark:text-slate-300 dark:hover:bg-white/10">
              <UserCircleIcon className="h-7 w-7 text-gray-400 dark:text-slate-500" />
              <span className="hidden sm:block font-medium">{user?.username}</span>
            </button>
          }
          items={[
            {
              label: user?.email || '',
              onClick: () => {},
              disabled: true,
            },
            {
              label: 'Sign out',
              onClick: () => logoutMutation.mutate(),
              danger: true,
            },
          ]}
        />
      </div>
    </header>
  );
}
