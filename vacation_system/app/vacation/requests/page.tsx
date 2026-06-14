"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
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

export default function RequestsPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/vacation/requests")
      .then((r) => r.json())
      .then(setSolicitudes)
      .finally(() => setLoading(false));
  }, []);

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

      <div className="table-container">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
        ) : solicitudes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No hay solicitudes.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="hover:bg-transparent bg-table-header border-b border-table-row-border">
                <th className="font-semibold text-base h-10 px-3 text-left">Profesor</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Período</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Días</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Estado</th>
                <th className="font-semibold text-base h-10 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
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
