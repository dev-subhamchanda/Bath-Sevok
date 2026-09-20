import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring or console in production
    console.error("[ErrorBoundary] Unhandled error caught in component tree:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f7f9ff] text-[#181c20]">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#e5e8ee] p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-xs">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>

            <h2 className="text-xl font-bold text-[#003356] tracking-tight mb-2">
              Something went wrong
            </h2>

            <p className="text-xs sm:text-sm text-[#42474e] mb-6 leading-relaxed">
              An unexpected error occurred while loading this interface. You can reload the application or try again.
            </p>

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 h-10 rounded-xl border border-[#c2c7cf] text-[#42474e] hover:bg-[#f1f4fa] text-xs font-semibold transition-all cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 h-10 rounded-xl bg-[#003356] hover:bg-[#174a73] text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
