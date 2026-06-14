"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiFetch";

function countWeekdays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (e < s) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function NewRequestPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fecha_inicio: "", fecha_fin: "", observacion: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const dias = countWeekdays(form.fecha_inicio, form.fecha_fin);

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
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al crear la solicitud"); return; }

      if (action === "submit") {
        const submitRes = await apiFetch(`/api/vacation/requests/${data.id}`, {
          method: "PATCH",
          body: JSON.stringify({ action: "submit" }),
        });
        if (!submitRes.ok) {
          const d = await submitRes.json();
          setError(d.error ?? "Error al enviar la solicitud");
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
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-[28px] leading-[150%] text-page-title">Nueva solicitud de vacaciones</h1>

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
          <p className="text-sm text-foreground">
            Días hábiles:{" "}
            <span className={`font-semibold ${dias === 0 ? "text-red-600" : "text-primary"}`}>
              {dias}
            </span>
          </p>
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
            disabled={saving || dias === 0}
            onClick={(e) => handleSubmit(e, "save")}
            className="flex-1 border border-border text-foreground text-sm px-4 py-2 rounded-md font-medium hover:bg-table-hover disabled:opacity-50 transition-colors bg-background"
          >
            Guardar borrador
          </button>
          <button
            type="button"
            disabled={saving || dias === 0}
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
