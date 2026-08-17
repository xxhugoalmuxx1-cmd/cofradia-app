import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Fees() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [form, setForm] = useState({ name: "", amount: "", year: new Date().getFullYear() });

  async function loadPeriods() {
    const { data } = await api.get("/fees/periods");
    setPeriods(data);
  }

  async function loadFees(periodId: string) {
    const { data } = await api.get("/fees", { params: { periodId } });
    setFees(data);
  }

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) loadFees(selectedPeriod);
  }, [selectedPeriod]);

  async function createPeriod(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/fees/periods", { name: form.name, amount: Number(form.amount), year: Number(form.year) });
    setForm({ name: "", amount: "", year: new Date().getFullYear() });
    loadPeriods();
  }

  async function generate(periodId: string) {
    await api.post(`/fees/periods/${periodId}/generate`);
    loadPeriods();
    if (selectedPeriod === periodId) loadFees(periodId);
  }

  async function pay(feeId: string) {
    await api.post(`/fees/${feeId}/pay`, { paymentMethod: "efectivo" });
    if (selectedPeriod) loadFees(selectedPeriod);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Cuotas</h1>

      <form onSubmit={createPeriod} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-medium mb-2">Nuevo periodo de cuota</h2>
        <input
          placeholder="Nombre (ej. Cuota 2026)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <input
          placeholder="Importe"
          type="number"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <button className="w-full bg-brand text-white rounded-lg py-2">Crear periodo</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {periods.map((p) => (
            <li key={p.id} className="py-2 text-sm flex justify-between items-center">
              <button onClick={() => setSelectedPeriod(p.id)} className="text-left">
                {p.name} — {p.paidCount} pagadas / {p.pendingCount} pendientes
              </button>
              <button onClick={() => generate(p.id)} className="text-xs bg-brand text-white px-2 py-1 rounded">
                Generar cuotas de socios
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedPeriod && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-medium mb-2">Cuotas del periodo</h2>
          <ul className="divide-y">
            {fees.map((f) => (
              <li key={f.id} className="py-2 text-sm flex justify-between items-center">
                <span>{f.member?.firstName} {f.member?.lastName}</span>
                {f.paid ? (
                  <span className="text-green-600">Pagada</span>
                ) : (
                  <button onClick={() => pay(f.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                    Marcar pagada
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
