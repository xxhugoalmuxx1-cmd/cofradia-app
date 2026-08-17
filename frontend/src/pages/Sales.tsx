import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

// Modo venta rápida (punto 12 del prompt): pensado para usarse desde el móvil.
export default function Sales() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/products").then((res) => setProducts(res.data));
  }, []);

  function addToCart(id: string) {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }

  function removeFromCart(id: string) {
    setCart((prev) => {
      const next = { ...prev };
      if (next[id] > 1) next[id] -= 1;
      else delete next[id];
      return next;
    });
  }

  const total = Object.entries(cart).reduce((acc, [id, qty]) => {
    const product = products.find((p) => p.id === id);
    return acc + (product ? product.price * qty : 0);
  }, 0);

  async function checkout() {
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    if (items.length === 0) return;
    try {
      await api.post("/sales", { items, paymentMethod });
      setCart({});
      setMessage("Venta registrada ✅");
      const { data } = await api.get("/products");
      setProducts(data);
      setTimeout(() => setMessage(""), 2500);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Error al registrar la venta");
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Venta rápida</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => addToCart(p.id)}
            className="bg-white rounded-xl shadow-sm p-3 text-left hover:ring-2 hover:ring-brand"
          >
            <div className="font-medium">{p.name}</div>
            <div className="text-sm text-gray-500">{p.price.toFixed(2)} € · stock {p.stock}</div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sticky bottom-20 md:bottom-4">
        <h2 className="font-medium mb-2">Carrito</h2>
        {Object.entries(cart).length === 0 && <p className="text-sm text-gray-400">Vacío</p>}
        <ul className="divide-y mb-3">
          {Object.entries(cart).map(([id, qty]) => {
            const product = products.find((p) => p.id === id);
            if (!product) return null;
            return (
              <li key={id} className="py-2 flex justify-between items-center text-sm">
                <span>{product.name}</span>
                <span className="flex items-center gap-2">
                  <button onClick={() => removeFromCart(id)} className="px-2 border rounded">−</button>
                  {qty}
                  <button onClick={() => addToCart(id)} className="px-2 border rounded">+</button>
                </span>
              </li>
            );
          })}
        </ul>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-3"
        >
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="bizum">Bizum</option>
        </select>
        <div className="text-lg font-semibold mb-3">Total: {total.toFixed(2)} €</div>
        {message && <p className="text-sm mb-2">{message}</p>}
        <button onClick={checkout} className="w-full bg-brand text-white rounded-lg py-3 font-medium">
          COBRAR
        </button>
      </div>
    </div>
  );
}
