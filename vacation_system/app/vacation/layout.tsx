"use client";

import { useAuth } from "@/lib/useAuth";
import VacSidebar from "@/components/VacSidebar";

export default function VacationLayout({ children }: { children: React.ReactNode }) {
  const { ready, roles } = useAuth();

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground text-sm">Conectando con el sistema…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      <VacSidebar roles={roles} />
      <main className="flex-1 overflow-y-auto p-8 bg-background">{children}</main>
    </div>
  );
}
