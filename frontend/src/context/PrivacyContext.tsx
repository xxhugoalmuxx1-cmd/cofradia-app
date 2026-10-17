import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface PrivacyContextValue {
  hideAmounts: boolean;
  toggleHideAmounts: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue | undefined>(undefined);

// Modo "privacidad": cuando está activado, todos los importes de la app se
// muestran como "••••" para poder enseñar la aplicación sin revelar cifras.
// Se recuerda en este dispositivo (localStorage), así no se pierde al cambiar
// de pantalla ni al recargar.
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hideAmounts, setHideAmounts] = useState<boolean>(() => {
    try {
      return localStorage.getItem("hideAmounts") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("hideAmounts", hideAmounts ? "1" : "0");
    } catch {
      /* si el navegador no deja guardar, simplemente no se recuerda */
    }
  }, [hideAmounts]);

  return (
    <PrivacyContext.Provider value={{ hideAmounts, toggleHideAmounts: () => setHideAmounts((v) => !v) }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy debe usarse dentro de PrivacyProvider");
  return ctx;
}

// Sustituye al formateador de euros de cada pantalla: si el modo privacidad
// está activo devuelve "•••• €", y si no, el importe normal.
export function useMoneyFormatter() {
  const { hideAmounts } = usePrivacy();
  return (n: number | string) =>
    hideAmounts ? "•••• €" : Number(n).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}
