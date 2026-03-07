import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  CloudArrowUpIcon,
  FolderIcon,
  KeyIcon,
  ShieldCheckIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';

const highlights = [
  {
    title: 'Tenant-aware structure',
    description: 'Separate workspaces, clear ownership, and admin oversight without extra tooling.',
    icon: FolderIcon,
  },
  {
    title: 'Protected access',
    description: 'Authentication, scoped API access, and guarded admin actions stay built in.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Operational speed',
    description: 'Move from upload to retrieval quickly without losing the paper trail.',
    icon: CloudArrowUpIcon,
  },
];

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  footerPrompt: string;
  footerLinkLabel: string;
  footerHref: string;
  children: ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  footerPrompt,
  footerLinkLabel,
  footerHref,
  children,
}: AuthShellProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.16),_transparent_25%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(2,6,23,1))]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between py-4">
          <Link to="/" className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-100">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur">
              <ServerStackIcon className="h-6 w-6 text-cyan-300" />
            </span>
            FileServer
          </Link>

          <Link
            to="/"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur transition hover:border-cyan-300/40 hover:bg-white/10"
          >
            View home
          </Link>
        </header>

        <main className="flex flex-1 items-center py-8 lg:py-16">
          <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)] lg:items-center">
            <section className="order-2 lg:order-1 lg:pr-8">
              <div className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
                Secure file operations
              </div>
              <h2 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Access the same workspace experience the landing page promises.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Sign in or create an account to manage folders, files, API keys, and tenant activity from one controlled interface.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {highlights.map((highlight) => {
                  const Icon = highlight.icon;
                  return (
                    <div key={highlight.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
                        <Icon className="h-5 w-5 text-cyan-200" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-white">{highlight.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{highlight.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/35 p-5 backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
                  <KeyIcon className="h-5 w-5 text-cyan-200" />
                </div>
                <p className="text-sm leading-6 text-slate-300">
                  Automation-ready access remains first-class, with managed API keys and clean tenant boundaries from the start.
                </p>
              </div>
            </section>

            <section className="order-1 lg:order-2">
              <div className="absolute right-0 top-24 -z-10 hidden h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl lg:block" />
              <div className="rounded-[2rem] border border-white/10 bg-white/8 p-4 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-5">
                <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-6 sm:p-8">
                  <div className="mb-8 flex items-start justify-between gap-4 border-b border-white/10 pb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">{eyebrow}</p>
                      <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
                      <p className="mt-3 max-w-md text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
                    </div>
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <ServerStackIcon className="h-6 w-6 text-cyan-300" />
                    </span>
                  </div>

                  {children}

                  <p className="mt-8 text-sm text-slate-400">
                    {footerPrompt}{' '}
                    <Link to={footerHref} className="font-medium text-cyan-200 transition hover:text-cyan-100">
                      {footerLinkLabel}
                    </Link>
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