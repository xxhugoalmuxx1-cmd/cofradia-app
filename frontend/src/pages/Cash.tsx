import { useEffect, useState } from "react";
import { api } from "../api/client";

const CASH_REGISTER_ID = "00000000-0000-0000-0000-000000000001";

export default function Cash() {
  const [register, setRegister] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  async function load() {
    const { data } = await api.get(`/cash-registers/${CASH_REGISTER_ID}`);
    setRegister(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addMovement(type: "in" | "out") {
    if (!amount || !concept) return;
    await api.post(`/cash-registers/${CASH_REGISTER_ID}/movements`, { type, amount: Number(amount), concept });
    setAmount("");
    setConcept("");
    load();
  }

  async function withdraw() {
    if (!withdrawAmount || !withdrawReason) return;
    await api.post(`/cash-registers/${CASH_REGISTER_ID}/withdraw`, {
      amount: Number(withdrawAmount),
      reason: withdrawReason,
    });
    setWithdrawAmount("");
    setWithdrawReason("");
    load();
  }

  if (!register) return <p>Cargando…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Caja — {register.name}</h1>
      <div className="bg-white rounded-xl shadow-sm p-4 text-center">
        <div className="text-sm text-gray-500">Saldo actual</div>
        <div className="text-3xl font-bold text-brand">
          {Number(register.currentBalance).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-medium mb-3">Nuevo movimiento</h2>
        <input
          placeholder="Concepto"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-2"
        />
        <input
          placeholder="Importe"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-3"
        />
        <div className="flex gap-2">
          <button onClick={() => addMovement("in")} className="flex-1 bg-green-600 text-white rounded-lg py-2">
            + Entrada
          </button>
          <button onClick={() => addMovement("out")} className="flex-1 bg-red-600 text-white rounded-lg py-2">
            − Salida
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-medium mb-3">Retirar dinero de caja</h2>
        <input
          placeholder="Motivo"
          value={withdrawReason}
          onChange={(e) => setWithdrawReason(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-2"
        />
        <input
          placeholder="Importe"
          type="number"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-3"
        />
        <button onClick={withdraw} className="w-full bg-brand text-white rounded-lg py-2">
          Retirar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-medium mb-3">Últimos movimientos</h2>
        <ul className="divide-y">
          {register.movements?.map((m: any) => (
            <li key={m.id} className="py-2 text-sm flex justify-between">
              <span>
                {m.concept}
                <br />
                <span className="text-gray-400">
                  {m.createdBy?.fullName} — {new Date(m.createdAt).toLocaleString("es-ES")}
                </span>
              </span>
              <span className={m.type === "in" ? "text-green-600" : "text-red-600"}>
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
