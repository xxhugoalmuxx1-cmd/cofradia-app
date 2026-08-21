import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";
import { ApiError } from "../../middlewares/errorHandler";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documents";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ApiError(500, "Supabase no está configurado (faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key);
}

// Supabase Storage no admite tildes, eñes, espacios ni ciertos símbolos en
// la ruta del archivo (daba el error "Invalid key"). Esto limpia el nombre
// SOLO para la ruta de almacenamiento — el nombre original con tildes se
// sigue mostrando tal cual al usuario, guardado aparte en "filename".
function sanitizeForStorageKey(filename: string): string {
  const normalized = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita acentos/diacríticos
  return normalized
    .replace(/[^a-zA-Z0-9._-]/g, "_") // cualquier otro carácter raro -> "_"
    .replace(/_+/g, "_");
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("documents.read"), async (req, res) => {
  const { relatedModule, relatedId, year } = req.query;
  const documents = await prisma.document.findMany({
    where: {
      relatedModule: relatedModule ? String(relatedModule) : undefined,
      relatedId: relatedId ? String(relatedId) : undefined,
      uploadedAt: year
        ? { gte: new Date(Number(year), 0, 1), lte: new Date(Number(year), 11, 31, 23, 59, 59) }
        : undefined,
    },
    include: { uploadedBy: { select: { fullName: true } } },
    orderBy: { uploadedAt: "desc" },
  });
  res.json(documents);
});

router.post("/", requirePermission("documents.create"), upload.single("file"), async (req: AuthedRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se ha subido ningún archivo" });
    const { relatedModule, relatedId, concept } = req.body;

    const supabase = getSupabase();
    const safeName = sanitizeForStorageKey(req.file.originalname);
    const storagePath = `${relatedModule || "general"}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) throw new ApiError(500, `Error subiendo archivo a Supabase: ${uploadError.message}`);

    const document = await prisma.document.create({
      data: {
        filename: req.file.originalname,
        concept: concept || undefined,
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

router.put("/:id", requirePermission("documents.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { concept, relatedModule } = req.body;
    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: { concept, relatedModule },
    });
    await logAudit({ userId: req.user!.id, action: "update", module: "documents", recordId: document.id });
    res.json(document);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/download", requirePermission("documents.read"), async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: "No encontrado" });

    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(document.storagePath, 60);
    if (error || !data) throw new ApiError(500, "No se pudo generar el enlace de descarga");

    res.json({ url: data.signedUrl, filename: document.filename });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("documents.create"), async (req: AuthedRequest, res, next) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!document) return res.status(404).json({ error: "No encontrado" });

    const supabase = getSupabase();
    await supabase.storage.from(BUCKET).remove([document.storagePath]);

    await prisma.document.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: "delete", module: "documents", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
