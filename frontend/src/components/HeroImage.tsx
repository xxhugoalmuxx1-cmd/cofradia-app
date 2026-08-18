import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ImageCropModal } from "./ImageCropModal";

// Imagen de la Virgen: se puede cambiar en cualquier momento (solo admin)
// y se refleja al instante en toda la app, porque la URL siempre es la
// misma (se sobrescribe el archivo en Supabase Storage).
//
// variant "avatar": icono pequeño y redondo (barra lateral), con el
// control de cambio oculto hasta pasar el ratón por encima.
// variant "banner": imagen grande rectangular (login), sin edición.
export function HeroImage({
  className,
  editable = false,
  variant = "banner",
}: {
  className?: string;
  editable?: boolean;
  variant?: "avatar" | "banner";
}) {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function load() {
    try {
      const { data } = await api.get("/settings/hero-image");
      setUrl(data.url);
      setFailed(false);
    } catch {
      setUrl(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  }

  async function handleCropConfirm(blob: Blob) {
    setPendingFile(null);
    const formData = new FormData();
    formData.append("image", blob, "hero.jpg");
    try {
      await api.post("/settings/hero-image", formData, { headers: { "Content-Type": "multipart/form-data" } });
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.error || "No se ha podido subir la imagen. Revisa el bucket 'branding' en Supabase.");
    }
  }

  const canEdit = editable && user?.role === "admin";
  const hasImage = !!url && !failed;

  if (variant === "avatar") {
    return (
      <div className={`relative group ${className || ""}`}>
        <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 flex items-center justify-center mx-auto">
          {hasImage ? (
            <img src={url!} alt="Purísima" className="w-full h-full object-cover" onError={() => setFailed(true)} />
          ) : (
            <span className="text-2xl">⛪</span>
          )}
        </div>
        {canEdit && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 m-auto w-14 h-14 rounded-full flex items-center justify-center bg-black/50 text-white text-[10px] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              Cambiar
            </button>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </>
        )}
        {pendingFile && (
          <ImageCropModal file={pendingFile} shape="circle" onCancel={() => setPendingFile(null)} onConfirm={handleCropConfirm} />
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className || ""}`}>
      {hasImage ? (
        <img src={url!} alt="Purísima" className="w-full h-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="w-full h-full bg-brand/10 flex items-center justify-center text-3xl">⛪</div>
      )}
      {failed && url && (
        <p className="text-[10px] text-red-500 break-all mt-1">
          No se pudo cargar: <a href={url} target="_blank" rel="noreferrer" className="underline">{url}</a>
        </p>
      )}
      {canEdit && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-white/90 text-brand text-xs px-2 py-1 rounded-lg shadow"
          >
            Cambiar imagen
          </button>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </>
      )}
      {pendingFile && (
        <ImageCropModal file={pendingFile} shape="square" onCancel={() => setPendingFile(null)} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}
