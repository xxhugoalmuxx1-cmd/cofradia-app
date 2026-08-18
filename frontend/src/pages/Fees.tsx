import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Fees() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [form, setForm] = useState({ name: "", amount: "", year: new Date().getFullYear() });
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

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

  async function submitPeriod(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: form.name, amount: Number(form.amount), year: Number(form.year) };
    if (editingPeriodId) {
      await api.put(`/fees/periods/${editingPeriodId}`, payload);
    } else {
      await api.post("/fees/periods", payload);
    }
    setForm({ name: "", amount: "", year: new Date().getFullYear() });
    setEditingPeriodId(null);
    loadPeriods();
  }

  function startEditPeriod(p: any) {
    setEditingPeriodId(p.id);
    setForm({ name: p.name, amount: String(p.amount), year: p.year });
  }

  async function deletePeriod(id: string, name: string) {
    if (!window.confirm(`¿Borrar el periodo "${name}"? Se borrarán también todas sus cuotas.`)) return;
    await api.delete(`/fees/periods/${id}`);
    if (selectedPeriod === id) setSelectedPeriod("");
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

  async function removeFee(feeId: string) {
    if (!window.confirm("¿Borrar esta cuota?")) return;
    await api.delete(`/fees/${feeId}`);
    loadPeriods();
    if (selectedPeriod) loadFees(selectedPeriod);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Cuotas</h1>

      <form onSubmit={submitPeriod} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-medium mb-2">{editingPeriodId ? "Editar periodo" : "Nuevo periodo de cuota"}</h2>
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
        <div className="flex gap-2">
          <button className="flex-1 bg-brand text-white rounded-lg py-2">{editingPeriodId ? "Guardar cambios" : "Crear periodo"}</button>
          {editingPeriodId && (
            <button
              type="button"
              onClick={() => { setEditingPeriodId(null); setForm({ name: "", amount: "", year: new Date().getFullYear() }); }}
              className="px-4 bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {periods.map((p) => (
            <li key={p.id} className="py-2 text-sm flex justify-between items-center gap-2 flex-wrap">
              <button onClick={() => setSelectedPeriod(p.id)} className="text-left">
                {p.name} — {p.paidCount} pagadas / {p.pendingCount} pendientes
              </button>
              <span className="flex gap-2 items-center">
                <button onClick={() => generate(p.id)} className="text-xs bg-brand text-white px-2 py-1 rounded">
                  Generar cuotas de socios
                </button>
                <button onClick={() => startEditPeriod(p)} className="text-xs text-brand hover:underline">Editar</button>
                <button onClick={() => deletePeriod(p.id, p.name)} className="text-xs text-red-600 hover:underline">Borrar</button>
              </span>
            </li>
          ))}
          {periods.length === 0 && <p className="text-sm text-gray-400">Sin periodos todavía.</p>}
        </ul>
      </div>

      {selectedPeriod && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-medium mb-2">Cuotas del periodo</h2>
          <ul className="divide-y">
            {fees.map((f) => (
              <li key={f.id} className="py-2 text-sm flex justify-between items-center">
                <span>{f.member?.firstName} {f.member?.lastName}</span>
                <span className="flex items-center gap-2">
                  {f.paid ? (
                    <span className="text-green-600">Pagada</span>
                  ) : (
                    <button onClick={() => pay(f.id)} className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                      Marcar pagada
                    </button>
                  )}
                  <button onClick={() => removeFee(f.id)} className="text-xs text-red-600 hover:underline">
                    Borrar
                  </button>
                </span>
              </li>
            ))}
            {fees.length === 0 && <p className="text-sm text-gray-400">Sin cuotas generadas todavía.</p>}
          </ul>
        </div>
      )}
    </div>
  );
}
