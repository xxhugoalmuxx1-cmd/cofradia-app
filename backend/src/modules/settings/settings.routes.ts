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

// Diagnóstico (solo admin): pregunta directamente a Supabase, con las
// credenciales configuradas ahora mismo en el backend, qué buckets ve de
// verdad. Así se puede saber con certeza si el problema es la URL, la
// clave, o el nombre del bucket, en vez de seguir probando a ciegas.
router.get("/diagnostics", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (req.user!.roleName !== "admin") {
      return res.status(403).json({ error: "Solo un administrador puede ver esto" });
    }

    const url = process.env.SUPABASE_URL || null;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const keyPrefix = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 6) || null;
    const configuredBuckets = {
      documents: process.env.SUPABASE_STORAGE_BUCKET || "documents",
      products: process.env.SUPABASE_PRODUCTS_BUCKET || "products",
      branding: process.env.SUPABASE_BRANDING_BUCKET || "branding",
    };

    let realBuckets: any = null;
    let listError: string | null = null;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage.listBuckets();
      if (error) listError = error.message;
      else realBuckets = data?.map((b) => ({ name: b.name, public: b.public }));
    } catch (e: any) {
      listError = e.message;
    }

    res.json({
      supabaseUrlConfigured: url,
      serviceRoleKeyPresent: hasKey,
      serviceRoleKeyStartsWith: keyPrefix, // debería empezar por "eyJhb" si es el formato correcto
      bucketsEsperadosPorElCodigo: configuredBuckets,
      bucketsQueSupabaseDiceQueExisten: realBuckets,
      errorAlListarBuckets: listError,
    });
  } catch (err) {
    next(err);
  }
});

// Fuerza que los 3 buckets usados por la app (documentos, productos,
// imagen de marca) existan y estén marcados como públicos, directamente
// por código. Sirve para arreglar de un clic si el toggle "Public bucket"
// de la interfaz de Supabase no se llegó a guardar correctamente.
router.post("/fix-buckets", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (req.user!.roleName !== "admin") {
      return res.status(403).json({ error: "Solo un administrador puede hacer esto" });
    }

    const supabase = getSupabase();
    const buckets = [
      { name: process.env.SUPABASE_STORAGE_BUCKET || "documents", public: false },
      { name: process.env.SUPABASE_PRODUCTS_BUCKET || "products", public: true },
      { name: process.env.SUPABASE_BRANDING_BUCKET || "branding", public: true },
    ];

    const results: any[] = [];
    for (const b of buckets) {
      const { error: updateError } = await supabase.storage.updateBucket(b.name, { public: b.public });
      if (updateError) {
        // Si el bucket no existía todavía, se crea directamente con el ajuste correcto.
        const { error: createError } = await supabase.storage.createBucket(b.name, { public: b.public });
        results.push({ bucket: b.name, action: createError ? "error" : "creado", error: createError?.message });
      } else {
        results.push({ bucket: b.name, action: "actualizado a público=" + b.public });
      }
    }

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

export default router;
