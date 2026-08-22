import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const CASH_REGISTER_ID = "00000000-0000-0000-0000-000000000001";
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function Cash() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [register, setRegister] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [filteredMovements, setFilteredMovements] = useState<any[] | null>(null);

  async function load() {
    const { data } = await api.get(`/cash-registers/${CASH_REGISTER_ID}`);
    setRegister(data);
  }

  async function loadFiltered() {
    const { data } = await api.get(`/cash-registers/${CASH_REGISTER_ID}/movements`, {
      params: { year: filterYear || undefined, month: filterMonth || undefined },
    });
    setFilteredMovements(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addMovement(type: "in" | "out") {
    if (!amount || !concept) return;
    setLoading(true);
    try {
      await api.post(`/cash-registers/${CASH_REGISTER_ID}/movements`, { type, amount: Number(amount), concept });
      setAmount("");
      setConcept("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function withdraw() {
    if (!withdrawAmount || !withdrawReason) return;
    setLoading(true);
    try {
      await api.post(`/cash-registers/${CASH_REGISTER_ID}/withdraw`, {
        amount: Number(withdrawAmount),
        reason: withdrawReason,
      });
      setWithdrawAmount("");
      setWithdrawReason("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  if (!register) return <p className="text-gray-400 text-sm">Cargando…</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Caja — {register.name}</h1>

      {/* Saldo destacado */}
      <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl shadow-md p-6 text-center text-white">
        <div className="text-xs uppercase tracking-wider text-white/70 mb-1">Saldo actual</div>
        <div className="text-4xl font-bold">
          {Number(register.currentBalance).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
        </div>
      </div>

      {isAdmin ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-medium mb-3 text-sm text-gray-500 uppercase tracking-wide">Nuevo movimiento</h2>
            <input
              placeholder="Concepto"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-2 text-sm"
            />
            <input
              placeholder="Importe"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-3 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => addMovement("in")}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                + Entrada
              </button>
              <button
                onClick={() => addMovement("out")}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                − Salida
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-medium mb-3 text-sm text-gray-500 uppercase tracking-wide">Retirar dinero</h2>
            <input
              placeholder="Motivo"
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-2 text-sm"
            />
            <input
              placeholder="Importe"
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-3 text-sm"
            />
            <button
              onClick={withdraw}
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-light text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Retirar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400">Solo un administrador puede registrar movimientos o retiradas de caja.</p>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-medium mb-3 text-sm text-gray-500 uppercase tracking-wide">Ver movimientos por mes/año</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : "")} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Año</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : "")} className="border rounded-lg px-3 py-2 text-sm" disabled={!filterYear}>
            <option value="">Todo el año</option>
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <button onClick={loadFiltered} disabled={!filterYear} className="bg-brand text-white rounded-lg px-3 py-2 text-sm disabled:opacity-50">
            Consultar
          </button>
          {filteredMovements && (
            <button onClick={() => setFilteredMovements(null)} className="text-xs text-gray-500 underline">
              Volver a últimos movimientos
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-medium mb-3 text-sm text-gray-500 uppercase tracking-wide">
          {filteredMovements ? "Movimientos del periodo seleccionado" : "Últimos movimientos"}
        </h2>
        {(filteredMovements ?? register.movements)?.length === 0 && (
          <p className="text-sm text-gray-400">Sin movimientos.</p>
        )}
        <ul className="divide-y">
          {(filteredMovements ?? register.movements)?.map((m: any) => (
            <li key={m.id} className="py-2.5 text-sm flex justify-between items-start gap-3">
              <span className="min-w-0">
                <div className="truncate">{m.concept}</div>
                <div className="text-gray-400 text-xs">
                  {m.createdBy?.fullName} — {new Date(m.createdAt).toLocaleString("es-ES")}
                </div>
              </span>
              <span className={`font-medium shrink-0 ${m.type === "in" ? "text-emerald-600" : "text-red-600"}`}>
                {m.type === "in" ? "+" : "-"}
                {Number(m.amount).toFixed(2)} €
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
