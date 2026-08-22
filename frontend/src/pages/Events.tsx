import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useConfirm } from "../context/ConfirmContext";

const EMPTY = { name: "", date: "", description: "" };

export default function Events() {
  const confirm = useConfirm();
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await api.get("/events");
    setEvents(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.date) {
      setError("El nombre y la fecha son obligatorios");
      return;
    }
    try {
      if (editingId) {
        await api.put(`/events/${editingId}`, form);
      } else {
        await api.post("/events", form);
      }
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido guardar el evento");
    }
  }

  function startEdit(ev: any) {
    setEditingId(ev.id);
    setForm({ name: ev.name, date: ev.date?.slice(0, 10) || "", description: ev.description || "" });
  }

  async function remove(id: string) {
    if (!(await confirm({ title: "Borrar evento", message: "¿Borrar este evento? No se puede deshacer.", danger: true, confirmLabel: "Borrar" }))) return;
    await api.delete(`/events/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Eventos</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-medium mb-1">{editingId ? "Editar evento" : "Nuevo evento"}</h2>
        <input
          placeholder="Nombre del evento"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <textarea
          placeholder="Descripción"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <div className="flex gap-2">
          <button className="flex-1 bg-brand text-white rounded-lg py-2">{editingId ? "Guardar cambios" : "Crear evento"}</button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="px-4 bg-gray-200 rounded-lg">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {events.map((ev) => (
            <li key={ev.id} className="py-2 text-sm flex justify-between items-center gap-2">
              <span>
                <div className="font-medium">{ev.name}</div>
                <div className="text-gray-400">{new Date(ev.date).toLocaleDateString("es-ES")}</div>
              </span>
              <span className="flex gap-3 shrink-0">
                <button onClick={() => startEdit(ev)} className="text-brand text-xs hover:underline">Editar</button>
                <button onClick={() => remove(ev.id)} className="text-red-600 text-xs hover:underline">Borrar</button>
              </span>
            </li>
          ))}
          {events.length === 0 && <p className="text-sm text-gray-400">Sin eventos todavía.</p>}
        </ul>
      </div>
    </div>
  );
}
