"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { getApiErrorMessage, getDefaultApiErrorMessage } from "@/lib/apiError";
import Link from "next/link";

type Solicitud = {
  id: number;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_habiles: number;
  paso_actual: number | null;
  usuario: { nombre: string; email: string | null };
};

const ESTADO_COLOR: Record<string, string> = {
  Borrador: "bg-zinc-100 text-zinc-600",
  Enviado: "bg-blue-100 text-blue-700",
  Aprobado: "bg-green-100 text-green-700",
  Rechazado: "bg-red-100 text-red-700",
};

const ESTADOS = ["", "Borrador", "Enviado", "Aprobado", "Rechazado"] as const;

const PASO_LABEL: Record<number, string> = {
  1: "Jefe de Departamento",
  2: "Jefe Administrativo",
  3: "Director de Escuela",
};

export default function RequestsPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [pasoActual, setPasoActual] = useState("");

  useEffect(() => {
    apiFetch("/api/vacation/requests")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(await getApiErrorMessage(r, getDefaultApiErrorMessage(r.status)));
        }
        return r.json();
      })
      .then(setSolicitudes)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las solicitudes."))
      .finally(() => setLoading(false));
  }, []);

  const filteredSolicitudes = solicitudes.filter((s) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      s.usuario.nombre.toLowerCase().includes(normalizedSearch) ||
      (s.usuario.email?.toLowerCase().includes(normalizedSearch) ?? false);
    const matchesEstado = !estado || s.estado === estado;
    const matchesPaso = !pasoActual || String(s.paso_actual ?? "") === pasoActual;
    const start = s.fecha_inicio.slice(0, 10);
    const matchesFechaDesde = !fechaDesde || start >= fechaDesde;
    const matchesFechaHasta = !fechaHasta || start <= fechaHasta;

    return matchesSearch && matchesEstado && matchesPaso && matchesFechaDesde && matchesFechaHasta;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] leading-[150%] text-page-title">Solicitudes de vacaciones</h1>
        <Link
          href="/vacation/requests/new"
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-4 py-2 rounded-md font-medium transition-colors"
        >
          + Nueva solicitud
        </Link>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-5">
        <label className="md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Buscar</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o correo"
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-muted-foreground">Estado</span>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ESTADOS.map((value) => (
              <option key={value} value={value}>
                {value || "Todos"}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-xs font-medium text-muted-foreground">Desde</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-muted-foreground">Hasta</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>
        <label className="md:col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Paso actual</span>
          <select
            value={pasoActual}
            onChange={(e) => setPasoActual(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos</option>
            {Object.entries(PASO_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-container">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-600">{error}</p>
        ) : solicitudes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No hay solicitudes.</p>
        ) : filteredSolicitudes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No hay solicitudes que coincidan con los filtros.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="hover:bg-transparent bg-table-header border-b border-table-row-border">
                <th className="font-semibold text-base h-10 px-3 text-left">Profesor</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Período</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Días</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Estado</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Paso</th>
                <th className="font-semibold text-base h-10 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSolicitudes.map((s) => (
                <tr key={s.id} className="border-b border-table-row-border hover:bg-table-hover bg-table-row">
                  <td className="py-2 px-3 text-sm text-foreground">{s.usuario.nombre}</td>
                  <td className="py-2 px-3 text-sm text-foreground">
                    {new Date(s.fecha_inicio).toLocaleDateString("es-CR")} →{" "}
                    {new Date(s.fecha_fin).toLocaleDateString("es-CR")}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-foreground">{s.dias_habiles}</td>
                  <td className="py-2 px-3 text-sm">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ESTADO_COLOR[s.estado] ?? "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {s.estado}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-sm text-muted-foreground">
                    {s.paso_actual ? PASO_LABEL[s.paso_actual] : "—"}
                  </td>
                  <td className="py-2 px-3 text-sm text-right">
                    <Link
                      href={`/vacation/requests/${s.id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      Ver
                    </Link>
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
