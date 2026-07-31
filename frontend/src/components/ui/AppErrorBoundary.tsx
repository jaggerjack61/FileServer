import { Component, type ErrorInfo, type ReactNode } from 'react';

import { clearStoredSession } from '@/stores/authStore';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The application failed to render.', error, info);
  }

  private resetApplication = () => {
    clearStoredSession();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <section className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            FileServer could not load
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Your saved session may be out of date. Clear it and reload the
            application to continue.
          </p>
          <button
            type="button"
            onClick={this.resetApplication}
            className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Clear session and reload
          </button>
        </section>
      </main>
    );
  }
}
