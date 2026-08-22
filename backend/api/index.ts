// Punto de entrada para desplegar el backend como función serverless en Vercel.
// Vercel importa este archivo y llama a la app de Express directamente con
// (req, res) en cada petición a /api/*, en vez de usar app.listen() como en
// server.ts (que sigue siendo el que se usa para Docker/VPS).
import { app } from "../src/app";

export default app;
