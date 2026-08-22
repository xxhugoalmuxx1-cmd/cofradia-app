import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useConfirm } from "../context/ConfirmContext";
import { ImageCropModal } from "../components/ImageCropModal";

const EMPTY = { name: "", price: "", stock: "" };

export default function Products() {
  const confirm = useConfirm();
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pendingUpload, setPendingUpload] = useState<{ productId: string; file: File } | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  async function load() {
    const { data } = await api.get("/products");
    setProducts(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: form.name, price: Number(form.price), stock: Number(form.stock) };
    if (editingId) {
      await api.put(`/products/${editingId}`, payload);
    } else {
      await api.post("/products", payload);
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  }

  function startEdit(p: any) {
    setEditingId(p.id);
    setForm({ name: p.name, price: String(p.price), stock: String(p.stock) });
  }

  async function deactivate(id: string, name: string) {
    if (!(await confirm({ title: "Quitar producto", message: `¿Quitar "${name}" del catálogo? No se borra el historial de ventas.`, confirmLabel: "Quitar" }))) return;
    await api.delete(`/products/${id}`);
    load();
  }

  async function uploadImage(productId: string, blob: Blob) {
    const formData = new FormData();
    formData.append("image", blob, "product.jpg");
    try {
      await api.post(`/products/${productId}/image`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.error || "No se ha podido subir la imagen. Revisa el bucket 'products' en Supabase.");
    }
  }

  const catalogUrl = `${window.location.origin}/catalog`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Productos</h1>
        <a href="/catalog" target="_blank" rel="noreferrer" className="text-sm bg-brand text-white px-3 py-2 rounded-lg">
          Ver catálogo público ↗
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 text-sm text-gray-600">
        Comparte este enlace con quien quieras — pueden ver el catálogo sin entrar a la app:
        <div className="mt-2 flex gap-2 flex-wrap items-center">
          <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">{catalogUrl}</code>
          <button onClick={() => navigator.clipboard.writeText(catalogUrl)} className="text-xs bg-gray-700 text-white px-2 py-1 rounded">
            Copiar
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-medium mb-1">{editingId ? "Editar producto" : "Nuevo producto"}</h2>
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
          placeholder="Stock"
          type="number"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <div className="flex gap-2">
          <button className="flex-1 bg-brand text-white rounded-lg py-2">{editingId ? "Guardar cambios" : "Guardar producto"}</button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="px-4 bg-gray-200 rounded-lg">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="h-28 bg-gray-100 relative">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-full object-cover"
                  onError={() => setFailedImages((prev) => ({ ...prev, [p.id]: true }))}
                />
              ) : null}
              {!p.imageUrl && (
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
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPendingUpload({ productId: p.id, file });
                  e.target.value = "";
                }}
              />
            </div>
            <div className="p-2.5">
              <div className="font-medium text-sm truncate">{p.name}</div>
              <div className={`text-xs ${p.stock <= p.minStock ? "text-red-600" : "text-gray-500"}`}>
                {Number(p.price).toFixed(2)} € · stock {p.stock}
              </div>
              {failedImages[p.id] && p.imageUrl && (
                <a
                  href={p.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-red-500 underline block truncate mt-0.5"
                >
                  Probar imagen ↗
                </a>
              )}
              <div className="flex gap-3 mt-1.5">
                <button onClick={() => startEdit(p)} className="text-brand text-xs hover:underline">Editar</button>
                <button onClick={() => deactivate(p.id, p.name)} className="text-red-600 text-xs hover:underline">Quitar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pendingUpload && (
        <ImageCropModal
          file={pendingUpload.file}
          shape="square"
          onCancel={() => setPendingUpload(null)}
          onConfirm={(blob) => {
            uploadImage(pendingUpload.productId, blob);
            setPendingUpload(null);
          }}
        />
      )}
    </div>
  );
}
