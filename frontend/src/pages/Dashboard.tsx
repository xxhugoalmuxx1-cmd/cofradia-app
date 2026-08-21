import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Summary {
  balance: { total: number; cash: number; bank: number };
  month: { income: number; expenses: number; balance: number };
  activity: { lotteryUnitsSold: number; salesThisMonth: number; members: number };
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/dashboard/summary");
      setSummary(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (!summary) return <p className="text-gray-400 text-sm">Cargando…</p>;

  const Card = ({ title, value, icon }: { title: string; value: string; icon: string }) => (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="text-2xl">{icon}</div>
      <div className="text-sm text-gray-500 mt-1">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );

  const fmt = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm bg-brand text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
        >
          {loading ? "Actualizando…" : "↻ Actualizar"}
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card title="Saldo total" value={fmt(summary.balance.total)} icon="💰" />
        <Card title="Caja" value={fmt(summary.balance.cash)} icon="💵" />
        <Card title="Banco" value={fmt(summary.balance.bank)} icon="🏦" />
        <Card title="Balance del mes" value={fmt(summary.month.balance)} icon="📈" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card title="Ingresos del mes" value={fmt(summary.month.income)} icon="📥" />
        <Card title="Gastos del mes" value={fmt(summary.month.expenses)} icon="📤" />
        <Card title="Socios" value={String(summary.activity.members)} icon="👥" />
        <Card title="Ventas este mes" value={String(summary.activity.salesThisMonth)} icon="🛍️" />
        <Card title="Lotería vendida" value={String(summary.activity.lotteryUnitsSold)} icon="🎟️" />
      </div>
    </div>
  );
}
