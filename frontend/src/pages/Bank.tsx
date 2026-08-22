import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useConfirm } from "../context/ConfirmContext";
import { useAuth } from "../context/AuthContext";

const EMPTY_ACCOUNT = { name: "", bankName: "", iban: "", initialBalance: "" };
const EMPTY_MOVEMENT = { type: "in", amount: "", concept: "" };
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Un pequeño degradado distinto por cuenta, para que cada tarjeta se
// distinga a simple vista (como tarjetas bancarias reales).
const CARD_STYLES = [
  "from-brand to-brand-dark",
  "from-slate-700 to-slate-900",
  "from-emerald-700 to-emerald-900",
  "from-amber-600 to-amber-800",
];

export default function Bank() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_ACCOUNT);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [movements, setMovements] = useState<any[]>([]);
  const [moveForm, setMoveForm] = useState(EMPTY_MOVEMENT);
  const [filterYear, setFilterYear] = useState<number | "">("");
  const [filterMonth, setFilterMonth] = useState<number | "">("");
  const [error, setError] = useState("");
  const [editingAccount, setEditingAccount] = useState(false);
  const [editAccountForm, setEditAccountForm] = useState({ name: "", bankName: "", iban: "" });

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

  async function quickMove(type: "in" | "out") {
    setMoveForm((prev) => ({ ...prev, type }));
  }

  function startEditAccount(a: any) {
    setEditAccountForm({ name: a.name, bankName: a.bankName || "", iban: a.iban || "" });
    setEditingAccount(true);
  }

  async function saveAccountEdit() {
    if (!selected) return;
    try {
      await api.put(`/bank-accounts/${selected}`, editAccountForm);
      setEditingAccount(false);
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.error || "No se ha podido guardar el cambio");
    }
  }

  const fmt = (n: number) => Number(n).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const selectedAccount = accounts.find((a) => a.id === selected);
  const totalBanks = accounts.reduce((acc, a) => acc + Number(a.currentBalance), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Cuentas bancarias</h1>
        {isAdmin && (
          <button onClick={() => setShowForm((v) => !v)} className="text-sm bg-brand text-white px-3 py-2 rounded-lg">
            {showForm ? "Cerrar" : "+ Nueva cuenta"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 bg-gradient-to-br from-brand to-brand-dark rounded-2xl shadow-md p-6 text-white flex flex-col justify-center">
          <div className="text-xs uppercase tracking-wider text-white/70 mb-1">Total en bancos</div>
          <div className="text-3xl font-bold">{fmt(totalBanks)}</div>
          <div className="text-xs text-white/60 mt-1">{accounts.length} cuenta{accounts.length !== 1 ? "s" : ""}</div>
        </div>

        {/* Cuentas como tarjetas clicables, tipo tarjeta bancaria */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setSelected(selected === a.id ? "" : a.id)}
              className={`text-left rounded-2xl p-4 text-white bg-gradient-to-br shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ${
                CARD_STYLES[i % CARD_STYLES.length]
              } ${selected === a.id ? "ring-2 ring-offset-2 ring-brand" : ""}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-2xl">🏦</span>
                {selected === a.id && <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Seleccionada</span>}
              </div>
              <div className="mt-3 font-medium truncate">{a.name}</div>
              {a.bankName && <div className="text-xs text-white/70 truncate">{a.bankName}</div>}
              <div className="text-xl font-bold mt-2">{fmt(a.currentBalance)}</div>
            </button>
          ))}
          {accounts.length === 0 && (
            <div className="sm:col-span-2 bg-white rounded-2xl shadow-sm p-6 text-center text-sm text-gray-400">
              Sin cuentas todavía. Crea la primera con el botón de arriba.
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <form onSubmit={createAccount} className="bg-white rounded-2xl shadow-sm p-5 space-y-2 max-w-md">
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

      {selected && selectedAccount && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {editingAccount ? (
              <div className="flex flex-wrap gap-2 items-center flex-1">
                <input
                  value={editAccountForm.name}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, name: e.target.value })}
                  placeholder="Nombre de la cuenta"
                  className="border rounded-lg px-2 py-1 text-sm flex-1 min-w-[140px]"
                />
                <input
                  value={editAccountForm.bankName}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, bankName: e.target.value })}
                  placeholder="Banco"
                  className="border rounded-lg px-2 py-1 text-sm flex-1 min-w-[120px]"
                />
                <button onClick={saveAccountEdit} className="text-xs bg-brand text-white px-3 py-1.5 rounded-lg">Guardar</button>
                <button onClick={() => setEditingAccount(false)} className="text-xs text-gray-500">Cancelar</button>
              </div>
            ) : (
              <h2 className="font-medium">
                Movimientos — {selectedAccount.name}
                {isAdmin && (
                  <button onClick={() => startEditAccount(selectedAccount)} className="text-xs text-brand hover:underline ml-2">
                    Editar nombre
                  </button>
                )}
              </h2>
            )}
            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => quickMove("in")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    moveForm.type === "in" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  ⬆️ Entrada
                </button>
                <button
                  onClick={() => quickMove("out")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    moveForm.type === "out" ? "bg-red-600 text-white" : "bg-red-50 text-red-700"
                  }`}
                >
                  ⬇️ Salida
                </button>
              </div>
            )}
          </div>

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
            <input
              placeholder="Concepto"
              value={moveForm.concept}
              onChange={(e) => setMoveForm({ ...moveForm, concept: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[140px]"
              disabled={!isAdmin}
            />
            <input
              placeholder="Importe"
              type="number"
              step="0.01"
              value={moveForm.amount}
              onChange={(e) => setMoveForm({ ...moveForm, amount: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm w-28"
              disabled={!isAdmin}
            />
            <button
              disabled={!isAdmin}
              className={`text-white rounded-lg px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                moveForm.type === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Añadir {moveForm.type === "in" ? "entrada" : "salida"}
            </button>
          </form>
          {!isAdmin && (
            <p className="text-xs text-gray-400">Solo un administrador puede registrar movimientos bancarios.</p>
          )}

          <ul className="divide-y">
            {movements.map((m) => (
              <li key={m.id} className="py-2.5 text-sm flex justify-between items-center gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    m.type === "in" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}>
                    {m.type === "in" ? "⬆️" : "⬇️"}
                  </span>
                  <span className="min-w-0">
                    <div className="truncate">{m.concept}</div>
                    <div className="text-gray-400 text-xs">{new Date(m.date).toLocaleDateString("es-ES")}</div>
                  </span>
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
