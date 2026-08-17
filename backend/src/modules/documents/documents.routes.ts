import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";
import { ApiError } from "../../middlewares/errorHandler";

// Los documentos (facturas, justificantes, fotos) se guardan en un bucket
// de Supabase Storage en vez de en disco local. Así funciona igual tanto
// en Docker/VPS como en un despliegue serverless (Vercel), donde el disco
// es efímero y no se puede usar para guardar archivos de forma permanente.
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documents";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ApiError(500, "Supabase no está configurado (faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key);
}

// Multer en memoria: el archivo pasa directo de la petición a Supabase,
// sin tocar el disco del servidor.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("documents.read"), async (req, res) => {
  const { relatedModule, relatedId } = req.query;
  const documents = await prisma.document.findMany({
    where: {
      relatedModule: relatedModule ? String(relatedModule) : undefined,
      relatedId: relatedId ? String(relatedId) : undefined,
    },
    include: { uploadedBy: { select: { fullName: true } } },
    orderBy: { uploadedAt: "desc" },
  });
  res.json(documents);
});

router.post("/", requirePermission("documents.create"), upload.single("file"), async (req: AuthedRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se ha subido ningún archivo" });
    const { relatedModule, relatedId } = req.body;

    const supabase = getSupabase();
    const storagePath = `${relatedModule || "general"}/${Date.now()}-${req.file.originalname}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) throw new ApiError(500, `Error subiendo archivo a Supabase: ${uploadError.message}`);

    const document = await prisma.document.create({
      data: {
        filename: req.file.originalname,
        storagePath,
        mimeType: req.file.mimetype,
        relatedModule,
        relatedId,
        uploadedByUserId: req.user!.id,
      },
    });

    await logAudit({ userId: req.user!.id, action: "upload", module: "documents", recordId: document.id });
    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/download", requirePermission("documents.read"), async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: "No encontrado" });

    const supabase = getSupabase();
    // URL firmada, válida 60 segundos, para descargar el archivo directamente desde Supabase.
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(document.storagePath, 60);
    if (error || !data) throw new ApiError(500, "No se pudo generar el enlace de descarga");

    res.json({ url: data.signedUrl, filename: document.filename });
  } catch (err) {
    next(err);
  }
});

export default router;
