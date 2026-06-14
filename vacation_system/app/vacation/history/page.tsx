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
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold text-zinc-800">Historial de solicitudes</h1>

      <div className="flex gap-2">
        {["", "Aprobado", "Rechazado"].map((e) => (
          <button
            key={e}
            onClick={() => { setEstado(e); load(e); }}
            className={`px-3 py-1.5 rounded text-sm border transition-colors ${
              estado === e
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
            }`}
          >
            {e || "Todos"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        {loading ? (
          <p className="px-4 py-6 text-sm text-zinc-400">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-400">No hay registros.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3">Profesor</th>
                <th className="px-4 py-3">Período</th>
                <th className="px-4 py-3 text-center">Días</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Resolución</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-700">{s.usuario.nombre}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {new Date(s.fecha_inicio).toLocaleDateString("es-CR")} →{" "}
                    {new Date(s.fecha_fin).toLocaleDateString("es-CR")}
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-600">{s.dias_habiles}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ESTADO_COLOR[s.estado] ?? "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {s.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(s.fecha_modificacion).toLocaleDateString("es-CR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/vacation/requests/${s.id}`}
                      className="text-blue-600 hover:underline text-xs"
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
