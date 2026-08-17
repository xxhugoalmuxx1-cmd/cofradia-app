import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Lottery() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignForm, setCampaignForm] = useState({ name: "", drawDate: "" });
  const [itemForms, setItemForms] = useState<Record<string, { number: string; price: string; donationAmount: string; unitsReceived: string }>>({});
  const [saleForms, setSaleForms] = useState<Record<string, { unitsSold: string; amountPaid: string }>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const { data } = await api.get("/lottery/campaigns");
    setCampaigns(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignForm.name.trim()) {
      setError("Ponle un nombre a la campaña");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/lottery/campaigns", {
        name: campaignForm.name,
        drawDate: campaignForm.drawDate || undefined,
      });
      setCampaignForm({ name: "", drawDate: "" });
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido crear la campaña");
    } finally {
      setLoading(false);
    }
  }

  function itemFormFor(campaignId: string) {
    return itemForms[campaignId] || { number: "", price: "", donationAmount: "", unitsReceived: "" };
  }

  async function createItem(campaignId: string, e: React.FormEvent) {
    e.preventDefault();
    const form = itemFormFor(campaignId);
    if (!form.number || !form.price || !form.unitsReceived) {
      setError("Rellena número, precio y unidades recibidas");
      return;
    }
    setError("");
    try {
      await api.post("/lottery/items", {
        campaignId,
        number: form.number,
        price: Number(form.price),
        donationAmount: Number(form.donationAmount || 0),
        unitsReceived: Number(form.unitsReceived),
      });
      setItemForms((prev) => ({ ...prev, [campaignId]: { number: "", price: "", donationAmount: "", unitsReceived: "" } }));
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido añadir el número");
    }
  }

  function saleFormFor(itemId: string) {
    return saleForms[itemId] || { unitsSold: "1", amountPaid: "" };
  }

  async function registerSale(item: any, e: React.FormEvent) {
    e.preventDefault();
    const form = saleFormFor(item.id);
    const units = Number(form.unitsSold || 1);
    const amount = Number(form.amountPaid || Number(item.price) * units);
    try {
      await api.post("/lottery/sales", {
        lotteryItemId: item.id,
        unitsSold: units,
        amountPaid: amount,
      });
      setSaleForms((prev) => ({ ...prev, [item.id]: { unitsSold: "1", amountPaid: "" } }));
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido registrar la venta");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Lotería</h1>

      <form onSubmit={createCampaign} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-medium mb-2">Nueva campaña</h2>
        <input
          placeholder="Nombre (ej. Lotería de Navidad 2026)"
          value={campaignForm.name}
          onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <input
          type="date"
          value={campaignForm.drawDate}
          onChange={(e) => setCampaignForm({ ...campaignForm, drawDate: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-brand text-white rounded-lg py-2 disabled:opacity-60">
          {loading ? "Creando…" : "Crear campaña"}
        </button>
      </form>

      {campaigns.length === 0 && (
        <p className="text-gray-400 text-sm">Aún no hay campañas de lotería. Crea la primera arriba.</p>
      )}

      {campaigns.map((c) => (
        <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 space-y-4">
          <h2 className="font-medium">{c.name}</h2>

          {/* Lista de números con su resumen de ventas */}
          <ul className="divide-y">
            {c.items?.map((item: any) => {
              return (
                <li key={item.id} className="py-3 text-sm space-y-2">
                  <div className="flex justify-between items-center flex-wrap gap-1">
                    <span className="font-medium">Número {item.number} — {Number(item.price).toFixed(2)} €</span>
                    <span className="text-gray-400 text-xs">
                      {item.unitsReceived} recibidas · {item.sold} vendidas · {item.pending} pendientes
                    </span>
                  </div>
                  <form onSubmit={(e) => registerSale(item, e)} className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      placeholder="Unidades"
                      value={saleFormFor(item.id).unitsSold}
                      onChange={(e) =>
                        setSaleForms((prev) => ({ ...prev, [item.id]: { ...saleFormFor(item.id), unitsSold: e.target.value } }))
                      }
                      className="border rounded-lg px-2 py-1 w-24 text-sm"
                    />
                    <input
                      type="number"
                      placeholder={`Importe (por defecto ${item.price} € × unidades)`}
                      value={saleFormFor(item.id).amountPaid}
                      onChange={(e) =>
                        setSaleForms((prev) => ({ ...prev, [item.id]: { ...saleFormFor(item.id), amountPaid: e.target.value } }))
                      }
                      className="border rounded-lg px-2 py-1 flex-1 text-sm"
                    />
                    <button className="bg-brand text-white rounded-lg px-3 py-1 text-sm">Registrar venta</button>
                  </form>
                </li>
              );
            })}
          </ul>

          {/* Añadir un nuevo número a esta campaña */}
          <form onSubmit={(e) => createItem(c.id, e)} className="border-t pt-3 flex flex-wrap gap-2">
            <input
              placeholder="Número"
              value={itemFormFor(c.id).number}
              onChange={(e) => setItemForms((prev) => ({ ...prev, [c.id]: { ...itemFormFor(c.id), number: e.target.value } }))}
              className="border rounded-lg px-2 py-1 text-sm w-24"
              required
            />
            <input
              type="number"
              placeholder="Precio €"
              value={itemFormFor(c.id).price}
              onChange={(e) => setItemForms((prev) => ({ ...prev, [c.id]: { ...itemFormFor(c.id), price: e.target.value } }))}
              className="border rounded-lg px-2 py-1 text-sm w-28"
              required
            />
            <input
              type="number"
              placeholder="Donativo €"
              value={itemFormFor(c.id).donationAmount}
              onChange={(e) =>
                setItemForms((prev) => ({ ...prev, [c.id]: { ...itemFormFor(c.id), donationAmount: e.target.value } }))
              }
              className="border rounded-lg px-2 py-1 text-sm w-28"
            />
            <input
              type="number"
              placeholder="Unidades recibidas"
              value={itemFormFor(c.id).unitsReceived}
              onChange={(e) =>
                setItemForms((prev) => ({ ...prev, [c.id]: { ...itemFormFor(c.id), unitsReceived: e.target.value } }))
              }
              className="border rounded-lg px-2 py-1 text-sm w-36"
              required
            />
            <button className="bg-gray-700 text-white rounded-lg px-3 py-1 text-sm">+ Añadir número</button>
          </form>
        </div>
      ))}
    </div>
  );
}
