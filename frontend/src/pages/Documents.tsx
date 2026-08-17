import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [relatedModule, setRelatedModule] = useState("general");

  async function load() {
    const { data } = await api.get("/documents");
    setDocuments(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("relatedModule", relatedModule);
    await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
    setFile(null);
    load();
  }

  async function download(id: string) {
    const { data } = await api.get(`/documents/${id}/download`);
    window.open(data.url, "_blank");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Documentos</h1>

      <form onSubmit={upload} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <select
          value={relatedModule}
          onChange={(e) => setRelatedModule(e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="general">General</option>
          <option value="expenses">Gastos</option>
          <option value="income">Ingresos</option>
          <option value="events">Eventos</option>
          <option value="donations">Donativos</option>
        </select>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full border rounded-lg px-3 py-2"
        />
        <button className="w-full bg-brand text-white rounded-lg py-2">Subir documento</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {documents.map((d) => (
            <li key={d.id} className="py-2 text-sm flex justify-between items-center">
              <span>
                {d.filename}
                <br />
                <span className="text-gray-400">
                  {d.uploadedBy?.fullName} — {new Date(d.uploadedAt).toLocaleDateString("es-ES")}
                </span>
              </span>
              <button onClick={() => download(d.id)} className="text-brand underline text-xs">
                Descargar
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
