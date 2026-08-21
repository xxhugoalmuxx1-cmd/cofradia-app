import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HeroImage } from "./HeroImage";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/cash", label: "Caja", icon: "💵" },
  { to: "/sales", label: "Ventas", icon: "🛍️" },
  { to: "/lottery", label: "Lotería", icon: "🎟️" },
  { to: "/members", label: "Socios", icon: "👥" },
  { to: "/bank", label: "Bancos", icon: "🏦" },
  { to: "/products", label: "Productos", icon: "📦" },
  { to: "/events", label: "Eventos", icon: "🎉" },
  { to: "/fees", label: "Cuotas", icon: "💳" },
  { to: "/donations", label: "Donativos", icon: "🙏" },
  { to: "/documents", label: "Documentos", icon: "📎" },
  { to: "/reports", label: "Informes", icon: "📄" },
];

const ADMIN_NAV_ITEMS = [
  { to: "/users", label: "Usuarios", icon: "🔑" },
  { to: "/audit", label: "Auditoría", icon: "🔍" },
];

// Layout responsive: barra lateral en escritorio/tablet ancho,
// barra inferior (5 accesos rápidos) + menú completo en móvil.
export function Layout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const allItems = user?.role === "admin" ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800">
      {/* Sidebar (tablet/desktop) */}
      <aside className="hidden md:flex md:flex-col md:w-60 bg-gradient-to-b from-brand to-brand-dark text-white shrink-0">
        <div className="pt-5 pb-3 flex justify-center">
          <HeroImage variant="avatar" editable />
        </div>
        <div className="px-5 py-4 text-lg font-semibold tracking-wide border-b border-white/10">
          Purísima
        </div>
        <nav className="flex flex-col gap-1 flex-1 px-3 py-3 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                  isActive ? "bg-white/15 font-medium shadow-sm" : "text-white/85 hover:bg-white/10"
                }`
              }
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <>
              <div className="border-t border-white/10 my-2" />
              {ADMIN_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                      isActive ? "bg-white/15 font-medium shadow-sm" : "text-white/85 hover:bg-white/10"
                    }`
                  }
                >
                  <span>{item.icon}</span> {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="text-xs text-white/70 px-5 py-3 border-t border-white/15">
          <div className="font-medium text-white/90 truncate">{user?.fullName}</div>
          <button onClick={logout} className="underline mt-1 hover:text-white">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Header móvil */}
      <header
        className="md:hidden flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark text-white px-3 py-2 shadow-sm"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
      >
        <button onClick={() => setMenuOpen(true)} className="text-xl leading-none px-1 shrink-0" aria-label="Abrir menú">
          ☰
        </button>
        <span className="flex items-center gap-2 min-w-0">
          <HeroImage variant="avatar" size={28} />
          <span className="font-semibold tracking-wide truncate">Purísima</span>
        </span>
        <button onClick={logout} className="text-sm underline shrink-0">
          Salir
        </button>
      </header>

      <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>

      {/* Barra inferior (móvil): 4 accesos rápidos + botón "Más" con el resto */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0.5rem)" }}
      >
        {NAV_ITEMS.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center text-[11px] px-1 ${isActive ? "text-brand font-semibold" : "text-gray-500"}`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="mt-0.5">{item.label}</span>
          </NavLink>
        ))}
        <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center text-[11px] px-1 text-gray-500">
          <span className="text-lg leading-none">⋯</span>
          <span className="mt-0.5">Más</span>
        </button>
      </nav>

      {/* Menú completo a pantalla completa (móvil) */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 1rem) + 1rem)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Todas las secciones</h2>
              <button onClick={() => setMenuOpen(false)} className="text-gray-400 text-xl leading-none px-2">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {allItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 py-3 rounded-xl text-xs ${
                      isActive ? "bg-brand/10 text-brand font-semibold" : "bg-gray-50 text-gray-600"
                    }`
                  }
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
