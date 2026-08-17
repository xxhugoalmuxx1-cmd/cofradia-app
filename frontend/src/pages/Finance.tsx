import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Finance() {
  const [tab, setTab] = useState<"income" | "expenses">("income");
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ concept: "", category: "", amount: "", paymentMethod: "efectivo" });

  async function load() {
    const { data } = await api.get(`/${tab}`);
    setItems(data);
  }

  useEffect(() => {
    load();
  }, [tab]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.post(`/${tab}`, { ...form, amount: Number(form.amount) });
    setForm({ concept: "", category: "", amount: "", paymentMethod: "efectivo" });
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
        <button className="w-full bg-brand text-white rounded-lg py-2">
          Registrar {tab === "income" ? "ingreso" : "gasto"}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {items.map((i) => (
            <li key={i.id} className="py-2 text-sm flex justify-between">
              <span>
                {i.concept}
                <br />
                <span className="text-gray-400">
                  {i.createdBy?.fullName} — {new Date(i.date).toLocaleDateString("es-ES")}
                </span>
              </span>
              <span className={tab === "income" ? "text-green-600" : "text-red-600"}>
                {Number(i.amount).toFixed(2)} €
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
