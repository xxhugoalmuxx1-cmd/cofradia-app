import { useState } from "react";
import { api } from "../api/client";

export default function Reports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ledger, setLedger] = useState<any[]>([]);
  const [totals, setTotals] = useState<{ totalIncome: number; totalExpenses: number; finalBalance: number } | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadLedger() {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/ledger", { params: { from: from || undefined, to: to || undefined } });
      setLedger(data.ledger);
      setTotals({ totalIncome: data.totalIncome, totalExpenses: data.totalExpenses, finalBalance: data.finalBalance });
    } finally {
      setLoading(false);
    }
  }

  async function exportFile(format: "csv" | "excel" | "pdf") {
    const res = await api.get("/reports/export", { params: { from, to, format }, responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `informe.${format === "excel" ? "xlsx" : format}`;
    link.click();
  }

  const fmt = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Informes</h1>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-3">Rango de fechas</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-gray-400">Desde</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-gray-400">Hasta</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
        <button
          onClick={loadLedger}
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-light text-white rounded-lg py-2.5 font-medium transition-colors disabled:opacity-60"
        >
          {loading ? "Calculando…" : "Consultar movimientos"}
        </button>
      </div>

      {totals && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Ingresos</div>
            <div className="text-lg font-semibold text-emerald-600 mt-1">{fmt(totals.totalIncome)}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Gastos</div>
            <div className="text-lg font-semibold text-red-600 mt-1">{fmt(totals.totalExpenses)}</div>
          </div>
          <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl shadow-sm p-4 text-center text-white">
            <div className="text-xs text-white/70 uppercase tracking-wide">Saldo final</div>
            <div className="text-lg font-semibold mt-1">{fmt(totals.finalBalance)}</div>
          </div>
        </div>
      )}

      {ledger.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b">
                <th className="py-2 pr-2">Fecha</th>
                <th className="py-2 pr-2">Concepto</th>
                <th className="py-2 pr-2">Origen</th>
                <th className="py-2 pr-2 text-right">Ingresos</th>
                <th className="py-2 pr-2 text-right">Gastos</th>
                <th className="py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-2 whitespace-nowrap text-gray-500">{new Date(r.date).toLocaleDateString("es-ES")}</td>
                  <td className="py-2 pr-2">{r.concept}</td>
                  <td className="py-2 pr-2 text-gray-400 text-xs">{r.source}</td>
                  <td className="py-2 pr-2 text-right text-emerald-600">{r.income > 0 ? fmt(r.income) : ""}</td>
                  <td className="py-2 pr-2 text-right text-red-600">{r.expense > 0 ? fmt(r.expense) : ""}</td>
                  <td className="py-2 text-right font-medium">{fmt(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totals && ledger.length === 0 && (
        <p className="text-sm text-gray-400">Sin movimientos en ese rango de fechas.</p>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-3">Exportar</h2>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => exportFile("csv")} className="bg-gray-700 hover:bg-gray-800 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
            CSV
          </button>
          <button onClick={() => exportFile("excel")} className="bg-gray-700 hover:bg-gray-800 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
            Excel
          </button>
          <button onClick={() => exportFile("pdf")} className="bg-gray-700 hover:bg-gray-800 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}
