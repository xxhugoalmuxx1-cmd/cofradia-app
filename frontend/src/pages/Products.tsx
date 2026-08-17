import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", price: "", stock: "" });

  async function load() {
    const { data } = await api.get("/products");
    setProducts(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/products", { name: form.name, price: Number(form.price), stock: Number(form.stock) });
    setForm({ name: "", price: "", stock: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Productos</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <input
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <input
          placeholder="Precio"
          type="number"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <input
          placeholder="Stock inicial"
          type="number"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <button className="w-full bg-brand text-white rounded-lg py-2">Guardar producto</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {products.map((p) => (
            <li key={p.id} className="py-2 text-sm flex justify-between">
              <span>{p.name}</span>
              <span className={p.stock <= p.minStock ? "text-red-600" : "text-gray-600"}>
                {p.price.toFixed(2)} € · stock {p.stock}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
