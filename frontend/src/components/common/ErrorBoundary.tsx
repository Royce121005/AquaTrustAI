import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught render error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
          <div className="max-w-md w-full bg-[#111827] border border-[#1F293D] rounded-xl p-8 shadow-2xl text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-[#EF4444]/15 border border-[#EF4444]/30 text-rose-400 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Application Error Encountered</h2>
            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(14,165,233,0.3)] transition"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
