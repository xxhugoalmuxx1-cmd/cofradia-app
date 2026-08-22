import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Sin esto, cualquier error inesperado en una pantalla deja la app
// completamente en blanco sin ninguna pista de qué ha pasado. Con esto,
// se ve al menos un mensaje y un botón para recargar.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="bg-white rounded-2xl shadow-md p-6 max-w-sm text-center">
            <p className="text-2xl mb-2">⚠️</p>
            <h1 className="font-semibold mb-1">Algo ha fallado</h1>
            <p className="text-sm text-gray-500 mb-4 break-words">{this.state.error.message}</p>
            <button onClick={() => window.location.reload()} className="bg-brand text-white rounded-lg px-4 py-2 text-sm">
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
