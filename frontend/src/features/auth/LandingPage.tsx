import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  CloudArrowUpIcon,
  FolderIcon,
  KeyIcon,
  ShieldCheckIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '@/stores/authStore';

const highlights = [
  {
    name: 'Structured storage',
    description: 'Keep every tenant, folder, and file organized without losing access control clarity.',
    icon: FolderIcon,
  },
  {
    name: 'Secure sharing',
    description: 'Use scoped API keys, protected endpoints, and isolated tenant data by default.',
    icon: ShieldCheckIcon,
  },
  {
    name: 'Fast ingestion',
    description: 'Upload, move, preview, and manage files from one dashboard built for operational teams.',
    icon: CloudArrowUpIcon,
  },
];

const stats = [
  { value: 'Tenant-aware', label: 'Built for isolated workspaces and admin oversight' },
  { value: 'API-first', label: 'Automation-ready access with managed keys' },
  { value: 'End-to-end', label: 'From upload to trash recovery in one flow' },
];

export function LandingPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const primaryHref = accessToken ? '/files' : '/register';
  const secondaryHref = accessToken ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.16),_transparent_25%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between py-4">
          <Link to="/" className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.24em] text-slate-100 uppercase">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
              <ServerStackIcon className="h-6 w-6 text-cyan-300" />
            </span>
            FileServer
          </Link>

          <div className="flex items-center gap-3">
            {!accessToken && (
              <Link
                to="/login"
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/5"
              >
                Sign in
              </Link>
            )}
            <Link
              to={primaryHref}
              className="inline-flex items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300 px-5 py-2 text-sm font-medium text-slate-950 shadow-[0_16px_40px_rgba(103,232,249,0.22)] transition hover:bg-cyan-200"
            >
              {accessToken ? 'Open workspace' : 'Start free'}
            </Link>
          </div>
        </header>

        <main className="flex flex-1 items-center py-12 lg:py-20">
          <div className="grid w-full gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] lg:items-center">
            <section>
              <div className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                File operations with tenant isolation
              </div>
              <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
                One place to store, govern, and move the files your team depends on.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                FileServer combines secure authentication, folder-aware organization, and admin visibility in a workspace that feels fast enough for everyday operations.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  to={primaryHref}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300 px-7 py-3 text-base font-medium text-slate-950 shadow-[0_20px_45px_rgba(34,211,238,0.2)] transition hover:bg-cyan-200 sm:w-auto"
                >
                  {accessToken ? 'Go to files' : 'Create an account'}
                  <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <Link
                  to={secondaryHref}
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3 text-base font-medium text-slate-100 backdrop-blur transition hover:bg-white/10 sm:w-auto"
                >
                  {accessToken ? 'Open dashboard' : 'Sign in'}
                </Link>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.value} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <p className="text-2xl font-semibold text-white">{stat.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{stat.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-cyan-300/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-8">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-cyan-200">Workspace pulse</p>
                    <h2 className="mt-3 text-2xl font-semibold text-white">Operate files without losing control.</h2>
                  </div>
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                    Protected
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  {highlights.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.name} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                        <div className="flex items-start gap-4">
                          <div className="mt-1 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3">
                            <Icon className="h-6 w-6 text-cyan-200" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-white">{item.name}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <div className="flex items-center gap-3 text-sm font-medium text-slate-200">
                    <KeyIcon className="h-5 w-5 text-cyan-200" />
                    Automation stays first-class
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Provision API keys for integrations, keep admin actions visible, and move from manual uploads to repeatable workflows without splitting your tooling.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}