"use client";

import { useAuth } from "@/lib/useAuth";
import Link from "next/link";
import { usePathname } from "next/navigation";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active
          ? "bg-blue-700 text-white"
          : "text-blue-100 hover:bg-blue-600 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

export default function VacationLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500 text-sm">Conectando con el sistema…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <header className="bg-blue-800 text-white px-4 py-3 flex items-center gap-4 shadow">
        <span className="font-semibold text-sm tracking-wide">Vacaciones EMATE</span>
        <nav className="flex gap-1">
          <NavLink href="/vacation">Inicio</NavLink>
          <NavLink href="/vacation/requests">Solicitudes</NavLink>
          <NavLink href="/vacation/history">Historial</NavLink>
          <NavLink href="/vacation/users">Usuarios</NavLink>
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
