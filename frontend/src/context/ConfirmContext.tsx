import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";

interface ConfirmOptions {
  title?: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  return ctx;
}

// Sustituye a window.confirm() por un cuadro de diálogo propio, con el
// mismo estilo que el resto de la app, en vez del feo aviso del navegador.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>();

  const confirm: ConfirmFn = useCallback((opts) => {
    const normalized = typeof opts === "string" ? { message: opts } : opts;
    setOptions(normalized);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function handle(result: boolean) {
    setOptions(null);
    resolver.current?.(result);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={() => handle(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-[fadeIn_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl ${
              options.danger ? "bg-red-100" : "bg-brand/10"
            }`}>
              {options.danger ? "⚠️" : "❔"}
            </div>
            {options.title && <h2 className="font-semibold text-center mb-1">{options.title}</h2>}
            <p className="text-sm text-gray-600 text-center mb-5">{options.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => handle(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                {options.cancelLabel || "Cancelar"}
              </button>
              <button
                onClick={() => handle(true)}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white transition-colors ${
                  options.danger ? "bg-red-600 hover:bg-red-700" : "bg-brand hover:bg-brand-light"
                }`}
              >
                {options.confirmLabel || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
