import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useConfirm } from "../context/ConfirmContext";

const EMPTY = { amount: "", paymentMethod: "efectivo", reason: "" };
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

export default function Donations() {
  const confirm = useConfirm();
  const [donations, setDonations] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState<number | "">(CURRENT_YEAR);

  async function load() {
    const { data } = await api.get("/donations", { params: { year: year || undefined } });
    setDonations(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

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
    setShowForm(false);
    load();
  }

  function startEdit(d: any) {
    setEditingId(d.id);
    setForm({ amount: String(d.amount), paymentMethod: d.paymentMethod, reason: d.reason || "" });
    setShowForm(true);
  }

  async function remove(id: string) {
    if (!(await confirm({ title: "Borrar donativo", message: "¿Seguro que quieres borrar este donativo? No se puede deshacer.", danger: true, confirmLabel: "Borrar" }))) return;
    await api.delete(`/donations/${id}`);
    load();
  }

  const total = donations.reduce((acc, d) => acc + Number(d.amount), 0);
  const fmt = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Donativos</h1>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            if (showForm) {
              setEditingId(null);
              setForm(EMPTY);
            }
          }}
          className="text-sm bg-brand text-white px-3 py-2 rounded-lg"
        >
          {showForm ? "Cerrar" : "+ Nuevo donativo"}
        </button>
      </div>

      <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl shadow-md p-6 text-center text-white">
        <div className="text-xs uppercase tracking-wider text-white/70 mb-1">Total donativos {year || "(todos)"}</div>
        <div className="text-3xl font-bold">{fmt(total)}</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-2 flex-wrap">
        <label className="text-sm text-gray-500">Ver año</label>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">Todos</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-5 space-y-2 max-w-md">
          <h2 className="font-medium mb-1">{editingId ? "Editar donativo" : "Nuevo donativo"}</h2>
          <input
            placeholder="Importe"
            type="number"
            step="0.01"
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
            <button className="flex-1 bg-brand hover:bg-brand-light text-white rounded-lg py-2.5 font-medium transition-colors">
              {editingId ? "Guardar cambios" : "Registrar donativo"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
                setShowForm(false);
              }}
              className="px-4 bg-gray-200 rounded-lg"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <ul className="divide-y">
          {donations.map((d) => (
            <li key={d.id} className="py-2.5 text-sm flex justify-between items-center gap-2">
              <span className="min-w-0">
                <div className="truncate">{d.reason || "Donativo"} {d.member ? `— ${d.member.firstName} ${d.member.lastName}` : ""}</div>
                <div className="text-gray-400 text-xs">{new Date(d.date).toLocaleDateString("es-ES")}</div>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-emerald-600 font-medium">{fmt(Number(d.amount))}</span>
                <button onClick={() => startEdit(d)} className="text-brand text-xs hover:underline">Editar</button>
                <button onClick={() => remove(d.id)} className="text-red-600 text-xs hover:underline">Borrar</button>
              </span>
            </li>
          ))}
          {donations.length === 0 && <p className="text-sm text-gray-400">Sin donativos {year ? `en ${year}` : ""}.</p>}
        </ul>
      </div>
    </div>
  );
}
