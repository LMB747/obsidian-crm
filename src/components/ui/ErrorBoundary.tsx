import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="bg-card border border-card-border rounded-2xl p-8 max-w-md w-full text-center shadow-card">
            <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-accent-red" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              {this.state.error?.message || 'Erreur inattendue lors du rendu du composant.'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
