import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary menangkap kesalahan:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="rounded-card border border-red-200 bg-red-50/70 p-8 max-w-lg w-full flex flex-col items-center shadow-xs">
            <div className="mb-3 rounded-full bg-red-100 p-3 text-brand-terracotta">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-serif font-bold text-brand-dark mb-1">
              {this.props.fallbackTitle || 'Terjadi Kendala pada Halaman'}
            </h2>
            <p className="text-sm text-slate-600 mb-4 max-w-sm">
              {this.props.fallbackMessage ||
                'Maaf, terjadi kesalahan saat memuat tampilan ini. Silakan coba muat ulang halaman.'}
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-red-100/60 p-2.5 rounded text-red-900 overflow-x-auto w-full mb-4 max-h-28 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <Button variant="primary" size="sm" onClick={this.handleReset} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Muat Ulang Halaman
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
