import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [relatedModule, setRelatedModule] = useState("general");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await api.get("/documents");
    setDocuments(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Elige primero un archivo");
      return;
    }
    setError("");
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("relatedModule", relatedModule);
    try {
      await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setFile(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido subir el documento");
    } finally {
      setUploading(false);
    }
  }

  async function download(id: string) {
    try {
      const { data } = await api.get(`/documents/${id}/download`);
      window.open(data.url, "_blank");
    } catch (err: any) {
      window.alert(err.response?.data?.error || "No se ha podido generar el enlace de descarga");
    }
  }

  async function remove(id: string, filename: string) {
    if (!window.confirm(`¿Borrar "${filename}"?`)) return;
    try {
      await api.delete(`/documents/${id}`);
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.error || "No se ha podido borrar el documento");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Documentos</h1>

      <form onSubmit={upload} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <select value={relatedModule} onChange={(e) => setRelatedModule(e.target.value)} className="w-full border rounded-lg px-3 py-2">
          <option value="general">General</option>
          <option value="expenses">Gastos</option>
          <option value="income">Ingresos</option>
          <option value="events">Eventos</option>
          <option value="donations">Donativos</option>
        </select>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full border rounded-lg px-3 py-2" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={uploading} className="w-full bg-brand text-white rounded-lg py-2 disabled:opacity-60">
          {uploading ? "Subiendo…" : "Subir documento"}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {documents.map((d) => (
            <li key={d.id} className="py-2 text-sm flex justify-between items-center gap-2">
              <span className="min-w-0">
                <div className="truncate">{d.filename}</div>
                <div className="text-gray-400 text-xs">
                  {d.uploadedBy?.fullName} — {new Date(d.uploadedAt).toLocaleDateString("es-ES")}
                </div>
              </span>
              <span className="flex gap-3 shrink-0">
                <button onClick={() => download(d.id)} className="text-brand underline text-xs">Descargar</button>
                <button onClick={() => remove(d.id, d.filename)} className="text-red-600 underline text-xs">Borrar</button>
              </span>
            </li>
          ))}
          {documents.length === 0 && <p className="text-sm text-gray-400">Sin documentos todavía.</p>}
        </ul>
      </div>
    </div>
  );
}
