import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[#0F172A] p-8">
          <div className="bg-[#1E293B] border border-red-500/30 rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="text-white font-semibold text-lg">Algo salió mal</h2>
            </div>
            <p className="text-gray-400 text-sm">
              Ocurrió un error inesperado. Intenta recargar la página.
            </p>
            {this.state.error && (
              <details className="text-xs text-gray-500 bg-[#0F172A] rounded-lg p-3 max-h-32 overflow-y-auto">
                <summary className="cursor-pointer hover:text-gray-300">Detalles técnicos</summary>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error.message}</pre>
              </details>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={this.handleReset} className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg transition-colors">
                Reintentar
              </button>
              <button onClick={() => window.location.reload()} className="px-4 py-2 border border-gray-600 hover:border-gray-500 text-gray-300 text-sm font-medium rounded-lg transition-colors">
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
