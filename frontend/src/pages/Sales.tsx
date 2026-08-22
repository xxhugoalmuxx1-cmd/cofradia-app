import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
}

interface CartLine {
  quantity: number;
  price: number; // editable: puede diferir del precio de catálogo
  description?: string; // si existe, es una línea manual (sin producto de catálogo)
}

// Modo venta rápida (punto 12 del prompt): pensado para usarse desde el móvil.
export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [received, setReceived] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualDesc, setManualDesc] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [bankAccounts, setBankAccounts] = useState<{ id: string; name: string }[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");

  useEffect(() => {
    api.get("/products").then((res) => setProducts(res.data));
    api.get("/bank-accounts").then((res) => {
      setBankAccounts(res.data);
      if (res.data.length > 0) setBankAccountId(res.data[0].id);
    });
  }, []);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: existing
          ? { ...existing, quantity: existing.quantity + 1 }
          : { quantity: 1, price: Number(product.price) },
      };
    });
  }

  function addManualLine() {
    if (!manualPrice) return;
    const key = `manual-${Date.now()}`;
    setCart((prev) => ({
      ...prev,
      [key]: { quantity: 1, price: Number(manualPrice), description: manualDesc || "Cobro" },
    }));
    setManualDesc("");
    setManualPrice("");
  }

  function removeFromCart(id: string) {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id].quantity > 1) next[id] = { ...next[id], quantity: next[id].quantity - 1 };
      else delete next[id];
      return next;
    });
  }

  function increment(id: string) {
    setCart((prev) => ({ ...prev, [id]: { ...prev[id], quantity: prev[id].quantity + 1 } }));
  }

  function setPrice(id: string, price: string) {
    setCart((prev) => ({ ...prev, [id]: { ...prev[id], price: Number(price) || 0 } }));
  }

  const total = Object.values(cart).reduce((acc, line) => acc + line.price * line.quantity, 0);

  async function checkout() {
    const items = Object.entries(cart).map(([id, line]) =>
      line.description
        ? { description: line.description, quantity: line.quantity, unitPrice: line.price }
        : { productId: id, quantity: line.quantity, unitPrice: line.price }
    );
    if (items.length === 0) return;
    setLoading(true);
    try {
      await api.post("/sales", {
        items,
        paymentMethod,
        bankAccountId: paymentMethod !== "efectivo" ? bankAccountId || undefined : undefined,
      });
      setCart({});
      setReceived("");
      setMessage("Venta registrada ✅");
      const { data } = await api.get("/products");
      setProducts(data);
      setTimeout(() => setMessage(""), 2500);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Error al registrar la venta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Venta rápida</h1>

      {/* Cobro personalizado: para cobrar cualquier importe sin necesidad
          de tener un producto dado de alta (donativos puntuales, algo suelto...) */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-4 flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-500 shrink-0">Cobro personalizado:</span>
        <input
          placeholder="Concepto (opcional)"
          value={manualDesc}
          onChange={(e) => setManualDesc(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-[120px]"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Importe €"
          value={manualPrice}
          onChange={(e) => setManualPrice(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-sm w-28"
        />
        <button onClick={addManualLine} className="bg-gray-700 text-white rounded-lg px-3 py-1.5 text-sm">
          Añadir al carrito
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-40 md:mb-32">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => addToCart(p)}
            className="bg-white rounded-xl shadow-sm overflow-hidden text-left hover:ring-2 hover:ring-brand transition-shadow"
          >
            <div className="h-20 bg-gray-100">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">📦</div>
              )}
            </div>
            <div className="p-2.5">
              <div className="font-medium text-sm truncate">{p.name}</div>
              <div className="text-xs text-gray-500">{Number(p.price).toFixed(2)} € · stock {p.stock}</div>
            </div>
          </button>
        ))}
        {products.length === 0 && (
          <p className="text-gray-400 text-sm col-span-full">
            Aún no hay productos de catálogo, pero puedes usar el "cobro personalizado" de arriba para cobrar igualmente.
          </p>
        )}
      </div>

      {/* Carrito fijo abajo, siempre visible y accesible desde el móvil */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-60 bg-white border-t shadow-[0_-4px_12px_rgba(0,0,0,0.08)] p-4 max-h-[45vh] overflow-y-auto">
        <h2 className="font-medium mb-2">Carrito</h2>
        {Object.entries(cart).length === 0 && <p className="text-sm text-gray-400">Vacío</p>}
        <ul className="divide-y mb-3">
          {Object.entries(cart).map(([id, line]) => {
            const product = line.description ? null : products.find((p) => p.id === id);
            const label = line.description || product?.name;
            if (!label) return null;
            return (
              <li key={id} className="py-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="flex-1 min-w-[100px] truncate">{label}</span>
                <button onClick={() => removeFromCart(id)} className="px-2 border rounded">−</button>
                <span className="w-6 text-center">{line.quantity}</span>
                <button onClick={() => increment(id)} className="px-2 border rounded">+</button>
                <span className="text-xs text-gray-400">precio</span>
                <input
                  type="number"
                  step="0.01"
                  value={line.price}
                  onChange={(e) => setPrice(id, e.target.value)}
                  className="w-20 border rounded-lg px-2 py-1 text-sm"
                />
                <span className="w-16 text-right font-medium">{(line.price * line.quantity).toFixed(2)} €</span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="border rounded-lg px-3 py-2 flex-1 min-w-[140px]"
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="bizum">Bizum</option>
          </select>
          <div className="text-lg font-semibold">Total: {total.toFixed(2)} €</div>
        </div>

        {paymentMethod === "efectivo" && (
          <div className="flex flex-wrap items-center gap-2 mt-2 bg-gray-50 rounded-lg p-2">
            <label className="text-sm text-gray-500">Efectivo recibido</label>
            <input
              type="number"
              step="0.01"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              className="border rounded-lg px-2 py-1 w-28 text-sm"
              placeholder="0.00"
            />
            {received !== "" && (
              <span className={`font-semibold ${Number(received) - total < 0 ? "text-red-600" : "text-emerald-600"}`}>
                Cambio: {(Number(received) - total).toFixed(2)} €
              </span>
            )}
          </div>
        )}

        {(paymentMethod === "tarjeta" || paymentMethod === "bizum") && (
          <div className="flex flex-wrap items-center gap-2 mt-2 bg-gray-50 rounded-lg p-2">
            <label className="text-sm text-gray-500">Cuenta destino</label>
            {bankAccounts.length > 0 ? (
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm flex-1 min-w-[140px]"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-amber-600">
                No hay ninguna cuenta bancaria creada — ve a "Bancos" para crear una y que esto se sume ahí.
              </span>
            )}
          </div>
        )}
        {message && <p className="text-sm my-2">{message}</p>}
        <button
          onClick={checkout}
          disabled={loading || Object.keys(cart).length === 0}
          className="w-full bg-brand text-white rounded-lg py-3 font-medium mt-2 disabled:opacity-50"
        >
          {loading ? "Cobrando…" : "COBRAR"}
        </button>
      </div>
    </div>
  );
}
