"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";
import { getApiErrorMessage, getDefaultApiErrorMessage } from "@/lib/apiError";
import { calcularDiasHabiles } from "@/modules/vacation/services/calendarService";

type Periodo = {
  id: number;
  fecha_inicio: string;
  fecha_fin: string;
  dias_autorizados: number;
  estado: "Disponible" | "Utilizado" | "Vencido";
  observacion: string | null;
};

function countWeekdays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return calcularDiasHabiles(s, e);
}

export default function NewRequestPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fecha_inicio: "", fecha_fin: "", observacion: "" });
  const [periods, setPeriods] = useState<Periodo[]>([]);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const dias = countWeekdays(form.fecha_inicio, form.fecha_fin);
  const availablePeriods = useMemo(
    () => periods.filter((period) => period.estado === "Disponible"),
    [periods]
  );
  const selectedPeriod = useMemo(() => {
    if (!form.fecha_inicio || !form.fecha_fin) return null;
    return availablePeriods.find((period) => {
      const start = period.fecha_inicio.slice(0, 10);
      const end = period.fecha_fin.slice(0, 10);
      return start <= form.fecha_inicio && end >= form.fecha_fin;
    }) ?? null;
  }, [availablePeriods, form.fecha_fin, form.fecha_inicio]);
  const hasSelectedRange = Boolean(form.fecha_inicio && form.fecha_fin);
  const rangeOutsidePeriod = hasSelectedRange && !selectedPeriod;

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
        if (!cancelled) setLoadingPeriods(false);
      }
    }

    void loadPeriods();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent, action: "save" | "submit") {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await apiFetch("/api/vacation/requests", {
        method: "POST",
        body: JSON.stringify({
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          observacion: form.observacion || undefined,
        }),
      });
      if (!res.ok) {
        setError(await getApiErrorMessage(res, getDefaultApiErrorMessage(res.status)));
        return;
      }
      const data = await res.json();

      if (action === "submit") {
        const submitRes = await apiFetch(`/api/vacation/requests/${data.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "submit" }),
        });
        if (!submitRes.ok) {
          setError(await getApiErrorMessage(submitRes, getDefaultApiErrorMessage(submitRes.status)));
          return;
        }
      }
      router.push("/vacation/requests");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 block w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-[28px] leading-[150%] text-page-title">Nueva solicitud de vacaciones</h1>

      <div className="table-container">
        <div className="px-4 py-3 border-b border-table-row-border bg-table-header">
          <h2 className="text-sm font-semibold text-foreground">Periodos disponibles</h2>
        </div>
        {loadingPeriods ? (
          <p className="px-4 py-5 text-sm text-muted-foreground">Cargando periodos…</p>
        ) : availablePeriods.length === 0 ? (
          <p className="px-4 py-5 text-sm text-muted-foreground">
            No tiene periodos disponibles registrados para crear una solicitud.
          </p>
        ) : (
          <div className="divide-y divide-table-row-border">
            {availablePeriods.map((period) => (
              <div key={period.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_auto_auto] bg-table-row">
                <span className="text-foreground">
                  {new Date(period.fecha_inicio).toLocaleDateString("es-CR")} →{" "}
                  {new Date(period.fecha_fin).toLocaleDateString("es-CR")}
                </span>
                <span className="text-muted-foreground">{period.dias_autorizados} días</span>
                {period.observacion && (
                  <span className="text-muted-foreground md:text-right">{period.observacion}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="bg-card rounded-lg border border-border shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Fecha de inicio</span>
            <input
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-foreground">Fecha de fin</span>
            <input
              type="date"
              value={form.fecha_fin}
              min={form.fecha_inicio}
              onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
              required
              className={inputClass}
            />
          </label>
        </div>

        {form.fecha_inicio && form.fecha_fin && (
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              Días hábiles:{" "}
              <span className={`font-semibold ${dias === 0 ? "text-red-600" : "text-primary"}`}>
                {dias}
              </span>
            </p>
            {selectedPeriod ? (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                El rango seleccionado está dentro de un periodo autorizado disponible.
              </p>
            ) : (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                El rango seleccionado debe estar dentro de uno de sus periodos disponibles.
              </p>
            )}
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium text-foreground">Observación (opcional)</span>
          <textarea
            value={form.observacion}
            onChange={(e) => setForm({ ...form, observacion: e.target.value })}
            rows={3}
            maxLength={300}
            className={`${inputClass} resize-none`}
          />
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || dias === 0 || rangeOutsidePeriod}
            onClick={(e) => handleSubmit(e, "save")}
            className="flex-1 border border-border text-foreground text-sm px-4 py-2 rounded-md font-medium hover:bg-table-hover disabled:opacity-50 transition-colors bg-background"
          >
            Guardar borrador
          </button>
          <button
            type="button"
            disabled={saving || dias === 0 || rangeOutsidePeriod}
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent, "submit")}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-4 py-2 rounded-md font-medium disabled:opacity-50 transition-colors"
          >
            Enviar solicitud
          </button>
        </div>
      </form>
    </div>
  );
}
