import { useEffect, useState } from "react";
import { api } from "../api/client";

const CASH_REGISTER_ID = "00000000-0000-0000-0000-000000000001";

export default function Cash() {
  const [register, setRegister] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await api.get(`/cash-registers/${CASH_REGISTER_ID}`);
    setRegister(data);
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
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-semibold">Caja — {register.name}</h1>

      {/* Saldo destacado */}
      <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl shadow-md p-6 text-center text-white">
        <div className="text-xs uppercase tracking-wider text-white/70 mb-1">Saldo actual</div>
        <div className="text-4xl font-bold">
          {Number(register.currentBalance).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
        </div>
      </div>

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

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="font-medium mb-3 text-sm text-gray-500 uppercase tracking-wide">Últimos movimientos</h2>
        {(!register.movements || register.movements.length === 0) && (
          <p className="text-sm text-gray-400">Sin movimientos todavía.</p>
        )}
        <ul className="divide-y">
          {register.movements?.map((m: any) => (
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
