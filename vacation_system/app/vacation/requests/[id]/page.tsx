"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { getApiErrorMessage, getDefaultApiErrorMessage } from "@/lib/apiError";
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
  id_usuario: number;
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

type CurrentUser = {
  id: number;
  username: string;
  roles: string[];
};

const PASO_ROL_DISPLAY: Record<number, string> = {
  1: "Jefe de Departamento",
  2: "Jefe Administrativo",
  3: "Director de Escuela",
};

// Prisma enum keys (underscores) — must match what /api/vacation/me returns
const PASO_ROL_ENUM: Record<number, string> = {
  1: "Jefe_de_Departamento",
  2: "Jefe_Administrativo",
  3: "Director_de_Escuela",
};

const ESTADO_COLOR: Record<string, string> = {
  Borrador: "bg-zinc-100 text-zinc-600",
  Enviado: "bg-blue-100 text-blue-700",
  Aprobado: "bg-green-100 text-green-700",
  Rechazado: "bg-red-100 text-red-700",
};

const ACCION_COLOR: Record<string, string> = {
  Creado: "bg-zinc-100 text-zinc-600",
  Enviado: "bg-blue-100 text-blue-700",
  Aprobado: "bg-green-100 text-green-700",
  Rechazado: "bg-red-100 text-red-700",
  Editado: "bg-yellow-100 text-yellow-700",
  Cancelado: "bg-orange-100 text-orange-700",
};

const inputClass =
  "w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none";

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState("");
  const [actionError, setActionError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/vacation/requests/${id}`).then(async (r) => {
        if (!r.ok) throw new Error(await getApiErrorMessage(r, getDefaultApiErrorMessage(r.status)));
        return r.json() as Promise<Solicitud>;
      }),
      apiFetch(`/api/vacation/me`).then(async (r) => {
        if (!r.ok) return null;
        return r.json() as Promise<CurrentUser>;
      }),
    ])
      .then(([sol, user]) => {
        setSolicitud(sol);
        setCurrentUser(user);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "No se pudo cargar la solicitud."))
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
    if (!res.ok) {
      setActionError(await getApiErrorMessage(res, getDefaultApiErrorMessage(res.status)));
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
      setActionError(await getApiErrorMessage(res, getDefaultApiErrorMessage(res.status)));
      setActing(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground p-4">Cargando…</p>;
  if (loadError) return <p className="text-sm text-red-600 p-4">{loadError}</p>;
  if (!solicitud) return <p className="text-sm text-red-600 p-4">Solicitud no encontrada.</p>;

  const s = solicitud;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/vacation/requests" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
          ← Volver
        </Link>
        <h1 className="text-[28px] leading-[150%] text-page-title">Solicitud #{s.id}</h1>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            ESTADO_COLOR[s.estado] ?? "bg-zinc-100 text-zinc-600"
          }`}
        >
          {s.estado}
        </span>
      </div>

      {/* Request details card */}
      <div className="bg-card rounded-lg border border-border shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Solicitante</p>
            <p className="font-medium text-foreground mt-0.5">{s.usuario.nombre}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Días hábiles</p>
            <p className="font-medium text-foreground mt-0.5">{s.dias_habiles}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha inicio</p>
            <p className="font-medium text-foreground mt-0.5">
              {new Date(s.fecha_inicio).toLocaleDateString("es-CR")}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Fecha fin</p>
            <p className="font-medium text-foreground mt-0.5">
              {new Date(s.fecha_fin).toLocaleDateString("es-CR")}
            </p>
          </div>
          {s.paso_actual && (
            <div>
              <p className="text-muted-foreground">Paso actual</p>
              <p className="font-medium text-foreground mt-0.5">{PASO_ROL_DISPLAY[s.paso_actual]}</p>
            </div>
          )}
          {s.observacion && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Observación</p>
              <p className="text-foreground mt-0.5">{s.observacion}</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviewer actions — only for the reviewer whose step it is */}
      {s.estado === "Enviado" &&
        s.paso_actual !== null &&
        currentUser?.roles.includes(PASO_ROL_ENUM[s.paso_actual!]) && (
        <div className="bg-card rounded-lg border border-border shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Acción de revisión</h2>
          <textarea
            placeholder="Comentario (requerido para rechazar)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={3}
            maxLength={500}
            className={inputClass}
          />
          {actionError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {actionError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              disabled={acting}
              onClick={() => handleAction("approve")}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-md font-medium disabled:opacity-50 transition-colors"
            >
              Aprobar
            </button>
            <button
              disabled={acting}
              onClick={() => handleAction("reject")}
              className="flex-1 bg-action-delete-bg hover:bg-action-delete-hover text-action-text text-sm px-4 py-2 rounded-md font-medium disabled:opacity-50 transition-colors"
            >
              Rechazar
            </button>
          </div>
        </div>
      )}

      {/* Submit draft — only for the owner */}
      {s.estado === "Borrador" && currentUser?.id === s.id_usuario && (
        <div className="bg-card rounded-lg border border-border shadow-sm p-5">
          {actionError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
              {actionError}
            </p>
          )}
          <button
            disabled={acting}
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-4 py-2 rounded-md font-medium disabled:opacity-50 transition-colors"
          >
            Enviar solicitud
          </button>
        </div>
      )}

      {/* Historial */}
      {s.vac_revision.length > 0 && (
        <div className="table-container">
          <div className="px-5 py-3 border-b border-table-row-border bg-table-header">
            <h2 className="text-sm font-semibold text-foreground">Historial</h2>
          </div>
          <ul>
            {s.vac_revision.map((r) => (
              <li key={r.id} className="px-5 py-3 text-sm border-b border-table-row-border last:border-0 bg-table-row">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{r.usuario.nombre}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ACCION_COLOR[r.accion] ?? "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {r.accion}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {r.rol_revisor} · {new Date(r.fecha_revision).toLocaleString("es-CR")}
                </p>
                {r.comentario && <p className="text-foreground mt-1">{r.comentario}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
