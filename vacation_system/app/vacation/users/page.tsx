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
  dias_vacaciones_disponibles: number;
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
        if (r.status === 403) {
          setError("Acceso denegado. Solo el Jefe Administrativo puede ver esta sección.");
          return;
        }
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

  async function updateVacationDays(user: Usuario, value: string) {
    const days = Number(value);
    if (!Number.isInteger(days) || days < 0) return;

    setSaving(user.id);
    const res = await apiFetch("/api/vacation/users", {
      method: "PATCH",
      body: JSON.stringify({
        id_usuario: user.id,
        dias_vacaciones_disponibles: days,
      }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, dias_vacaciones_disponibles: days }
            : u
        )
      );
    }
    setSaving(null);
  }

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (error) return (
    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
      {error}
    </p>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-[150%] text-page-title">Gestión de usuarios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Asigne roles de vacaciones a los usuarios que han iniciado sesión en el sistema.
        </p>
      </div>

      <div className="table-container">
        {users.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No hay usuarios registrados aún. Los usuarios aparecen aquí la primera vez que inician sesión.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="hover:bg-transparent bg-table-header border-b border-table-row-border">
                <th className="font-semibold text-base h-10 px-3 text-left">Usuario</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Días disponibles</th>
                {ALL_ROLES.map((r) => (
                  <th key={r} className="font-semibold text-base h-10 px-3 text-center">
                    {ROL_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-table-row-border hover:bg-table-hover bg-table-row ${
                    saving === u.id ? "opacity-50" : ""
                  }`}
                >
                  <td className="py-2 px-3 text-sm">
                    <p className="font-medium text-foreground">{u.nombre}</p>
                    <p className="text-muted-foreground text-xs">{u.username}</p>
                  </td>
                  <td className="py-2 px-3 text-sm text-center">
                    <input
                      type="number"
                      min="0"
                      value={u.dias_vacaciones_disponibles}
                      onChange={(e) => updateVacationDays(u, e.target.value)}
                      disabled={saving === u.id}
                      className="w-20 rounded-md border border-border bg-background px-2 py-1 text-center text-sm text-foreground"
                    />
                  </td>
                  {ALL_ROLES.map((rol) => (
                    <td key={rol} className="py-2 px-3 text-sm text-center">
                      <input
                        type="checkbox"
                        checked={u.usuario_rol.some((r) => r.rol === rol)}
                        onChange={(e) => updateRoles(u, rol, e.target.checked)}
                        disabled={saving === u.id}
                        className="h-4 w-4 accent-primary"
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
