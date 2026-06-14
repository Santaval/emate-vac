"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, History, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/vacation", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/vacation/requests", label: "Solicitudes", icon: FileText, exact: false },
  { href: "/vacation/history", label: "Historial", icon: History, exact: false },
  { href: "/vacation/users", label: "Usuarios", icon: Users, exact: false, adminOnly: true },
];

interface Props {
  roles: string[];
}

export default function VacSidebar({ roles }: Props) {
  const pathname = usePathname();
  const isAdmin = roles.includes("Jefe_Administrativo");

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="w-[220px] shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border h-full">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <span className="text-[15px] font-semibold text-foreground tracking-tight">
          Sistema de vacaciones
        </span>
      </div>
      <nav className="flex flex-col gap-1 px-3 py-3">
        {visibleItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[14px] transition-colors ${
                active
                  ? "font-semibold text-sidebar-primary bg-sidebar-accent"
                  : "font-normal text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
