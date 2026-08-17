import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    api.get("/audit-logs").then((res) => setLogs(res.data));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Auditoría (solo lectura)</h1>
      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {logs.map((l) => (
            <li key={l.id} className="py-2 text-sm">
              <span className="font-medium">{l.user?.fullName}</span> — {l.action} en {l.module}
              <br />
              <span className="text-gray-400">{new Date(l.createdAt).toLocaleString("es-ES")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
