import { useEffect, useState } from "react";
import { api } from "../api/client";

const EMPTY = { amount: "", paymentMethod: "efectivo", reason: "" };

export default function Donations() {
  const [donations, setDonations] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get("/donations");
    setDonations(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount) };
    if (editingId) {
      await api.put(`/donations/${editingId}`, payload);
    } else {
      await api.post("/donations", payload);
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  }

  function startEdit(d: any) {
    setEditingId(d.id);
    setForm({ amount: String(d.amount), paymentMethod: d.paymentMethod, reason: d.reason || "" });
  }

  async function remove(id: string) {
    if (!window.confirm("¿Borrar este donativo?")) return;
    await api.delete(`/donations/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Donativos</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-medium mb-1">{editingId ? "Editar donativo" : "Nuevo donativo"}</h2>
        <input
          placeholder="Importe"
          type="number"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <input
          placeholder="Motivo"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <select
          value={form.paymentMethod}
          onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="bizum">Bizum</option>
          <option value="transferencia">Transferencia</option>
        </select>
        <div className="flex gap-2">
          <button className="flex-1 bg-brand text-white rounded-lg py-2">{editingId ? "Guardar cambios" : "Registrar donativo"}</button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="px-4 bg-gray-200 rounded-lg">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {donations.map((d) => (
            <li key={d.id} className="py-2 text-sm flex justify-between items-center gap-2">
              <span>{d.reason || "Donativo"} {d.member ? `— ${d.member.firstName} ${d.member.lastName}` : ""}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-emerald-600">{Number(d.amount).toFixed(2)} €</span>
                <button onClick={() => startEdit(d)} className="text-brand text-xs hover:underline">Editar</button>
                <button onClick={() => remove(d.id)} className="text-red-600 text-xs hover:underline">Borrar</button>
              </span>
            </li>
          ))}
          {donations.length === 0 && <p className="text-sm text-gray-400">Sin donativos todavía.</p>}
        </ul>
      </div>
    </div>
  );
}
