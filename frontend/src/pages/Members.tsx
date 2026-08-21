import { useEffect, useState } from "react";
import { api } from "../api/client";

const EMPTY = { firstName: "", lastName: "", street: "", phone: "", memberNumber: "" };

export default function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [streets, setStreets] = useState<string[]>([]);

  async function load() {
    const { data } = await api.get("/members", { params: { search } });
    setMembers(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    api.get("/members/streets").then((res) => setStreets(res.data));
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
      api.get("/members/streets").then((res) => setStreets(res.data));
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido guardar");
    }
  }

  function startEdit(m: any) {
    setEditingId(m.id);
    setForm({
      firstName: m.firstName,
      lastName: m.lastName,
      street: m.street || "",
      phone: m.phone || "",
      memberNumber: m.memberNumber || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  async function deleteMember(id: string, name: string) {
    if (!window.confirm(`¿Borrar a ${name}?`)) return;
    try {
      await api.delete(`/members/${id}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido borrar");
    }
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
      <h1 className="text-xl font-semibold">Socios</h1>

      <input
        placeholder="Buscar por nombre, apellidos o calle…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
      />

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        {Object.entries(grouped).map(([street, list]) => (
          <div key={street}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{street}</h2>
            <ul className="divide-y">
              {list.map((m) => (
                <li key={m.id} className="py-2 text-sm flex justify-between items-center gap-2">
                  <span>{m.firstName} {m.lastName} <span className="text-gray-400">{m.memberNumber}</span></span>
                  <span className="flex gap-3 shrink-0">
                    <button onClick={() => startEdit(m)} className="text-brand text-xs hover:underline">Editar</button>
                    <button onClick={() => deleteMember(m.id, `${m.firstName} ${m.lastName}`)} className="text-red-600 text-xs hover:underline">
                      Borrar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {members.length === 0 && <p className="text-sm text-gray-400">Sin socios todavía.</p>}
      </div>

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
        <input
          placeholder="Número de socio"
          value={form.memberNumber}
          onChange={(e) => setForm({ ...form, memberNumber: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2">
          <button className="flex-1 bg-brand text-white rounded-lg py-2">{editingId ? "Guardar cambios" : "Guardar"}</button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="px-4 bg-gray-200 rounded-lg">
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
