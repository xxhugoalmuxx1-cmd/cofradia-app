import { Router } from "express";
import { login, refresh } from "./auth.service";

const router = Router();

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await refresh(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (_req, res) => {
  // El logout real se gestiona en el cliente borrando los tokens.
  // Aquí se podría añadir una lista negra de tokens si se requiere en el futuro.
  res.json({ ok: true });
});

export default router;
