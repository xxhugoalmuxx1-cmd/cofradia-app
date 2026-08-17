import { useEffect, useState } from "react";
import { api } from "../api/client";

const EMPTY = { concept: "", category: "", amount: "", paymentMethod: "efectivo" };

export default function Finance() {
  const [tab, setTab] = useState<"income" | "expenses">("income");
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get(`/${tab}`);
    setItems(data);
  }

  useEffect(() => {
    setEditingId(null);
    setForm(EMPTY);
    load();
  }, [tab]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount) };
    if (editingId) {
      await api.put(`/${tab}/${editingId}`, payload);
    } else {
      await api.post(`/${tab}`, payload);
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  }

  function startEdit(i: any) {
    setEditingId(i.id);
    setForm({ concept: i.concept, category: i.category || "", amount: String(i.amount), paymentMethod: i.paymentMethod });
  }

  async function remove(id: string) {
    if (!window.confirm("¿Borrar este movimiento? No se puede deshacer.")) return;
    await api.delete(`/${tab}/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Tesorería</h1>
      <div className="flex gap-2">
        <button
          onClick={() => setTab("income")}
          className={`px-4 py-2 rounded-lg ${tab === "income" ? "bg-brand text-white" : "bg-white"}`}
        >
          Ingresos
        </button>
        <button
          onClick={() => setTab("expenses")}
          className={`px-4 py-2 rounded-lg ${tab === "expenses" ? "bg-brand text-white" : "bg-white"}`}
        >
          Gastos
        </button>
      </div>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-medium mb-1">{editingId ? "Editar" : "Nuevo"} {tab === "income" ? "ingreso" : "gasto"}</h2>
        <input
          placeholder="Concepto"
          value={form.concept}
          onChange={(e) => setForm({ ...form, concept: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <input
          placeholder="Categoría"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Importe"
          type="number"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
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
          <button className="flex-1 bg-brand text-white rounded-lg py-2">
            {editingId ? "Guardar cambios" : `Registrar ${tab === "income" ? "ingreso" : "gasto"}`}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setForm(EMPTY); }}
              className="px-4 bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {items.map((i) => (
            <li key={i.id} className="py-2 text-sm flex justify-between items-center gap-2">
              <span className="min-w-0">
                <div className="truncate">{i.concept}</div>
                <div className="text-gray-400 text-xs">
                  {i.createdBy?.fullName} — {new Date(i.date).toLocaleDateString("es-ES")}
                  {i.voidedAt && <span className="text-red-500"> · anulado</span>}
                </div>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className={tab === "income" ? "text-emerald-600" : "text-red-600"}>
                  {Number(i.amount).toFixed(2)} €
                </span>
                <button onClick={() => startEdit(i)} className="text-brand text-xs hover:underline">Editar</button>
                <button onClick={() => remove(i.id)} className="text-red-600 text-xs hover:underline">Borrar</button>
              </span>
            </li>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-400">Sin movimientos todavía.</p>}
        </ul>
      </div>
    </div>
  );
}
