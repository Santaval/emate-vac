"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

type UsuarioRol = { rol: string };
type Usuario = {
  id: number;
  username: string;
  nombre: string;
  email: string | null;
  activo: boolean;
  usuario_rol: UsuarioRol[];
};

const ALL_ROLES = [
  "Profesor",
  "Jefe_de_Departamento",
  "Director_de_Escuela",
  "Jefe_Administrativo",
] as const;

const ROL_LABEL: Record<string, string> = {
  Profesor: "Profesor",
  Jefe_de_Departamento: "Jefe de Departamento",
  Director_de_Escuela: "Director de Escuela",
  Jefe_Administrativo: "Jefe Administrativo",
};

export default function UsersPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/api/vacation/users")
      .then(async (r) => {
        if (r.status === 403) { setError("Acceso denegado. Solo el Jefe Administrativo puede ver esta sección."); return; }
        setUsers(await r.json());
      })
      .finally(() => setLoading(false));
  }, []);

  async function updateRoles(user: Usuario, rol: string, checked: boolean) {
    const currentRoles = user.usuario_rol.map((r) => r.rol);
    const newRoles = checked
      ? [...currentRoles, rol]
      : currentRoles.filter((r) => r !== rol);

    setSaving(user.id);
    const res = await apiFetch("/api/vacation/users", {
      method: "PATCH",
      body: JSON.stringify({ id_usuario: user.id, roles: newRoles }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, usuario_rol: newRoles.map((r) => ({ rol: r })) }
            : u
        )
      );
    }
    setSaving(null);
  }

  if (loading) return <p className="text-sm text-zinc-400">Cargando…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-zinc-800">Gestión de usuarios</h1>
      <p className="text-sm text-zinc-500">
        Asigne roles de vacaciones a los usuarios que han iniciado sesión en el sistema.
      </p>

      <div className="bg-white rounded-lg border shadow-sm">
        {users.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-400">
            No hay usuarios registrados aún. Los usuarios aparecen aquí la primera vez que inician sesión.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Usuario</th>
                {ALL_ROLES.map((r) => (
                  <th key={r} className="px-2 py-3 text-center">{ROL_LABEL[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className={saving === u.id ? "opacity-50" : ""}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-800">{u.nombre}</p>
                    <p className="text-zinc-400 text-xs">{u.username}</p>
                  </td>
                  {ALL_ROLES.map((rol) => (
                    <td key={rol} className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={u.usuario_rol.some((r) => r.rol === rol)}
                        onChange={(e) => updateRoles(u, rol, e.target.checked)}
                        disabled={saving === u.id}
                        className="h-4 w-4 accent-blue-700"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
