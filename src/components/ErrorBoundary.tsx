import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 bg-slate-900 border border-rose-800/80 rounded-xl text-slate-100 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="text-base font-bold">
              {this.props.fallbackTitle || 'A rendering error occurred in this view'}
            </h3>
          </div>
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-rose-300 space-y-2 overflow-auto max-h-60">
            <p className="font-bold">{this.state.error?.toString()}</p>
            {this.state.errorInfo?.componentStack && (
              <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">
                {this.state.errorInfo.componentStack}
              </pre>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Try Again
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
