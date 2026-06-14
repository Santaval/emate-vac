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
  fecha_modificacion: string;
  usuario: { nombre: string };
};

const ESTADO_COLOR: Record<string, string> = {
  Aprobado: "bg-green-100 text-green-700",
  Rechazado: "bg-red-100 text-red-700",
};

const FILTERS = ["", "Aprobado", "Rechazado"] as const;
const FILTER_LABELS: Record<string, string> = { "": "Todos", Aprobado: "Aprobado", Rechazado: "Rechazado" };

export default function HistoryPage() {
  const [items, setItems] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState("");

  function load(filter: string) {
    setLoading(true);
    const qs = filter ? `?estado=${filter}` : "";
    apiFetch(`/api/vacation/history${qs}`)
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(""); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-[28px] leading-[150%] text-page-title">Historial de solicitudes</h1>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setEstado(f); load(f); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              estado === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-table-hover"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="table-container">
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No hay registros.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="hover:bg-transparent bg-table-header border-b border-table-row-border">
                <th className="font-semibold text-base h-10 px-3 text-left">Profesor</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Período</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Días</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Estado</th>
                <th className="font-semibold text-base h-10 px-3 text-left">Resolución</th>
                <th className="font-semibold text-base h-10 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
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
                    {new Date(s.fecha_modificacion).toLocaleDateString("es-CR")}
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
