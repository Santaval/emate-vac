"use client";

import { useState } from "react";
import { clearToken, getToken } from "@/lib/useAuth";
import DevLoginForm from "@/components/DevLoginForm";

interface Props {
  roles: string[];
}

function decodeTokenPayload(token: string): Record<string, unknown> {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
}

export default function DevUserSwitcher({ roles }: Props) {
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV !== "development") return null;

  function handleRevert() {
    clearToken();
    window.location.reload();
  }

  const currentToken = open ? getToken() : null;
  const initialUsername = currentToken
    ? (decodeTokenPayload(currentToken).preferred_username as string | undefined)
    : undefined;
  const isEmbedded = typeof window !== "undefined" && window.parent !== window;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-card border border-border rounded-md px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-sidebar-accent transition-colors"
      >
        Dev: cambiar usuario
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <DevLoginForm
              onCancel={() => setOpen(false)}
              initialUsername={initialUsername}
              initialRoles={roles.length > 0 ? roles : undefined}
            />
            <button
              type="button"
              onClick={handleRevert}
              className="w-full max-w-sm bg-card border border-border rounded-md px-4 py-2 text-sm font-medium text-foreground hover:bg-sidebar-accent transition-colors"
            >
              {isEmbedded ? "Volver a sesión SAC" : "Cerrar sesión"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
