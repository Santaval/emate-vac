"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";

type Revision = {
  id: number;
  rol_revisor: string;
  accion: string;
  comentario: string | null;
  fecha_revision: string;
  usuario: { nombre: string };
};

type Solicitud = {
  id: number;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_habiles: number;
  observacion: string | null;
  paso_actual: number | null;
  fecha_creacion: string;
  usuario: { nombre: string; email: string | null };
  vac_revision: Revision[];
};

const PASO_ROL: Record<number, string> = {
  1: "Jefe de Departamento",
  2: "Director de Escuela",
  3: "Jefe Administrativo",
};

const ESTADO_COLOR: Record<string, string> = {
  Borrador: "bg-zinc-100 text-zinc-600",
  Enviado: "bg-blue-100 text-blue-700",
  Aprobado: "bg-green-100 text-green-700",
  Rechazado: "bg-red-100 text-red-700",
};

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState("");
  const [actionError, setActionError] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    apiFetch(`/api/vacation/requests/${id}`)
      .then((r) => r.json())
      .then(setSolicitud)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction(action: "approve" | "reject") {
    if (action === "reject" && !comentario.trim()) {
      setActionError("El comentario es requerido para rechazar");
      return;
    }
    setActing(true);
    setActionError("");
    const endpoint = action === "approve" ? "/api/vacation/approve" : "/api/vacation/reject";
    const res = await apiFetch(endpoint, {
      method: "POST",
      body: JSON.stringify({ id_solicitud: Number(id), comentario: comentario || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error ?? "Error al procesar");
      setActing(false);
      return;
    }
    router.push("/vacation/requests");
  }

  async function handleSubmit() {
    setActing(true);
    const res = await apiFetch(`/api/vacation/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "submit" }),
    });
    if (res.ok) router.push("/vacation/requests");
    else {
      const d = await res.json();
      setActionError(d.error ?? "Error al enviar");
      setActing(false);
    }
  }

  if (loading) return <p className="text-sm text-zinc-400 p-4">Cargando…</p>;
  if (!solicitud) return <p className="text-sm text-red-500 p-4">Solicitud no encontrada.</p>;

  const s = solicitud;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/vacation/requests" className="text-zinc-400 hover:text-zinc-600 text-sm">
          ← Volver
        </Link>
        <h1 className="text-xl font-semibold text-zinc-800">Solicitud #{s.id}</h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            ESTADO_COLOR[s.estado] ?? "bg-zinc-100 text-zinc-600"
          }`}
        >
          {s.estado}
        </span>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-5 space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-zinc-500">Solicitante</p>
            <p className="font-medium text-zinc-800">{s.usuario.nombre}</p>
          </div>
          <div>
            <p className="text-zinc-500">Días hábiles</p>
            <p className="font-medium text-zinc-800">{s.dias_habiles}</p>
          </div>
          <div>
            <p className="text-zinc-500">Fecha inicio</p>
            <p className="font-medium text-zinc-800">
              {new Date(s.fecha_inicio).toLocaleDateString("es-CR")}
            </p>
          </div>
          <div>
            <p className="text-zinc-500">Fecha fin</p>
            <p className="font-medium text-zinc-800">
              {new Date(s.fecha_fin).toLocaleDateString("es-CR")}
            </p>
          </div>
          {s.paso_actual && (
            <div>
              <p className="text-zinc-500">Paso actual</p>
              <p className="font-medium text-zinc-800">{PASO_ROL[s.paso_actual]}</p>
            </div>
          )}
          {s.observacion && (
            <div className="col-span-2">
              <p className="text-zinc-500">Observación</p>
              <p className="text-zinc-700">{s.observacion}</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviewer actions */}
      {s.estado === "Enviado" && (
        <div className="bg-white rounded-lg border shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-medium text-zinc-700">Acción de revisión</h2>
          <textarea
            placeholder="Comentario (requerido para rechazar)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          <div className="flex gap-3">
            <button
              disabled={acting}
              onClick={() => handleAction("approve")}
              className="flex-1 bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Aprobar
            </button>
            <button
              disabled={acting}
              onClick={() => handleAction("reject")}
              className="flex-1 bg-red-600 text-white text-sm px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Rechazar
            </button>
          </div>
        </div>
      )}

      {/* Submit draft */}
      {s.estado === "Borrador" && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}
          <button
            disabled={acting}
            onClick={handleSubmit}
            className="bg-blue-700 text-white text-sm px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            Enviar solicitud
          </button>
        </div>
      )}

      {/* Revision history */}
      {s.vac_revision.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-5 py-3 border-b">
            <h2 className="text-sm font-medium text-zinc-700">Historial de revisiones</h2>
          </div>
          <ul className="divide-y">
            {s.vac_revision.map((r) => (
              <li key={r.id} className="px-5 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-700">{r.usuario.nombre}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.accion === "Aprobado"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {r.accion}
                  </span>
                </div>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {r.rol_revisor} · {new Date(r.fecha_revision).toLocaleString("es-CR")}
                </p>
                {r.comentario && <p className="text-zinc-600 mt-1">{r.comentario}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
