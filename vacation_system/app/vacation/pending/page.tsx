"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { getApiErrorMessage, getDefaultApiErrorMessage } from "@/lib/apiError";

type Solicitud = {
  id: number;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_habiles: number;
  paso_actual: number | null;
  usuario: { nombre: string; email: string | null };
};

const PASO_LABEL: Record<number, string> = {
  1: "Jefe de Departamento",
  2: "Jefe Administrativo",
  3: "Director de Escuela",
};

export default function PendingRequestsPage() {
  const [items, setItems] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/vacation/requests/pending")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, getDefaultApiErrorMessage(response.status)));
        }
        return response.json();
      })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar las solicitudes pendientes."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] leading-[150%] text-page-title">Pendientes por revisar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Solicitudes que requieren acción del rol revisor actual.
        </p>
      </div>

      <div className="table-container">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No hay solicitudes pendientes por revisar.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="hover:bg-transparent bg-table-header border-b border-table-row-border">
                <th className="font-semibold text-base h-10 px-3 text-left">Profesor</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Período</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Días</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Paso</th>
                <th className="font-semibold text-base h-10 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-table-row-border hover:bg-table-hover bg-table-row">
                  <td className="py-2 px-3 text-sm text-foreground">
                    <p>{s.usuario.nombre}</p>
                    {s.usuario.email && (
                      <p className="text-xs text-muted-foreground">{s.usuario.email}</p>
                    )}
                  </td>
                  <td className="py-2 px-3 text-sm text-foreground">
                    {new Date(s.fecha_inicio).toLocaleDateString("es-CR")} →{" "}
                    {new Date(s.fecha_fin).toLocaleDateString("es-CR")}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-foreground">{s.dias_habiles}</td>
                  <td className="py-2 px-3 text-sm text-muted-foreground">
                    {s.paso_actual ? PASO_LABEL[s.paso_actual] : "—"}
                  </td>
                  <td className="py-2 px-3 text-sm text-right">
                    <Link
                      href={`/vacation/requests/${s.id}`}
                      className="text-primary hover:underline text-xs"
                    >
                      Revisar
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
