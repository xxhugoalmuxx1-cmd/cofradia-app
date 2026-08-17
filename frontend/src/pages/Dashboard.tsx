import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Summary {
  balance: { total: number; cash: number; bank: number };
  month: { income: number; expenses: number; balance: number };
  activity: { lotteryUnitsSold: number; salesThisMonth: number; members: number };
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    api.get("/dashboard/summary").then((res) => setSummary(res.data));
  }, []);

  if (!summary) return <p>Cargando…</p>;

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
      <h1 className="text-xl font-semibold mb-4">Dashboard</h1>
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
