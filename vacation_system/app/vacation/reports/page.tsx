"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { getApiErrorMessage, getDefaultApiErrorMessage } from "@/lib/apiError";

type StatusCounts = {
  Borrador: number;
  Enviado: number;
  Aprobado: number;
  Rechazado: number;
};

type UserReport = {
  id: number;
  nombre: string;
  email: string | null;
  dias_disponibles: number;
  dias_tomados: number;
  solicitudes: StatusCounts;
  total_solicitudes: number;
  periodos_autorizados: number;
  dias_autorizados_disponibles: number;
};

type MonthReport = {
  mes: string;
  solicitudes: StatusCounts;
};

type VacationReport = {
  resumen: {
    total_profesores: number;
    profesores_sin_solicitudes: number;
    dias_disponibles: number;
    dias_tomados: number;
    solicitudes: StatusCounts;
  };
  por_docente: UserReport[];
  por_mes: MonthReport[];
  profesores_sin_solicitudes: UserReport[];
};

type SaveFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandle>;
};

type SavePromptResult = SaveFileHandle | "unsupported" | "cancelled";

function buildQuery(filters: { fecha_inicio: string; fecha_fin: string }, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (filters.fecha_inicio) params.set("fecha_inicio", filters.fecha_inicio);
  if (filters.fecha_fin) params.set("fecha_fin", filters.fecha_fin);
  Object.entries(extra ?? {}).forEach(([key, value]) => params.set(key, value));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function promptSaveLocation(format: "csv" | "pdf", filename: string): Promise<SavePromptResult> {
  if (window.self !== window.top) return "unsupported";

  const picker = (window as SaveFilePickerWindow).showSaveFilePicker;
  if (!picker) return "unsupported";

  try {
    return await picker({
      suggestedName: filename,
      types: [
        {
          description: format === "csv" ? "Archivo CSV" : "Archivo PDF",
          accept:
            format === "csv"
              ? { "text/csv": [".csv"] }
              : { "application/pdf": [".pdf"] },
        },
      ],
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    if (e instanceof DOMException && e.name === "SecurityError") return "unsupported";
    throw e;
  }
}

function createDownloadWindow() {
  if (window.self === window.top) return null;

  const popup = window.open("", "_blank");
  if (!popup) return null;

  popup.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Generando reporte</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          a, button { color: #005da4; font-weight: 600; }
          .error { color: #b91c1c; }
        </style>
      </head>
      <body>
        <p>Generando reporte...</p>
      </body>
    </html>
  `);
  popup.document.close();

  return popup;
}

function triggerDownload(url: string, filename: string, popup: Window | null) {
  const ownerDocument = popup && !popup.closed ? popup.document : document;
  const link = ownerDocument.createElement("a");
  link.href = url;
  link.download = filename;
  link.textContent = `Descargar ${filename}`;
  ownerDocument.body.appendChild(link);
  link.click();
}

export default function ReportsPage() {
  const [report, setReport] = useState<VacationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);
  const [downloadLink, setDownloadLink] = useState<{
    url: string;
    filename: string;
    label: string;
    format: "csv" | "pdf";
    text?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ fecha_inicio: "", fecha_fin: "" });

  async function loadReport(nextFilters = filters) {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch(`/api/vacation/reports${buildQuery(nextFilters)}`);
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, getDefaultApiErrorMessage(response.status)));
      }
      setReport(await response.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialReport() {
      try {
        const response = await apiFetch("/api/vacation/reports");
        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, getDefaultApiErrorMessage(response.status)));
        }
        const data = await response.json();
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "No se pudo cargar el reporte.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitialReport();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (downloadLink) URL.revokeObjectURL(downloadLink.url);
    };
  }, [downloadLink]);

  async function downloadReport(format: "csv" | "pdf") {
    setDownloading(format);
    setError("");

    try {
      const filename = format === "csv" ? "reporte-vacaciones.csv" : "reporte-vacaciones.pdf";
      const downloadWindow = createDownloadWindow();
      const savePrompt = await promptSaveLocation(format, filename);
      if (savePrompt === "cancelled") {
        downloadWindow?.close();
        return;
      }

      const response = await apiFetch(`/api/vacation/reports${buildQuery(filters, { format })}`);
      if (!response.ok) {
        downloadWindow?.close();
        throw new Error(await getApiErrorMessage(response, getDefaultApiErrorMessage(response.status)));
      }

      const text = format === "csv" ? await response.text() : undefined;
      const blob = text
        ? new Blob([text], { type: "text/csv;charset=utf-8" })
        : await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadLink((previous) => {
        if (previous) URL.revokeObjectURL(previous.url);
        return {
          url,
          filename,
          label: format === "csv" ? "Abrir Excel (CSV) generado" : "Abrir PDF generado",
          format,
          text,
        };
      });

      if (savePrompt !== "unsupported") {
        const writable = await savePrompt.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        if (downloadWindow && !downloadWindow.closed) {
          downloadWindow.document.body.innerHTML = `
            <p>Archivo generado.</p>
            <p>Si la descarga no inicia automáticamente, use el enlace:</p>
          `;
        }
        triggerDownload(url, filename, downloadWindow);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo descargar el reporte.");
    } finally {
      setDownloading(null);
    }
  }

  const inputClass =
    "mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-[150%] text-page-title">Reportes de vacaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Consulte saldos, solicitudes por estado y actividad por periodo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => downloadReport("csv")}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-table-hover"
          >
            {downloading === "csv" ? "Descargando..." : "Descargar Excel (CSV)"}
          </button>
          <button
            type="button"
            disabled={downloading !== null}
            onClick={() => downloadReport("pdf")}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-table-hover"
          >
            {downloading === "pdf" ? "Descargando..." : "Descargar PDF"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label>
            <span className="text-xs font-medium text-muted-foreground">Desde</span>
            <input
              type="date"
              value={filters.fecha_inicio}
              onChange={(e) => setFilters({ ...filters, fecha_inicio: e.target.value })}
              className={inputClass}
            />
          </label>
          <label>
            <span className="text-xs font-medium text-muted-foreground">Hasta</span>
            <input
              type="date"
              value={filters.fecha_fin}
              min={filters.fecha_inicio}
              onChange={(e) => setFilters({ ...filters, fecha_fin: e.target.value })}
              className={inputClass}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => loadReport()}
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </p>
      )}

      {downloadLink && (
        <div className="space-y-3 rounded-md border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-foreground">
            Archivo generado:{" "}
            <a
              href={downloadLink.url}
              download={downloadLink.filename}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-green-700 underline"
            >
              {downloadLink.label}
            </a>
          </p>
          {downloadLink.format === "csv" && downloadLink.text && (
            <textarea
              readOnly
              value={downloadLink.text}
              rows={6}
              className="w-full rounded-md border border-green-200 bg-white px-3 py-2 font-mono text-xs text-foreground"
            />
          )}
          {downloadLink.format === "pdf" && (
            <p className="text-sm text-muted-foreground">
              El PDF se generó correctamente. Si el navegador bloquea la descarga automática dentro del iframe,
              abra el enlace generado en una pestaña nueva.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Profesores", value: report?.resumen.total_profesores ?? 0 },
          { label: "Sin solicitudes", value: report?.resumen.profesores_sin_solicitudes ?? 0 },
          { label: "Días disponibles", value: report?.resumen.dias_disponibles ?? 0 },
          { label: "Días tomados", value: report?.resumen.dias_tomados ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {(["Borrador", "Enviado", "Aprobado", "Rechazado"] as const).map((estado) => (
          <div key={estado} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{estado}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">
              {loading ? "—" : report?.resumen.solicitudes[estado] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="table-container">
        <div className="px-4 py-3 border-b border-table-row-border bg-table-header">
          <h2 className="text-sm font-semibold text-foreground">Resumen por docente</h2>
        </div>
        {loading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Cargando…</p>
        ) : !report || report.por_docente.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No hay datos para mostrar.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="hover:bg-transparent bg-table-header border-b border-table-row-border">
                <th className="font-semibold text-base h-10 px-3 text-left">Docente</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Disponibles</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Tomados</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Aprobadas</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Rechazadas</th>
                <th className="font-semibold text-base h-10 px-3 text-center">Periodos</th>
              </tr>
            </thead>
            <tbody>
              {report.por_docente.map((user) => (
                <tr key={user.id} className="border-b border-table-row-border hover:bg-table-hover bg-table-row">
                  <td className="py-2 px-3 text-sm text-foreground">
                    <p>{user.nombre}</p>
                    {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                  </td>
                  <td className="py-2 px-3 text-sm text-center text-foreground">{user.dias_disponibles}</td>
                  <td className="py-2 px-3 text-sm text-center text-foreground">{user.dias_tomados}</td>
                  <td className="py-2 px-3 text-sm text-center text-foreground">{user.solicitudes.Aprobado}</td>
                  <td className="py-2 px-3 text-sm text-center text-foreground">{user.solicitudes.Rechazado}</td>
                  <td className="py-2 px-3 text-sm text-center text-foreground">{user.periodos_autorizados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="table-container">
          <div className="px-4 py-3 border-b border-table-row-border bg-table-header">
            <h2 className="text-sm font-semibold text-foreground">Solicitudes por mes</h2>
          </div>
          {!report || report.por_mes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No hay solicitudes en el periodo.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="hover:bg-transparent bg-table-header border-b border-table-row-border">
                  <th className="font-semibold text-base h-10 px-3 text-left">Mes</th>
                  <th className="font-semibold text-base h-10 px-3 text-center">Enviado</th>
                  <th className="font-semibold text-base h-10 px-3 text-center">Aprobado</th>
                  <th className="font-semibold text-base h-10 px-3 text-center">Rechazado</th>
                </tr>
              </thead>
              <tbody>
                {report.por_mes.map((month) => (
                  <tr key={month.mes} className="border-b border-table-row-border hover:bg-table-hover bg-table-row">
                    <td className="py-2 px-3 text-sm text-foreground">{month.mes}</td>
                    <td className="py-2 px-3 text-sm text-center text-foreground">{month.solicitudes.Enviado}</td>
                    <td className="py-2 px-3 text-sm text-center text-foreground">{month.solicitudes.Aprobado}</td>
                    <td className="py-2 px-3 text-sm text-center text-foreground">{month.solicitudes.Rechazado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-container">
          <div className="px-4 py-3 border-b border-table-row-border bg-table-header">
            <h2 className="text-sm font-semibold text-foreground">Profesores sin solicitudes</h2>
          </div>
          {!report || report.profesores_sin_solicitudes.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Todos tienen solicitudes registradas.</p>
          ) : (
            <ul>
              {report.profesores_sin_solicitudes.map((user) => (
                <li key={user.id} className="border-b border-table-row-border px-4 py-3 text-sm bg-table-row">
                  <p className="text-foreground">{user.nombre}</p>
                  {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
