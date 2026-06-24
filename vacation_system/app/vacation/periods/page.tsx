"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { getApiErrorMessage, getDefaultApiErrorMessage } from "@/lib/apiError";

type Usuario = {
  id: number;
  username: string;
  nombre: string;
  email: string | null;
};

type Periodo = {
  id: number;
  id_usuario: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_autorizados: number;
  estado: "Disponible" | "Utilizado" | "Vencido";
  observacion: string | null;
  usuario: Usuario;
};

const STATUS_OPTIONS = ["Disponible", "Utilizado", "Vencido"] as const;

const STATUS_CLASS: Record<Periodo["estado"], string> = {
  Disponible: "bg-green-100 text-green-700",
  Utilizado: "bg-zinc-100 text-zinc-600",
  Vencido: "bg-red-100 text-red-700",
};

export default function AuthorizedPeriodsPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [periods, setPeriods] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    id_usuario: "",
    fecha_inicio: "",
    fecha_fin: "",
    dias_autorizados: "",
    estado: "Disponible",
    observacion: "",
  });

  const teacherUsers = useMemo(
    () => users.filter((user) => user.username && user.nombre),
    [users]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [usersRes, periodsRes] = await Promise.all([
          apiFetch("/api/vacation/users"),
          apiFetch("/api/vacation/authorized-periods"),
        ]);

        if (!usersRes.ok) {
          throw new Error(await getApiErrorMessage(usersRes, getDefaultApiErrorMessage(usersRes.status)));
        }
        if (!periodsRes.ok) {
          throw new Error(await getApiErrorMessage(periodsRes, getDefaultApiErrorMessage(periodsRes.status)));
        }

        const [usersData, periodsData] = await Promise.all([usersRes.json(), periodsRes.json()]);
        if (!cancelled) {
          setUsers(usersData);
          setPeriods(periodsData);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No se pudieron cargar los periodos autorizados.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  async function createPeriod(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await apiFetch("/api/vacation/authorized-periods", {
      method: "POST",
      body: JSON.stringify({
        id_usuario: Number(form.id_usuario),
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        dias_autorizados: Number(form.dias_autorizados),
        estado: form.estado,
        observacion: form.observacion || undefined,
      }),
    });

    if (res.ok) {
      const created = await res.json();
      setPeriods((prev) => [created, ...prev]);
      setForm({
        id_usuario: form.id_usuario,
        fecha_inicio: "",
        fecha_fin: "",
        dias_autorizados: "",
        estado: "Disponible",
        observacion: "",
      });
    } else {
      setError(await getApiErrorMessage(res, getDefaultApiErrorMessage(res.status)));
    }

    setSaving(false);
  }

  async function updateStatus(period: Periodo, estado: Periodo["estado"]) {
    setSaving(true);
    setError("");
    const res = await apiFetch(`/api/vacation/authorized-periods/${period.id}`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });

    if (res.ok) {
      const updated = await res.json();
      setPeriods((prev) => prev.map((item) => (item.id === period.id ? updated : item)));
    } else {
      setError(await getApiErrorMessage(res, getDefaultApiErrorMessage(res.status)));
    }

    setSaving(false);
  }

  async function deletePeriod(period: Periodo) {
    setSaving(true);
    setError("");
    const res = await apiFetch(`/api/vacation/authorized-periods/${period.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setPeriods((prev) => prev.filter((item) => item.id !== period.id));
    } else {
      setError(await getApiErrorMessage(res, getDefaultApiErrorMessage(res.status)));
    }

    setSaving(false);
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-[150%] text-page-title">Periodos autorizados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registre los recesos o ventanas de vacaciones disponibles por docente.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      <form onSubmit={createPeriod} className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-6">
          <label className="md:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Docente</span>
            <select
              value={form.id_usuario}
              onChange={(e) => setForm({ ...form, id_usuario: e.target.value })}
              required
              className={inputClass}
            >
              <option value="">Seleccione</option>
              {teacherUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs font-medium text-muted-foreground">Inicio</span>
            <input
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              required
              className={inputClass}
            />
          </label>
          <label>
            <span className="text-xs font-medium text-muted-foreground">Fin</span>
            <input
              type="date"
              value={form.fecha_fin}
              min={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
              required
              className={inputClass}
            />
          </label>
          <label>
            <span className="text-xs font-medium text-muted-foreground">Días</span>
            <input
              type="number"
              min="1"
              value={form.dias_autorizados}
              onChange={(e) => setForm({ ...form, dias_autorizados: e.target.value })}
              required
              className={inputClass}
            />
          </label>
          <label>
            <span className="text-xs font-medium text-muted-foreground">Estado</span>
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="md:col-span-5">
            <span className="text-xs font-medium text-muted-foreground">Observación</span>
            <input
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              maxLength={300}
              className={inputClass}
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      </form>

      <div className="table-container">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
        ) : periods.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No hay periodos autorizados registrados.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="hover:bg-transparent bg-table-header border-b border-table-row-border">
                <th className="font-semibold text-base h-10 px-3 text-left">Docente</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Periodo</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Días</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Estado</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Observación</th>
                <th className="font-semibold text-base h-10 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id} className="border-b border-table-row-border hover:bg-table-hover bg-table-row">
                  <td className="py-2 px-3 text-sm text-foreground">
                    <p>{period.usuario.nombre}</p>
                    <p className="text-xs text-muted-foreground">{period.usuario.username}</p>
                  </td>
                  <td className="py-2 px-3 text-sm text-foreground">
                    {new Date(period.fecha_inicio).toLocaleDateString("es-CR")} →{" "}
                    {new Date(period.fecha_fin).toLocaleDateString("es-CR")}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-foreground">
                    {period.dias_autorizados}
                  </td>
                  <td className="py-2 px-3 text-sm">
                    <select
                      value={period.estado}
                      disabled={saving}
                      onChange={(e) => updateStatus(period, e.target.value as Periodo["estado"])}
                      className={`rounded-full border border-transparent px-2 py-1 text-xs font-medium ${STATUS_CLASS[period.estado]}`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-sm text-muted-foreground">
                    {period.observacion || "—"}
                  </td>
                  <td className="py-2 px-3 text-sm text-right">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => deletePeriod(period)}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
