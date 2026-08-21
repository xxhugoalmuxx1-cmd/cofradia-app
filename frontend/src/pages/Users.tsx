import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

const EMPTY = { fullName: "", email: "", phone: "", password: "", roleId: "" };

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const [{ data: u }, { data: r }] = await Promise.all([api.get("/users"), api.get("/users/roles")]);
    setUsers(u);
    setRoles(r);
    if (!form.roleId && r.length > 0) {
      const boardRole = r.find((role: any) => role.name === "board_member");
      setForm((prev) => ({ ...prev, roleId: boardRole?.id || r[0].id }));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleLabel = (name: string) =>
    name === "admin" ? "Administrador" : name === "board_member" ? "Miembro de la junta" : "Consulta";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api.put(`/users/${editingId}`, { fullName: form.fullName, phone: form.phone, roleId: form.roleId });
      } else {
        await api.post("/users", form);
      }
      setForm({ ...EMPTY, roleId: form.roleId });
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido guardar el usuario");
    }
  }

  function startEdit(u: any) {
    setEditingId(u.id);
    setForm({ fullName: u.fullName, email: u.email, phone: u.phone || "", password: "", roleId: u.roleId });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm((prev) => ({ ...EMPTY, roleId: prev.roleId }));
    setError("");
  }

  async function toggleActive(u: any) {
    if (u.isActive && !window.confirm(`¿Eliminar el acceso de ${u.fullName}? Podrás reactivarlo más adelante si hace falta.`)) return;
    try {
      await api.put(`/users/${u.id}/${u.isActive ? "deactivate" : "activate"}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || "No se ha podido cambiar el estado");
    }
  }

  async function resetPassword(u: any) {
    const newPassword = window.prompt(`Nueva contraseña para ${u.fullName}:`);
    if (!newPassword) return;
    await api.put(`/users/${u.id}/reset-password`, { newPassword });
    window.alert("Contraseña actualizada.");
  }

  async function deleteUser(u: any) {
    if (!window.confirm(`¿Borrar definitivamente a ${u.fullName}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      load();
    } catch (err: any) {
      window.alert(err.response?.data?.error || "No se ha podido borrar el usuario");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Usuarios</h1>
      <p className="text-sm text-gray-500 -mt-4">
        Crea un usuario por cada miembro de la junta para que entre con sus propias credenciales — así toda
        acción queda registrada a su nombre en la Auditoría, en vez de aparecer todo bajo el usuario admin.
      </p>

      <FixBucketsButton />

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="font-medium mb-1">{editingId ? "Editar usuario" : "Nuevo usuario"}</h2>
        <input
          placeholder="Nombre completo"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
          required
          disabled={!!editingId}
        />
        {editingId && <p className="text-xs text-gray-400 -mt-1">El email no se puede cambiar una vez creado.</p>}
        <input
          placeholder="Teléfono"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        {!editingId && (
          <input
            placeholder="Contraseña inicial"
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        )}
        <select
          value={form.roleId}
          onChange={(e) => setForm({ ...form, roleId: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {roleLabel(r.name)}
            </option>
          ))}
        </select>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2">
          <button className="flex-1 bg-brand text-white rounded-lg py-2">{editingId ? "Guardar cambios" : "Crear usuario"}</button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="px-4 bg-gray-200 rounded-lg">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <ul className="divide-y">
          {users.map((u) => (
            <li key={u.id} className="py-3 text-sm flex justify-between items-start gap-2 flex-wrap">
              <span>
                <div className="font-medium">
                  {u.fullName} {!u.isActive && <span className="text-red-500 text-xs">(desactivado)</span>}
                  {u.id === currentUser?.id && <span className="text-gray-400 text-xs"> (tú)</span>}
                </div>
                <div className="text-gray-400 text-xs">{u.email} — {roleLabel(u.role.name)}</div>
              </span>
              <span className="flex gap-3 shrink-0">
                <button onClick={() => startEdit(u)} className="text-brand text-xs hover:underline">Editar</button>
                <button onClick={() => resetPassword(u)} className="text-gray-600 text-xs hover:underline">Resetear contraseña</button>
                {u.id !== currentUser?.id && (
                  <button
                    onClick={() => toggleActive(u)}
                    className={`text-xs hover:underline ${u.isActive ? "text-red-600" : "text-emerald-600"}`}
                  >
                    {u.isActive ? "Eliminar acceso" : "Reactivar"}
                  </button>
                )}
                {u.id !== currentUser?.id && (
                  <button onClick={() => deleteUser(u)} className="text-xs text-red-800 hover:underline">
                    Borrar
                  </button>
                )}
              </span>
            </li>
          ))}
          {users.length === 0 && <p className="text-sm text-gray-400">Sin usuarios todavía.</p>}
        </ul>
      </div>
    </div>
  );
}

function FixBucketsButton() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function fix() {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/settings/fix-buckets");
      setResult(data.results);
    } catch (err: any) {
      setResult([{ bucket: "-", action: "error", error: err.response?.data?.error || "No se ha podido conectar" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <h2 className="font-medium mb-1 text-sm">¿Las fotos (productos / imagen de la Virgen) no se ven?</h2>
      <p className="text-xs text-gray-500 mb-2">
        Pulsa este botón para forzar, directamente por código, que los buckets de Supabase existan y estén
        marcados como públicos — sin depender de los interruptores de la web de Supabase.
      </p>
      <button onClick={fix} disabled={loading} className="bg-amber-600 text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-60">
        {loading ? "Comprobando…" : "Arreglar buckets de almacenamiento"}
      </button>
      {result && (
        <ul className="mt-2 text-xs space-y-0.5">
          {result.map((r: any, i: number) => (
            <li key={i} className={r.action === "error" ? "text-red-600" : "text-emerald-700"}>
              {r.bucket}: {r.action} {r.error && `— ${r.error}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
