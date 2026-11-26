import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Application ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F4F7FC] p-6 text-[#070910] dark:bg-[#070910] dark:text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-blue-500/25 dark:bg-[#0D111C]">
            <h1 className="font-display text-lg font-bold text-blue-600 dark:text-lime-400">
              Something went wrong
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 h-10 w-full rounded-xl bg-blue-600 text-xs font-semibold text-white transition-colors hover:bg-blue-500 dark:bg-lime-400 dark:text-[#070910] dark:hover:bg-lime-300"
            >
              Reload CinNova
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
