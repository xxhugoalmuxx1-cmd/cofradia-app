import { useState } from "react";
import { api } from "../api/client";

export default function Reports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [balance, setBalance] = useState<any>(null);

  async function loadBalance() {
    const { data } = await api.get("/reports/balance", { params: { from, to } });
    setBalance(data);
  }

  async function exportFile(format: "csv" | "excel" | "pdf") {
    const res = await api.get("/reports/export", { params: { from, to, format }, responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `informe.${format === "excel" ? "xlsx" : format}`;
    link.click();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Informes</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-lg px-3 py-2 flex-1" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-3 py-2 flex-1" />
        </div>
        <button onClick={loadBalance} className="w-full bg-brand text-white rounded-lg py-2">Consultar balance</button>

        {balance && (
          <div className="text-sm mt-2">
            <p>Ingresos: {balance.totalIncome.toFixed(2)} €</p>
            <p>Gastos: {balance.totalExpenses.toFixed(2)} €</p>
            <p className="font-semibold">Balance: {balance.balance.toFixed(2)} €</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button onClick={() => exportFile("csv")} className="flex-1 bg-gray-700 text-white rounded-lg py-2 text-sm">CSV</button>
          <button onClick={() => exportFile("excel")} className="flex-1 bg-gray-700 text-white rounded-lg py-2 text-sm">Excel</button>
          <button onClick={() => exportFile("pdf")} className="flex-1 bg-gray-700 text-white rounded-lg py-2 text-sm">PDF</button>
        </div>
      </div>
    </div>
  );
}
