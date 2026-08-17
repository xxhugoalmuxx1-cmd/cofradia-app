import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", date: "", description: "" });

  async function load() {
    const { data } = await api.get("/events");
    setEvents(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/events", form);
    setForm({ name: "", date: "", description: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Eventos</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
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
        <button className="w-full bg-brand text-white rounded-lg py-2">Crear evento</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {events.map((ev) => (
            <li key={ev.id} className="py-2 text-sm">
              <div className="font-medium">{ev.name}</div>
              <div className="text-gray-400">{new Date(ev.date).toLocaleDateString("es-ES")}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
