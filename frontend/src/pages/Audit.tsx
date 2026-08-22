import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [day, setDay] = useState("");
  const [showClear, setShowClear] = useState(false);
  const [clearBefore, setClearBefore] = useState("");

  async function load() {
    const { data } = await api.get("/audit-logs", { params: day ? { from: day, to: day } : {} });
    setLogs(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  async function removeLog(id: string) {
    if (!window.confirm("¿Borrar este registro de auditoría?")) return;
    try {
      await api.delete(`/audit-logs/${id}`);
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.error || "No se ha podido borrar el registro.");
    }
  }

  async function clearOlderThan() {
    if (!clearBefore) return;
    if (!window.confirm(`Esto borrará todos los registros anteriores al ${clearBefore}. ¿Continuar?`)) return;
    try {
      const { data } = await api.delete("/audit-logs", { params: { before: clearBefore } });
      window.alert(`Se han borrado ${data.deleted} registros.`);
      setShowClear(false);
      setClearBefore("");
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.error || "No se ha podido completar el borrado.");
    }
  }

  // Agrupa por día para verlo más claro
  const grouped: Record<string, any[]> = {};
  for (const log of logs) {
    const day = new Date(log.createdAt).toLocaleDateString("es-ES");
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(log);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Auditoría</h1>
        <button onClick={() => setShowClear((v) => !v)} className="text-xs text-red-600 hover:underline">
          Limpiar registros antiguos…
        </button>
      </div>

      {showClear && (
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-2 flex-wrap">
          <label className="text-sm text-gray-500">Borrar todo lo anterior a:</label>
          <input
            type="date"
            value={clearBefore}
            onChange={(e) => setClearBefore(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={clearOlderThan} disabled={!clearBefore} className="bg-red-600 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-50">
            Borrar
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-2 flex-wrap">
        <label className="text-sm text-gray-500">Ver solo un día:</label>
        <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        {day && (
          <button onClick={() => setDay("")} className="text-xs text-gray-500 underline">
            Ver todos
          </button>
        )}
      </div>

      {Object.entries(grouped).map(([dayLabel, dayLogs]) => (
        <div key={dayLabel} className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-2">{dayLabel}</h2>
          <ul className="divide-y">
            {dayLogs.map((l) => (
              <li key={l.id} className="py-2 text-sm flex justify-between items-start gap-2">
                <span>
                  <span className="font-medium">{l.user?.fullName}</span> — {l.action} en {l.module}
                  <br />
                  <span className="text-gray-400 text-xs">
                    {new Date(l.createdAt).toLocaleTimeString("es-ES")}
                  </span>
                </span>
                <button onClick={() => removeLog(l.id)} className="text-red-600 text-xs hover:underline shrink-0">
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {logs.length === 0 && <p className="text-sm text-gray-400">Sin registros para mostrar.</p>}
    </div>
  );
}
