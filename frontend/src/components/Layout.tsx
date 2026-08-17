import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Sidebar (tablet/desktop) */}
      <aside className="hidden md:flex md:flex-col md:w-56 bg-brand text-white p-4 shrink-0">
        <div className="text-lg font-semibold mb-6">⛪ Cofradía</div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  isActive ? "bg-white/20 font-medium" : "hover:bg-white/10"
                }`
              }
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="text-xs opacity-80 mt-4 border-t border-white/20 pt-3">
          <div>{user?.fullName}</div>
          <button onClick={logout} className="underline mt-1">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Header móvil */}
      <header className="md:hidden flex items-center justify-between bg-brand text-white px-4 py-3">
        <span className="font-semibold">⛪ Cofradía</span>
        <button onClick={logout} className="text-sm underline">
          Salir
        </button>
      </header>

      <main className="flex-1 p-4 pb-20 md:pb-4 overflow-y-auto">
        <Outlet />
      </main>

      {/* Barra inferior (móvil) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 shadow-lg">
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center text-xs ${isActive ? "text-brand font-semibold" : "text-gray-500"}`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
