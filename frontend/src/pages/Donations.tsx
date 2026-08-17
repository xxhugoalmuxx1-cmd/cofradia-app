import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Donations() {
  const [donations, setDonations] = useState<any[]>([]);
  const [form, setForm] = useState({ amount: "", paymentMethod: "efectivo", reason: "" });

  async function load() {
    const { data } = await api.get("/donations");
    setDonations(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/donations", { ...form, amount: Number(form.amount) });
    setForm({ amount: "", paymentMethod: "efectivo", reason: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Donativos</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
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
        <button className="w-full bg-brand text-white rounded-lg py-2">Registrar donativo</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {donations.map((d) => (
            <li key={d.id} className="py-2 text-sm flex justify-between">
              <span>{d.reason || "Donativo"} {d.member ? `— ${d.member.firstName} ${d.member.lastName}` : ""}</span>
              <span className="text-green-600">{Number(d.amount).toFixed(2)} €</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
