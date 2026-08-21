import { useEffect, useState } from "react";
import { api } from "../api/client";

const EMPTY_ACCOUNT = { name: "", bankName: "", iban: "", initialBalance: "" };
const EMPTY_MOVEMENT = { type: "in", amount: "", concept: "" };

export default function Bank() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_ACCOUNT);
  const [selected, setSelected] = useState<string>("");
  const [movements, setMovements] = useState<any[]>([]);
  const [moveForm, setMoveForm] = useState(EMPTY_MOVEMENT);

  async function load() {
    const { data } = await api.get("/bank-accounts");
    setAccounts(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadMovements(accountId: string) {
    const { data } = await api.get(`/bank-accounts/${accountId}/movements`);
    setMovements(data);
  }

  useEffect(() => {
    if (selected) loadMovements(selected);
  }, [selected]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/bank-accounts", {
      name: form.name,
      bankName: form.bankName,
      iban: form.iban,
      initialBalance: Number(form.initialBalance || 0),
    });
    setForm(EMPTY_ACCOUNT);
    load();
  }

  async function addMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !moveForm.amount) return;
    await api.post(`/bank-accounts/${selected}/movements`, {
      type: moveForm.type,
      amount: Number(moveForm.amount),
      concept: moveForm.concept || (moveForm.type === "in" ? "Ingreso" : "Salida"),
    });
    setMoveForm(EMPTY_MOVEMENT);
    load();
    loadMovements(selected);
  }

  const fmt = (n: number) => Number(n).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Cuentas bancarias</h1>
      <p className="text-sm text-gray-500 -mt-4">
        Aquí va el dinero que está en el banco (no en efectivo) — para el saldo inicial, crea la cuenta y pon
        ese importe en "Saldo inicial". Se sumará al "Saldo total" del Dashboard junto con la Caja.
      </p>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {accounts.map((a) => (
            <li key={a.id} className="py-2 text-sm">
              <button onClick={() => setSelected(a.id)} className={`w-full text-left flex justify-between items-center ${selected === a.id ? "font-semibold text-brand" : ""}`}>
                <span>
                  {a.name} {a.bankName && <span className="text-gray-400">({a.bankName})</span>}
                </span>
                <span>{fmt(a.currentBalance)}</span>
              </button>
            </li>
          ))}
          {accounts.length === 0 && <p className="text-sm text-gray-400">Sin cuentas todavía.</p>}
        </ul>
      </div>

      <form onSubmit={createAccount} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-medium mb-1">Nueva cuenta bancaria</h2>
        <input
          placeholder="Nombre (ej. Cuenta principal)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <input
          placeholder="Banco (ej. CaixaBank)"
          value={form.bankName}
          onChange={(e) => setForm({ ...form, bankName: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="IBAN (opcional)"
          value={form.iban}
          onChange={(e) => setForm({ ...form, iban: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Saldo inicial (el que ya tenéis ahora en el banco)"
          type="number"
          step="0.01"
          value={form.initialBalance}
          onChange={(e) => setForm({ ...form, initialBalance: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <button className="w-full bg-brand text-white rounded-lg py-2">Crear cuenta</button>
      </form>

      {selected && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="font-medium">Movimientos</h2>
          <form onSubmit={addMovement} className="flex flex-wrap gap-2 items-center">
            <select
              value={moveForm.type}
              onChange={(e) => setMoveForm({ ...moveForm, type: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
            </select>
            <input
              placeholder="Concepto"
              value={moveForm.concept}
              onChange={(e) => setMoveForm({ ...moveForm, concept: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[120px]"
            />
            <input
              placeholder="Importe"
              type="number"
              step="0.01"
              value={moveForm.amount}
              onChange={(e) => setMoveForm({ ...moveForm, amount: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm w-28"
            />
            <button className="bg-brand text-white rounded-lg px-3 py-1.5 text-sm">Añadir</button>
          </form>
          <ul className="divide-y">
            {movements.map((m) => (
              <li key={m.id} className="py-2 text-sm flex justify-between">
                <span>
                  {m.concept}
                  <br />
                  <span className="text-gray-400 text-xs">{new Date(m.date).toLocaleDateString("es-ES")}</span>
                </span>
                <span className={m.type === "in" ? "text-emerald-600" : "text-red-600"}>
                  {m.type === "in" ? "+" : "-"}
                  {fmt(m.amount)}
                </span>
              </li>
            ))}
            {movements.length === 0 && <p className="text-sm text-gray-400">Sin movimientos todavía.</p>}
          </ul>
        </div>
      )}
    </div>
  );
}
