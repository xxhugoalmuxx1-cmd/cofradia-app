import { CapacitorConfig } from "@capacitor/cli";

// Configuración base para generar la app Android/iOS con Capacitor
// a partir del mismo frontend usado en la PWA.
const config: CapacitorConfig = {
  appId: "com.cofradia.app",
  appName: "Cofradía",
  webDir: "dist",
  server: {
    // En producción, apuntar a la URL pública de la API (ver README).
    androidScheme: "https",
  },
};

export default config;
