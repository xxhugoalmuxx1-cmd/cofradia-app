import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", price: "", stock: "" });
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

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

  async function uploadImage(productId: string, file: File) {
    const formData = new FormData();
    formData.append("image", file);
    await api.post(`/products/${productId}/image`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    load();
  }

  const catalogUrl = `${window.location.origin}/catalog`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Productos</h1>
        <a
          href="/catalog"
          target="_blank"
          rel="noreferrer"
          className="text-sm bg-brand text-white px-3 py-2 rounded-lg"
        >
          Ver catálogo público ↗
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-600">
        Comparte este enlace con quien quieras — pueden ver el catálogo sin entrar a la app:
        <div className="mt-2 flex gap-2 flex-wrap items-center">
          <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">{catalogUrl}</code>
          <button
            onClick={() => navigator.clipboard.writeText(catalogUrl)}
            className="text-xs bg-gray-700 text-white px-2 py-1 rounded"
          >
            Copiar
          </button>
        </div>
      </div>

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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="h-28 bg-gray-100 relative">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">📦</div>
              )}
              <button
                onClick={() => fileInputs.current[p.id]?.click()}
                className="absolute bottom-1 right-1 bg-white/90 text-brand text-[10px] px-2 py-1 rounded"
              >
                {p.imageUrl ? "Cambiar foto" : "Añadir foto"}
              </button>
              <input
                ref={(el) => (fileInputs.current[p.id] = el)}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(p.id, e.target.files[0])}
              />
            </div>
            <div className="p-2.5">
              <div className="font-medium text-sm truncate">{p.name}</div>
              <div className={`text-xs ${p.stock <= p.minStock ? "text-red-600" : "text-gray-500"}`}>
                {Number(p.price).toFixed(2)} € · stock {p.stock}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
