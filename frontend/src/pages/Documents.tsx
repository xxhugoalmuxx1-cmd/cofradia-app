import { useEffect, useState } from "react";
import { api } from "../api/client";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [relatedModule, setRelatedModule] = useState("general");
  const [concept, setConcept] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editConcept, setEditConcept] = useState("");

  async function load() {
    const { data } = await api.get("/documents", { params: { year: filterYear || undefined } });
    setDocuments(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterYear]);

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
    if (concept) formData.append("concept", concept);
    try {
      await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setFile(null);
      setConcept("");
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

  function startEdit(d: any) {
    setEditingId(d.id);
    setEditConcept(d.concept || "");
  }

  async function saveEdit(id: string) {
    try {
      await api.put(`/documents/${id}`, { concept: editConcept });
      setEditingId(null);
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.error || "No se ha podido guardar el concepto");
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
        <input
          placeholder="Concepto (ej. Factura floristería mayo)"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full border rounded-lg px-3 py-2" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={uploading} className="w-full bg-brand text-white rounded-lg py-2 disabled:opacity-60">
          {uploading ? "Subiendo…" : "Subir documento"}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-sm text-gray-500 uppercase tracking-wide">Filtrar por año</h2>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : "")}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <ul className="divide-y">
          {documents.map((d) => (
            <li key={d.id} className="py-2 text-sm">
              {editingId === d.id ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    value={editConcept}
                    onChange={(e) => setEditConcept(e.target.value)}
                    placeholder="Concepto"
                    className="border rounded-lg px-2 py-1 text-sm flex-1 min-w-[140px]"
                  />
                  <button onClick={() => saveEdit(d.id)} className="text-xs bg-brand text-white px-2 py-1 rounded">Guardar</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">Cancelar</button>
                </div>
              ) : (
                <div className="flex justify-between items-center gap-2">
                  <span className="min-w-0">
                    <div className="truncate">{d.concept || d.filename}</div>
                    <div className="text-gray-400 text-xs truncate">
                      {d.filename !== d.concept && d.concept ? `${d.filename} — ` : ""}
                      {d.uploadedBy?.fullName} — {new Date(d.uploadedAt).toLocaleDateString("es-ES")}
                    </div>
                  </span>
                  <span className="flex gap-3 shrink-0">
                    <button onClick={() => startEdit(d)} className="text-brand underline text-xs">Concepto</button>
                    <button onClick={() => download(d.id)} className="text-brand underline text-xs">Descargar</button>
                    <button onClick={() => remove(d.id, d.filename)} className="text-red-600 underline text-xs">Borrar</button>
                  </span>
                </div>
              )}
            </li>
          ))}
          {documents.length === 0 && <p className="text-sm text-gray-400">Sin documentos {filterYear ? `en ${filterYear}` : ""}.</p>}
        </ul>
      </div>
    </div>
  );
}
