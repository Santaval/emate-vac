"use client";

import { useState } from "react";

const TOKEN_KEY = "vac_jwt";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "Profesor", label: "Profesor" },
  { value: "Jefe_de_Departamento", label: "Jefe de Departamento" },
  { value: "Jefe_Administrativo", label: "Jefe Administrativo" },
  { value: "Director_de_Escuela", label: "Director de Escuela" },
];

export default function DevLoginForm() {
  const [username, setUsername] = useState("dev.user");
  const [roles, setRoles] = useState<string[]>([
    "Profesor",
    "Jefe_de_Departamento",
    "Jefe_Administrativo",
    "Director_de_Escuela",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleRole(value: string) {
    setRoles((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dev/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), roles }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Error ${res.status}`);
      }
      const { token } = await res.json();
      sessionStorage.setItem(TOKEN_KEY, token);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-card rounded-lg border border-border p-6 shadow-sm space-y-5"
      >
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dev login</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Solo en desarrollo. Crea/actualiza el usuario y genera un token de bypass.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">Usuario</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">Roles</legend>
          {ROLE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={roles.includes(opt.value)}
                onChange={() => toggleRole(opt.value)}
                className="h-4 w-4 rounded border-border"
              />
              {opt.label}
            </label>
          ))}
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
