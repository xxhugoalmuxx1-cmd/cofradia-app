import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { ApiError } from "../../middlewares/errorHandler";

const BRANDING_BUCKET = process.env.SUPABASE_BRANDING_BUCKET || "branding";
const HERO_PATH = "hero";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError(500, "Supabase no está configurado");
  return createClient(url, key);
}

const router = Router();

// Pública: cualquiera que abra la app necesita poder ver la imagen, sin login.
router.get("/hero-image", async (_req, res, next) => {
  try {
    const supabase = getSupabase();
    const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(HERO_PATH);
    res.json({ url: data.publicUrl });
  } catch (err) {
    next(err);
  }
});

// Solo un administrador puede cambiar la imagen. Se sobrescribe siempre en
// la misma ruta, así la URL pública nunca cambia.
router.post("/hero-image", requireAuth, upload.single("image"), async (req: AuthedRequest, res, next) => {
  try {
    if (req.user!.roleName !== "admin") {
      return res.status(403).json({ error: "Solo un administrador puede cambiar esta imagen" });
    }
    if (!req.file) return res.status(400).json({ error: "No se ha subido ninguna imagen" });

    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from(BRANDING_BUCKET)
      .upload(HERO_PATH, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (error) throw new ApiError(500, `Error subiendo imagen: ${error.message}`);

    const { data } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(HERO_PATH);
    res.json({ url: `${data.publicUrl}?v=${Date.now()}` });
  } catch (err) {
    next(err);
  }
});

export default router;
