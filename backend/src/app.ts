import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

export const app = express();

app.use(helmet());
app.use(
  cors({
    // En Vercel, define FRONTEND_URL con la URL de tu frontend (ej. https://tuapp.vercel.app).
    // Si no se define, se permite cualquier origen (válido para desarrollo/Docker).
    origin: process.env.FRONTEND_URL || true,
  })
);
app.use(express.json());

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/api/v1/auth/login", loginLimiter);

app.use("/api/v1", routes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(errorHandler);
