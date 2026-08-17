import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Lottery() {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    api.get("/lottery/campaigns").then((res) => setCampaigns(res.data));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Lotería</h1>
      {campaigns.map((c) => (
        <div key={c.id} className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-medium mb-2">{c.name}</h2>
          <ul className="divide-y">
            {c.items?.map((item: any) => (
              <li key={item.id} className="py-2 text-sm flex justify-between">
                <span>Número {item.number} — {Number(item.price).toFixed(2)} €</span>
                <span className="text-gray-400">{item.unitsReceived} unidades</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {campaigns.length === 0 && <p className="text-gray-400 text-sm">Aún no hay campañas de lotería.</p>}
    </div>
  );
}
