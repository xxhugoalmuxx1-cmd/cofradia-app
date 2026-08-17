import { useEffect, useState } from "react";

interface CatalogProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  category?: string | null;
  available: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

// Página pública, sin login: pensada para compartir el enlace fuera de la
// app (WhatsApp, redes, etc.) y que cualquiera pueda ver el catálogo.
export default function CatalogPublic() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/public/catalog`)
      .then((res) => {
        if (!res.ok) throw new Error(`El servidor respondió con error ${res.status}`);
        return res.json();
      })
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "No se ha podido cargar el catálogo"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-brand to-brand-dark text-white px-4 py-6 text-center">
        <h1 className="text-2xl font-semibold">Purísima</h1>
        <p className="text-white/80 text-sm mt-1">Catálogo de productos</p>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {loading && <p className="text-gray-400 text-sm">Cargando catálogo…</p>}
        {error && <p className="text-red-500 text-sm text-center mt-6">⚠️ {error}</p>}
        {!loading && !error && products.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-8">Todavía no hay productos publicados.</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="h-32 bg-gray-100">
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
                  <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">📦</div>
                )}
              </div>
              <div className="p-3">
                <div className="font-medium text-sm">{p.name}</div>
                {p.description && <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>}
                <div className="flex items-center justify-between mt-2">
                  <span className="font-semibold text-brand">{Number(p.price).toFixed(2)} €</span>
                  {!p.available && <span className="text-xs text-red-500">Sin stock</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
