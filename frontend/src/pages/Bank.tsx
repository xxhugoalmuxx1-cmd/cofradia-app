import { useEffect, useState } from "react";
import { api } from "../api/client";

const EMPTY_ACCOUNT = { name: "", bankName: "", iban: "", initialBalance: "" };
const EMPTY_MOVEMENT = { type: "in", amount: "", concept: "" };
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function Bank() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_ACCOUNT);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [movements, setMovements] = useState<any[]>([]);
  const [moveForm, setMoveForm] = useState(EMPTY_MOVEMENT);
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [error, setError] = useState("");

  async function load() {
    const { data } = await api.get("/bank-accounts");
    setAccounts(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadMovements(accountId: string) {
    const { data } = await api.get(`/bank-accounts/${accountId}/movements`, {
      params: { year: filterYear || undefined, month: filterMonth || undefined },
    });
    setMovements(data);
  }

  useEffect(() => {
    if (selected) loadMovements(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, filterYear, filterMonth]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Ponle un nombre a la cuenta");
      return;
    }
    try {
      const { data } = await api.post("/bank-accounts", {
        name: form.name,
        bankName: form.bankName,
        iban: form.iban,
        initialBalance: Number(form.initialBalance || 0),
      });
      setForm(EMPTY_ACCOUNT);
      setShowForm(false);
      await load();
      setSelected(data.id);
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido crear la cuenta");
    }
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
  const selectedAccount = accounts.find((a) => a.id === selected);
  const totalBanks = accounts.reduce((acc, a) => acc + Number(a.currentBalance), 0);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Cuentas bancarias</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm bg-brand text-white px-3 py-2 rounded-lg"
        >
          {showForm ? "Cerrar" : "+ Nueva cuenta"}
        </button>
      </div>

      <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl shadow-md p-6 text-center text-white">
        <div className="text-xs uppercase tracking-wider text-white/70 mb-1">Total en bancos</div>
        <div className="text-3xl font-bold">{fmt(totalBanks)}</div>
      </div>

      <p className="text-sm text-gray-500">
        Aquí va el dinero que está en el banco (no en efectivo) — para el saldo inicial, crea la cuenta y pon
        ese importe en "Saldo inicial". Se sumará al "Saldo total" del Dashboard junto con la Caja.
      </p>

      {showForm && (
        <form onSubmit={createAccount} className="bg-white rounded-2xl shadow-sm p-5 space-y-2">
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
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-brand hover:bg-brand-light text-white rounded-lg py-2.5 font-medium transition-colors">
            Crear cuenta
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm divide-y">
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelected(selected === a.id ? "" : a.id)}
            className={`w-full text-left flex justify-between items-center px-5 py-3.5 transition-colors ${
              selected === a.id ? "bg-brand/5" : "hover:bg-gray-50"
            }`}
          >
            <span className={selected === a.id ? "font-semibold text-brand" : ""}>
              {a.name} {a.bankName && <span className="text-gray-400 font-normal text-sm">({a.bankName})</span>}
            </span>
            <span className="font-medium">{fmt(a.currentBalance)}</span>
          </button>
        ))}
        {accounts.length === 0 && <p className="text-sm text-gray-400 p-5">Sin cuentas todavía.</p>}
      </div>

      {selected && selectedAccount && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h2 className="font-medium">Movimientos — {selectedAccount.name}</h2>
          <div className="flex flex-wrap gap-2 items-center bg-gray-50 rounded-lg p-2">
            <span className="text-xs text-gray-500">Ver por:</span>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : "")} className="border rounded-lg px-2 py-1 text-sm">
              <option value="">Todos los años</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : "")} className="border rounded-lg px-2 py-1 text-sm" disabled={!filterYear}>
              <option value="">Todo el año</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
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
            <button className="bg-brand hover:bg-brand-light text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">
              Añadir
            </button>
          </form>
          <ul className="divide-y">
            {movements.map((m) => (
              <li key={m.id} className="py-2.5 text-sm flex justify-between items-start gap-2">
                <span className="min-w-0">
                  <div className="truncate">{m.concept}</div>
                  <div className="text-gray-400 text-xs">{new Date(m.date).toLocaleDateString("es-ES")}</div>
                </span>
                <span className={`font-medium shrink-0 ${m.type === "in" ? "text-emerald-600" : "text-red-600"}`}>
                  {m.type === "in" ? "+" : "-"}
                  {fmt(m.amount)}
                </span>
              </li>
            ))}
            {movements.length === 0 && <p className="text-sm text-gray-400">Sin movimientos en este periodo.</p>}
          </ul>
        </div>
      )}
    </div>
  );
}
