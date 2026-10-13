import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Fuel } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#080B11] text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#111827] border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400 shadow-lg">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center justify-center space-x-2">
                <span>LitroMetrik PRO</span>
                <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-600 text-white font-bold">Recuperación</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                La aplicación ha encontrado una excepción inesperada en el ciclo de renderizado.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-900/60 text-left overflow-x-auto max-h-40">
              <div className="text-[11px] font-mono text-red-300 whitespace-pre-wrap break-all">
                {this.state.error?.toString() || 'Error desconocido'}
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem('litrometrik_active_trip');
                window.location.reload();
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs shadow-lg shadow-blue-500/25 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reiniciar y Recargar Aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
