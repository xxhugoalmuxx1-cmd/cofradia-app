import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", memberNumber: "" });

  async function load() {
    const { data } = await api.get("/members", { params: { search } });
    setMembers(data);
  }

  useEffect(() => {
    load();
  }, [search]);

  async function createMember(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/members", form);
    setForm({ firstName: "", lastName: "", phone: "", memberNumber: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Socios</h1>

      <input
        placeholder="Buscar socio…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
      />

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className="py-2 text-sm flex justify-between">
              <span>{m.firstName} {m.lastName}</span>
              <span className="text-gray-400">{m.memberNumber}</span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={createMember} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-medium mb-2">Nuevo socio</h2>
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
        <button className="w-full bg-brand text-white rounded-lg py-2">Guardar</button>
      </form>
    </div>
  );
}
