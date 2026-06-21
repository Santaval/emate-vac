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
};

const ESTADO_COLOR: Record<string, string> = {
  Borrador: "bg-zinc-100 text-zinc-600",
  Enviado: "bg-blue-100 text-blue-700",
  Aprobado: "bg-green-100 text-green-700",
  Rechazado: "bg-red-100 text-red-700",
};

export default function VacationDashboard() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const pending = solicitudes.filter((s) => s.estado === "Enviado").length;
  const draft = solicitudes.filter((s) => s.estado === "Borrador").length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] leading-[150%] text-page-title">Panel de Vacaciones</h1>
        <Link
          href="/vacation/requests/new"
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-4 py-2 rounded-md font-medium transition-colors"
        >
          + Nueva solicitud
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pendientes", value: pending, color: "text-primary" },
          { label: "Borradores", value: draft, color: "text-muted-foreground" },
          { label: "Total", value: solicitudes.length, color: "text-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card rounded-lg border border-border p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      <div className="table-container">
        <div className="px-4 py-3 border-b border-table-row-border bg-table-header">
          <h2 className="text-sm font-semibold text-foreground">Solicitudes recientes</h2>
        </div>
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-600">{error}</p>
        ) : solicitudes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No hay solicitudes aún.</p>
        ) : (
          <ul>
            {solicitudes.slice(0, 5).map((s) => (
              <li key={s.id} className="border-b border-table-row-border last:border-0 bg-table-row">
                <Link
                  href={`/vacation/requests/${s.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-table-hover transition-colors"
                >
                  <span className="text-sm text-foreground">
                    {new Date(s.fecha_inicio).toLocaleDateString("es-CR")} →{" "}
                    {new Date(s.fecha_fin).toLocaleDateString("es-CR")}
                    <span className="ml-2 text-muted-foreground">({s.dias_habiles} días)</span>
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ESTADO_COLOR[s.estado] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {s.estado}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {solicitudes.length > 5 && (
          <div className="px-4 py-3 border-t border-table-row-border bg-table-row">
            <Link href="/vacation/requests" className="text-sm text-primary hover:underline">
              Ver todas →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
