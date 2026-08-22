import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useConfirm } from "../context/ConfirmContext";

const EMPTY = { firstName: "", lastName: "", street: "", phone: "" };

export default function Members() {
  const confirm = useConfirm();
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [streets, setStreets] = useState<string[]>([]);
  const [openStreets, setOpenStreets] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const { data } = await api.get("/members", { params: { search } });
    setMembers(data);
  }

  async function loadStreets() {
    const res = await api.get("/members/streets");
    setStreets(res.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    loadStreets();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api.put(`/members/${editingId}`, form);
      } else {
        await api.post("/members", form);
      }
      setForm(EMPTY);
      setEditingId(null);
      load();
      loadStreets();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido guardar");
    }
  }

  function startEdit(m: any) {
    setEditingId(m.id);
    setForm({ firstName: m.firstName, lastName: m.lastName, street: m.street || "", phone: m.phone || "" });
    setShowForm(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  async function deleteMember(id: string, name: string) {
    const ok = await confirm({
      title: "Borrar socio",
      message: `¿Seguro que quieres borrar a ${name}? Esta acción no se puede deshacer.`,
      danger: true,
      confirmLabel: "Borrar",
    });
    if (!ok) return;
    try {
      await api.delete(`/members/${id}`);
      load();
    } catch (err: any) {
      // Se avisa con una alerta visible siempre, no solo dentro del
      // formulario (que puede estar cerrado y hacer que el aviso pase
      // desapercibido — era justo el motivo por el que parecía que "no
      // se borraban" los socios).
      window.alert(err.response?.data?.error || "No se ha podido borrar el socio.");
    }
  }

  async function deleteStreet(street: string, count: number) {
    const ok = await confirm({
      title: "Borrar calle completa",
      message: `¿Borrar "${street}" y sus ${count} socios? Se borrarán también sus cuotas. Esta acción no se puede deshacer.`,
      danger: true,
      confirmLabel: "Borrar calle",
    });
    if (!ok) return;
    try {
      await api.delete(`/members/street/${encodeURIComponent(street)}`);
      load();
      loadStreets();
    } catch (err: any) {
      window.alert(err.response?.data?.error || "No se ha podido borrar la calle.");
    }
  }

  function toggleStreet(street: string) {
    setOpenStreets((prev) => ({ ...prev, [street]: !prev[street] }));
  }

  async function downloadListing() {
    const res = await api.get("/members/export", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "listado-socios.pdf";
    link.click();
  }

  // Agrupa la lista visualmente por calle, ya vienen ordenados así del servidor
  const grouped: Record<string, any[]> = {};
  for (const m of members) {
    const key = m.street || "Sin calle";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Socios <span className="text-sm font-normal text-gray-400">({members.length})</span></h1>
        <div className="flex gap-2">
          <button onClick={downloadListing} className="text-sm bg-gray-700 text-white px-3 py-2 rounded-lg">
            📄 Descargar listado (PDF)
          </button>
          <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-brand text-white px-3 py-2 rounded-lg">
            {showForm ? "Cerrar formulario" : "+ Nuevo socio"}
          </button>
        </div>
      </div>

      <input
        placeholder="Buscar por nombre, apellidos o calle…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
      />

      {/* Listado normal en pantalla, desplegable por calle */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        {Object.entries(grouped).map(([street, list]) => (
          <div key={street} className="border-b last:border-0 pb-2 last:pb-0">
            <div className="w-full flex justify-between items-center py-1.5">
              <button onClick={() => toggleStreet(street)} className="flex-1 text-left">
                <span className="text-sm font-semibold text-gray-600">
                  {street} <span className="text-gray-400 font-normal">({list.length})</span>
                </span>
              </button>
              <span className="flex items-center gap-3 shrink-0">
                {street !== "Sin calle" && (
                  <button onClick={() => deleteStreet(street, list.length)} className="text-xs text-red-600 hover:underline">
                    Borrar calle
                  </button>
                )}
                <button onClick={() => toggleStreet(street)} className="text-gray-400">
                  {openStreets[street] ? "▲" : "▼"}
                </button>
              </span>
            </div>
            {openStreets[street] && (
              <ul className="divide-y">
                {list.map((m) => (
                  <li key={m.id} className="py-2 text-sm flex justify-between items-center gap-2">
                    <span>
                      <span className="text-gray-400 mr-1">#{m.number}</span>
                      {m.firstName} {m.lastName}
                    </span>
                    <span className="flex gap-3 shrink-0">
                      <button onClick={() => startEdit(m)} className="text-brand text-xs hover:underline">Editar</button>
                      <button onClick={() => deleteMember(m.id, `${m.firstName} ${m.lastName}`)} className="text-red-600 text-xs hover:underline">
                        Borrar
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {members.length === 0 && <p className="text-sm text-gray-400">Sin socios todavía.</p>}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
          <h2 className="font-medium mb-2">{editingId ? "Editar socio" : "Nuevo socio"}</h2>
          <input
            placeholder="Nombre"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
          <input
            placeholder="Apellidos"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
          <input
            placeholder="Calle"
            list="streets-list"
            value={form.street}
            onChange={(e) => setForm({ ...form, street: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          <datalist id="streets-list">
            {streets.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input
            placeholder="Teléfono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button className="flex-1 bg-brand text-white rounded-lg py-2">{editingId ? "Guardar cambios" : "Guardar"}</button>
            <button
              type="button"
              onClick={() => {
                cancelEdit();
                setShowForm(false);
              }}
              className="px-4 bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
