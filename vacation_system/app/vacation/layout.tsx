"use client";

import { getToken, useAuth } from "@/lib/useAuth";
import VacSidebar from "@/components/VacSidebar";
import DevLoginForm from "@/components/DevLoginForm";
import DevUserSwitcher from "@/components/DevUserSwitcher";

export default function VacationLayout({ children }: { children: React.ReactNode }) {
  const { ready, roles } = useAuth();

  if (!ready) {
    // In standalone dev there is no parent iframe to inject a token, so show a
    // local login form instead of waiting forever for a SAC_AUTH message.
    if (process.env.NODE_ENV === "development" && !getToken()) {
      return <DevLoginForm />;
    }

    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-background">
          <p className="text-muted-foreground text-sm">Conectando con el sistema…</p>
        </div>
        <DevUserSwitcher roles={roles} />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-1 min-h-0">
        <VacSidebar roles={roles} />
        <main className="flex-1 overflow-y-auto p-8 bg-background">{children}</main>
      </div>
      <DevUserSwitcher roles={roles} />
    </>
  );
}
