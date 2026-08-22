import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useConfirm } from "../context/ConfirmContext";

interface ItemForm {
  number: string;
  price: string;
  donationAmount: string;
  unitsReceived: string;
}

interface SaleForm {
  unitType: "decimo" | "sabana";
  unitsSold: string;
  amountPaid: string;
  establishmentName: string;
  series: string;
  paid: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

export default function Lottery() {
  const confirm = useConfirm();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignForm, setCampaignForm] = useState({ name: "", drawDate: "" });
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [openCampaigns, setOpenCampaigns] = useState<Record<string, boolean>>({});
  const [showItemForm, setShowItemForm] = useState<Record<string, boolean>>({});
  const [itemForms, setItemForms] = useState<Record<string, ItemForm>>({});
  const [saleForms, setSaleForms] = useState<Record<string, SaleForm>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"all" | "decimo" | "sabana">("all");
  const [historyYear, setHistoryYear] = useState<number>(CURRENT_YEAR);
  const [showHistory, setShowHistory] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  async function load() {
    const { data } = await api.get("/lottery/campaigns");
    setCampaigns(data);
  }

  async function loadHistory() {
    const { data } = await api.get("/lottery/sales", {
      params: { year: historyYear, ...(historyFilter === "all" ? {} : { unitType: historyFilter }) },
    });
    setHistory(data);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (showHistory) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHistory, historyFilter, historyYear]);

  function toggleCampaign(id: string) {
    setOpenCampaigns((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignForm.name.trim()) {
      setError("Ponle un nombre a la campaña");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/lottery/campaigns", {
        name: campaignForm.name,
        drawDate: campaignForm.drawDate || undefined,
      });
      setCampaignForm({ name: "", drawDate: "" });
      setShowCampaignForm(false);
      await load();
      setOpenCampaigns((prev) => ({ ...prev, [data.id]: true }));
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido crear la campaña");
    } finally {
      setLoading(false);
    }
  }

  async function deleteCampaign(id: string, name: string) {
    if (!(await confirm({ title: "Borrar campaña", message: `¿Seguro que quieres borrar la campaña "${name}"? Se borrarán también sus números y ventas. No se puede deshacer.`, danger: true, confirmLabel: "Borrar" }))) return;
    try {
      await api.delete(`/lottery/campaigns/${id}`);
      await load();
      if (showHistory) loadHistory();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido borrar la campaña");
    }
  }

  function itemFormFor(campaignId: string): ItemForm {
    return itemForms[campaignId] || { number: "", price: "", donationAmount: "", unitsReceived: "" };
  }

  async function createItem(campaignId: string, e: React.FormEvent) {
    e.preventDefault();
    const form = itemFormFor(campaignId);
    if (!form.number || !form.price) {
      setError("Rellena al menos número y precio");
      return;
    }
    setError("");
    try {
      await api.post("/lottery/items", {
        campaignId,
        number: form.number,
        price: Number(form.price),
        donationAmount: Number(form.donationAmount || 0),
        unitsReceived: form.unitsReceived ? Number(form.unitsReceived) : undefined,
      });
      setItemForms((prev) => ({ ...prev, [campaignId]: { number: "", price: "", donationAmount: "", unitsReceived: "" } }));
      setShowItemForm((prev) => ({ ...prev, [campaignId]: false }));
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido añadir el número");
    }
  }

  function saleFormFor(itemId: string): SaleForm {
    return (
      saleForms[itemId] || {
        unitType: "decimo",
        unitsSold: "1",
        amountPaid: "",
        establishmentName: "",
        series: "",
        paid: true,
      }
    );
  }

  async function registerSale(item: any, e: React.FormEvent) {
    e.preventDefault();
    const form = saleFormFor(item.id);
    const units = Number(form.unitsSold || 1);
    const defaultAmount = form.unitType === "sabana" ? Number(item.price) * 10 * units : Number(item.price) * units;
    const amount = Number(form.amountPaid || defaultAmount);
    try {
      await api.post("/lottery/sales", {
        lotteryItemId: item.id,
        unitType: form.unitType,
        unitsSold: units,
        amountPaid: amount,
        establishmentName: form.establishmentName || undefined,
        series: form.series || undefined,
        paymentStatus: form.paid ? "paid" : "pending",
      });
      setSaleForms((prev) => ({
        ...prev,
        [item.id]: { unitType: "decimo", unitsSold: "1", amountPaid: "", establishmentName: "", series: "", paid: true },
      }));
      load();
      if (showHistory) loadHistory();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido registrar la venta");
    }
  }

  function startEditSale(s: any) {
    setEditingSaleId(s.id);
    setEditForm({
      unitsSold: s.unitsSold,
      amountPaid: s.amountPaid,
      series: s.series || "",
      establishmentName: s.establishmentName || "",
      paid: s.paymentStatus === "paid",
      delivered: s.delivered,
    });
  }

  async function saveEditSale(id: string) {
    try {
      await api.put(`/lottery/sales/${id}`, {
        unitsSold: Number(editForm.unitsSold),
        amountPaid: Number(editForm.amountPaid),
        series: editForm.series || null,
        establishmentName: editForm.establishmentName || null,
        paymentStatus: editForm.paid ? "paid" : "pending",
        delivered: editForm.delivered,
      });
      setEditingSaleId(null);
      loadHistory();
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido guardar el cambio");
    }
  }

  const totalCampaigns = campaigns.length;
  const totalItems = campaigns.reduce((acc, c) => acc + (c.items?.length || 0), 0);
  const totalSold = campaigns.reduce((acc, c) => acc + (c.items?.reduce((s: number, i: any) => s + (i.sold || 0), 0) || 0), 0);
  const totalRevenue = campaigns.reduce(
    (acc, c) => acc + (c.items?.reduce((s: number, i: any) => s + Number(i.price) * (i.sold || 0), 0) || 0),
    0
  );
  const fmt = (n: number) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Lotería</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory((v) => !v)} className="text-sm bg-gray-700 text-white px-3 py-2 rounded-lg">
            {showHistory ? "Ocultar historial" : "Ver historial"}
          </button>
          <button onClick={() => setShowCampaignForm((v) => !v)} className="text-sm bg-brand text-white px-3 py-2 rounded-lg">
            {showCampaignForm ? "Cerrar" : "+ Nueva campaña"}
          </button>
        </div>
      </div>

      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-2xl">🎟️</div>
            <div className="text-sm text-gray-500 mt-1">Campañas</div>
            <div className="text-xl font-semibold">{totalCampaigns}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-2xl">🔢</div>
            <div className="text-sm text-gray-500 mt-1">Números en juego</div>
            <div className="text-xl font-semibold">{totalItems}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="text-2xl">✅</div>
            <div className="text-sm text-gray-500 mt-1">Décimos vendidos</div>
            <div className="text-xl font-semibold">{totalSold}</div>
          </div>
          <div className="bg-gradient-to-br from-brand to-brand-dark rounded-2xl shadow-sm p-4 text-white">
            <div className="text-2xl">💰</div>
            <div className="text-sm text-white/70 mt-1">Recaudado</div>
            <div className="text-xl font-semibold">{fmt(totalRevenue)}</div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={historyYear}
              onChange={(e) => setHistoryYear(Number(e.target.value))}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {(["all", "decimo", "sabana"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg ${
                  historyFilter === f ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {f === "all" ? "Todos" : f === "decimo" ? "Décimos" : "Sábanas"}
              </button>
            ))}
          </div>
          <ul className="divide-y">
            {history.map((s: any) => (
              <li key={s.id} className="py-2 text-sm">
                {editingSaleId === s.id ? (
                  <div className="space-y-1.5 bg-gray-50 rounded-lg p-2">
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="number"
                        value={editForm.unitsSold}
                        onChange={(e) => setEditForm({ ...editForm, unitsSold: e.target.value })}
                        placeholder="Unidades"
                        className="border rounded-lg px-2 py-1 text-sm w-20"
                      />
                      <input
                        type="number"
                        value={editForm.amountPaid}
                        onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })}
                        placeholder="Importe"
                        className="border rounded-lg px-2 py-1 text-sm w-24"
                      />
                      <input
                        value={editForm.series}
                        onChange={(e) => setEditForm({ ...editForm, series: e.target.value })}
                        placeholder="Serie"
                        className="border rounded-lg px-2 py-1 text-sm w-24"
                      />
                      <input
                        value={editForm.establishmentName}
                        onChange={(e) => setEditForm({ ...editForm, establishmentName: e.target.value })}
                        placeholder="Establecimiento"
                        className="border rounded-lg px-2 py-1 text-sm flex-1 min-w-[120px]"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={editForm.paid} onChange={(e) => setEditForm({ ...editForm, paid: e.target.checked })} />
                        Pagado
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={editForm.delivered} onChange={(e) => setEditForm({ ...editForm, delivered: e.target.checked })} />
                        Entregado
                      </label>
                      <button onClick={() => saveEditSale(s.id)} className="text-xs bg-brand text-white px-2 py-1 rounded ml-auto">Guardar</button>
                      <button onClick={() => setEditingSaleId(null)} className="text-xs text-gray-500">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between flex-wrap gap-1">
                    <span>
                      {s.lotteryItem?.campaign?.name} — Número {s.lotteryItem?.number} ({s.unitType === "sabana" ? "sábana" : "décimo"}) — {s.unitsSold} uds
                      {s.series && <span className="text-gray-500"> · serie {s.series}</span>}
                      {s.establishmentName && <span className="text-gray-500"> · {s.establishmentName}</span>}
                      {s.paymentStatus === "pending" && <span className="text-amber-600"> · pendiente de pago</span>}
                      <br />
                      <span className="text-xs text-gray-400">{s.createdBy?.fullName} — {new Date(s.saleDate).toLocaleString("es-ES")}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{Number(s.amountPaid).toFixed(2)} €</span>
                      <button onClick={() => startEditSale(s)} className="text-xs text-brand hover:underline">Editar</button>
                    </span>
                  </div>
                )}
              </li>
            ))}
            {history.length === 0 && <p className="text-sm text-gray-400">Sin ventas registradas en {historyYear}.</p>}
          </ul>
        </div>
      )}

      {showCampaignForm && (
        <form onSubmit={createCampaign} className="bg-white rounded-2xl shadow-sm p-5 space-y-2 max-w-md">
          <h2 className="font-medium mb-1">Nueva campaña</h2>
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
          <button disabled={loading} className="w-full bg-brand hover:bg-brand-light text-white rounded-lg py-2.5 font-medium transition-colors disabled:opacity-60">
            {loading ? "Creando…" : "Crear campaña"}
          </button>
        </form>
      )}

      {campaigns.length === 0 && (
        <p className="text-gray-400 text-sm">Aún no hay campañas de lotería. Crea la primera arriba.</p>
      )}

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button onClick={() => toggleCampaign(c.id)} className="w-full flex justify-between items-center px-5 py-3.5 text-left hover:bg-gray-50 transition-colors">
              <span className="font-medium">
                {c.name} <span className="text-gray-400 font-normal text-sm">({c.items?.length || 0} números)</span>
              </span>
              <span className="flex items-center gap-3">
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCampaign(c.id, c.name);
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Borrar
                </span>
                <span className="text-gray-400">{openCampaigns[c.id] ? "▲" : "▼"}</span>
              </span>
            </button>

            {openCampaigns[c.id] && (
              <div className="px-5 pb-5 space-y-3">
                <ul className="divide-y">
                  {c.items?.map((item: any) => (
                    <li key={item.id} className="py-3 text-sm space-y-2">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <span className="font-medium">Número {item.number} — {Number(item.price).toFixed(2)} €</span>
                        <span className="text-gray-400 text-xs">
                          {item.unitsReceived != null ? `${item.unitsReceived} recibidas · ` : ""}
                          {item.sold} vendidas{item.pending != null ? ` · ${item.pending} pendientes` : ""}
                        </span>
                      </div>
                      <form onSubmit={(e) => registerSale(item, e)} className="flex flex-wrap gap-2 items-center">
                        <select
                          value={saleFormFor(item.id).unitType}
                          onChange={(e) => setSaleForms((prev) => ({ ...prev, [item.id]: { ...saleFormFor(item.id), unitType: e.target.value as "decimo" | "sabana" } }))}
                          className="border rounded-lg px-2 py-1 text-sm"
                        >
                          <option value="decimo">Décimo</option>
                          <option value="sabana">Sábana (10 décimos)</option>
                        </select>
                        <input
                          type="number"
                          min={1}
                          placeholder="Unidades"
                          value={saleFormFor(item.id).unitsSold}
                          onChange={(e) => setSaleForms((prev) => ({ ...prev, [item.id]: { ...saleFormFor(item.id), unitsSold: e.target.value } }))}
                          className="border rounded-lg px-2 py-1 w-20 text-sm"
                        />
                        <input
                          type="number"
                          placeholder={`Importe (${item.price} € × ud.)`}
                          value={saleFormFor(item.id).amountPaid}
                          onChange={(e) => setSaleForms((prev) => ({ ...prev, [item.id]: { ...saleFormFor(item.id), amountPaid: e.target.value } }))}
                          className="border rounded-lg px-2 py-1 w-32 text-sm"
                        />
                        <input
                          placeholder="Serie (opcional)"
                          value={saleFormFor(item.id).series}
                          onChange={(e) => setSaleForms((prev) => ({ ...prev, [item.id]: { ...saleFormFor(item.id), series: e.target.value } }))}
                          className="border rounded-lg px-2 py-1 w-28 text-sm"
                        />
                        <input
                          placeholder="Establecimiento (opcional)"
                          value={saleFormFor(item.id).establishmentName}
                          onChange={(e) => setSaleForms((prev) => ({ ...prev, [item.id]: { ...saleFormFor(item.id), establishmentName: e.target.value } }))}
                          className="border rounded-lg px-2 py-1 flex-1 min-w-[130px] text-sm"
                        />
                        <label className="flex items-center gap-1 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={saleFormFor(item.id).paid}
                            onChange={(e) => setSaleForms((prev) => ({ ...prev, [item.id]: { ...saleFormFor(item.id), paid: e.target.checked } }))}
                          />
                          Pagado
                        </label>
                        <button className="bg-brand hover:bg-brand-light text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">
                          Registrar
                        </button>
                      </form>
                    </li>
                  ))}
                  {(!c.items || c.items.length === 0) && (
                    <p className="text-sm text-gray-400 py-2">Sin números todavía en esta campaña.</p>
                  )}
                </ul>

                {showItemForm[c.id] ? (
                  <form onSubmit={(e) => createItem(c.id, e)} className="border-t pt-3 flex flex-wrap gap-2 items-center">
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
                      className="border rounded-lg px-2 py-1 text-sm w-24"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Donativo €"
                      value={itemFormFor(c.id).donationAmount}
                      onChange={(e) => setItemForms((prev) => ({ ...prev, [c.id]: { ...itemFormFor(c.id), donationAmount: e.target.value } }))}
                      className="border rounded-lg px-2 py-1 text-sm w-24"
                    />
                    <input
                      type="number"
                      placeholder="Unidades recibidas (opcional)"
                      value={itemFormFor(c.id).unitsReceived}
                      onChange={(e) => setItemForms((prev) => ({ ...prev, [c.id]: { ...itemFormFor(c.id), unitsReceived: e.target.value } }))}
                      className="border rounded-lg px-2 py-1 text-sm w-44"
                    />
                    <button className="bg-gray-700 hover:bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors">
                      Guardar número
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowItemForm((prev) => ({ ...prev, [c.id]: false }))}
                      className="text-xs text-gray-500"
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowItemForm((prev) => ({ ...prev, [c.id]: true }))}
                    className="border-t pt-3 w-full text-left text-sm text-brand font-medium"
                  >
                    + Añadir número
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
