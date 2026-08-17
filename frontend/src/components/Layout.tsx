import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HeroImage } from "./HeroImage";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/cash", label: "Caja", icon: "💵" },
  { to: "/sales", label: "Ventas", icon: "🛍️" },
  { to: "/lottery", label: "Lotería", icon: "🎟️" },
  { to: "/members", label: "Socios", icon: "👥" },
  { to: "/finance", label: "Tesorería", icon: "📒" },
  { to: "/products", label: "Productos", icon: "📦" },
  { to: "/events", label: "Eventos", icon: "🎉" },
  { to: "/fees", label: "Cuotas", icon: "💳" },
  { to: "/donations", label: "Donativos", icon: "🙏" },
  { to: "/documents", label: "Documentos", icon: "📎" },
  { to: "/reports", label: "Informes", icon: "📄" },
  { to: "/audit", label: "Auditoría", icon: "🔍" },
];

// Layout responsive: barra lateral en escritorio/tablet ancho,
// barra inferior en móvil. Mismo contenido de navegación en ambos casos.
export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-800">
      {/* Sidebar (tablet/desktop) */}
      <aside className="hidden md:flex md:flex-col md:w-60 bg-gradient-to-b from-brand to-brand-dark text-white shrink-0">
        <div className="h-24 w-full overflow-hidden">
          <HeroImage className="w-full h-full" editable />
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
        </nav>
        <div className="text-xs text-white/70 px-5 py-3 border-t border-white/15">
          <div className="font-medium text-white/90 truncate">{user?.fullName}</div>
          <button onClick={logout} className="underline mt-1 hover:text-white">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Header móvil */}
      <header className="md:hidden flex items-center justify-between bg-gradient-to-r from-brand to-brand-dark text-white px-4 py-3 shadow-sm">
        <span className="font-semibold tracking-wide">Purísima</span>
        <button onClick={logout} className="text-sm underline">
          Salir
        </button>
      </header>

      <main className="flex-1 min-w-0 p-3 sm:p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>

      {/* Barra inferior (móvil), con margen extra para el "notch" de los iPhone */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0.5rem)" }}
      >
        {NAV_ITEMS.slice(0, 5).map((item) => (
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
      </nav>
    </div>
  );
}
