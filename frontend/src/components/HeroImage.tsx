import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

// Imagen de la Virgen: se puede cambiar en cualquier momento (solo admin)
// y se refleja al instante en toda la app, porque la URL siempre es la
// misma (se sobrescribe el archivo en Supabase Storage).
export function HeroImage({ className, editable = false }: { className?: string; editable?: boolean }) {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("image", file);
    await api.post("/settings/hero-image", formData, { headers: { "Content-Type": "multipart/form-data" } });
    load();
  }

  const canEdit = editable && user?.role === "admin";

  return (
    <div className={`relative ${className || ""}`}>
      {url && !failed ? (
        <img src={url} alt="Purísima" className="w-full h-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="w-full h-full bg-brand/10 flex items-center justify-center text-2xl">⛪</div>
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
    </div>
  );
}
