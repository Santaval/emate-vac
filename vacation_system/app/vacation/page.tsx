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

  useEffect(() => {
    apiFetch("/api/vacation/requests")
      .then((r) => r.json())
      .then(setSolicitudes)
      .finally(() => setLoading(false));
  }, []);

  const pending = solicitudes.filter((s) => s.estado === "Enviado").length;
  const draft = solicitudes.filter((s) => s.estado === "Borrador").length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-800">Panel de Vacaciones</h1>
        <Link
          href="/vacation/requests/new"
          className="bg-blue-700 text-white text-sm px-4 py-2 rounded hover:bg-blue-800 transition-colors"
        >
          + Nueva solicitud
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pendientes", value: pending, color: "text-blue-700" },
          { label: "Borradores", value: draft, color: "text-zinc-600" },
          { label: "Total", value: solicitudes.length, color: "text-zinc-800" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-lg border p-4 shadow-sm">
            <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-medium text-zinc-700">Solicitudes recientes</h2>
        </div>
        {loading ? (
          <p className="px-4 py-6 text-sm text-zinc-400">Cargando…</p>
        ) : solicitudes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-400">No hay solicitudes aún.</p>
        ) : (
          <ul className="divide-y">
            {solicitudes.slice(0, 5).map((s) => (
              <li key={s.id}>
                <Link
                  href={`/vacation/requests/${s.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-sm text-zinc-700">
                    {new Date(s.fecha_inicio).toLocaleDateString("es-CR")} →{" "}
                    {new Date(s.fecha_fin).toLocaleDateString("es-CR")}
                    <span className="ml-2 text-zinc-400">({s.dias_habiles} días)</span>
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
          <div className="px-4 py-3 border-t">
            <Link href="/vacation/requests" className="text-sm text-blue-600 hover:underline">
              Ver todas →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
