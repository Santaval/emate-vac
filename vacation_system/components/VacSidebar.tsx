"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/vacation", label: "Inicio", exact: true },
  { href: "/vacation/my-periods", label: "Mis periodos", exact: false },
  { href: "/vacation/requests", label: "Solicitudes", exact: false },
  { href: "/vacation/pending", label: "Pendientes", exact: false, reviewerOnly: true },
  { href: "/vacation/history", label: "Historial", exact: false },
  { href: "/vacation/periods", label: "Periodos", exact: false, adminOnly: true },
  { href: "/vacation/users", label: "Usuarios", exact: false, adminOnly: true },
];

interface Props {
  roles: string[];
}

export default function VacSidebar({ roles }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const isAdmin = roles.includes("Jefe_Administrativo");
  const isReviewer =
    roles.includes("Jefe_de_Departamento") ||
    roles.includes("Director_de_Escuela") ||
    roles.includes("Jefe_Administrativo");

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.reviewerOnly && !isReviewer) return false;
    return true;
  });

  if (!open) {
    return (
      <div className="w-16 h-full bg-sidebar border-r border-sidebar-border font-sans flex justify-center transition-all duration-300">
        <div className="px-8 pt-7 pb-5 flex justify-between border-b border-sidebar-border">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium shadow-xs hover:bg-sidebar-accent transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[343px] h-full overflow-y-auto bg-sidebar border-r border-sidebar-border font-sans transition-all duration-300">
      <div className="px-8 pt-7 pb-5 flex items-center justify-between border-b border-sidebar-border">
        <h2 className="text-[22px]/[26px] font-semibold tracking-[-0.2px] text-foreground">
          Sistema de vacaciones
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium shadow-xs hover:bg-sidebar-accent transition-colors"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      <nav aria-label="Sistema de vacaciones" className="pb-10 pt-2">
        <div className="space-y-4">
          <div>
            <div className="px-8 py-2.5 text-[18px]/[22px] font-semibold tracking-[-0.2px] text-sidebar-foreground">
              Navegación
            </div>
            <ul className="mt-3 space-y-3">
              {visibleItems.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md pl-14 pr-6 py-3 text-[18px]/[22px] tracking-[-0.2px] transition-colors ${
                        active
                          ? "font-semibold text-sidebar-primary"
                          : "font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}
