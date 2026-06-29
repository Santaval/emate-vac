"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { getApiErrorMessage, getDefaultApiErrorMessage } from "@/lib/apiError";

type Periodo = {
  id: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_autorizados: number;
  estado: "Disponible" | "Utilizado" | "Vencido";
  observacion: string | null;
};

const STATUS_CLASS: Record<Periodo["estado"], string> = {
  Disponible: "bg-green-100 text-green-700",
  Utilizado: "bg-zinc-100 text-zinc-600",
  Vencido: "bg-red-100 text-red-700",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-CR");
}

export default function MyAuthorizedPeriodsPage() {
  const [periods, setPeriods] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPeriods() {
      try {
        const response = await apiFetch("/api/vacation/authorized-periods");
        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, getDefaultApiErrorMessage(response.status)));
        }

        const data = await response.json();
        if (!cancelled) setPeriods(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No se pudieron cargar los periodos autorizados.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPeriods();

    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    return periods.reduce(
      (acc, period) => {
        acc.total += period.dias_autorizados;
        if (period.estado === "Disponible") acc.disponible += period.dias_autorizados;
        if (period.estado === "Utilizado") acc.utilizado += period.dias_autorizados;
        if (period.estado === "Vencido") acc.vencido += period.dias_autorizados;
        return acc;
      },
      { total: 0, disponible: 0, utilizado: 0, vencido: 0 }
    );
  }, [periods]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-[150%] text-page-title">Mis periodos autorizados</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consulte las ventanas de receso registradas para sus solicitudes de vacaciones.
          </p>
        </div>
        <Link
          href="/vacation/requests/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Nueva solicitud
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Disponibles", value: summary.disponible, color: "text-green-700" },
          { label: "Utilizados", value: summary.utilizado, color: "text-muted-foreground" },
          { label: "Vencidos", value: summary.vencido, color: "text-red-600" },
          { label: "Total", value: summary.total, color: "text-foreground" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      <div className="table-container">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-600">{error}</p>
        ) : periods.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No hay periodos autorizados registrados para su usuario.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="hover:bg-transparent bg-table-header border-b border-table-row-border">
                <th className="font-semibold text-base h-10 px-3 text-left">Periodo</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Días</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Estado</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Observación</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.id} className="border-b border-table-row-border hover:bg-table-hover bg-table-row">
                  <td className="py-2 px-3 text-sm text-foreground">
                    {formatDate(period.fecha_inicio)} → {formatDate(period.fecha_fin)}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-foreground">
                    {period.dias_autorizados}
                  </td>
                  <td className="py-2 px-3 text-sm">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASS[period.estado]}`}>
                      {period.estado}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-sm text-muted-foreground">
                    {period.observacion || "—"}
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
