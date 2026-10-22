"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CircleHelp, LogOut } from "lucide-react";
import { CuentaHogarLogo } from '@/components/CuentaHogarLogo';
import { useAuth } from "@/components/AuthProvider";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { AdminSidebar } from "./AdminSidebar";
import { AdminMobileNav } from "./AdminMobileNav";
import { ADMIN_DESTINATIONS, activeAdminDestination } from "./navigation";

export function AdminAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const active = activeAdminDestination(pathname);
  const label = ADMIN_DESTINATIONS.find(item => item.id === active)?.label || "Administración";
  const handleLogout = async () => {
    setLeaving(true);
    setError("");
    try { await logout(); router.push("/login"); }
    catch { setError("No pudimos cerrar la sesión. Intentá nuevamente."); setLeaving(false); }
  };

  // Las protecciones de cada página se conservan intactas. Esta guarda adicional
  // impide mostrar el shell antes de resolver la misma autorización existente.
  return (
    <AdminProtectedRoute>
      <div className="admin-shell min-h-screen bg-background-main text-text-primary lg:pl-60">
        <a href="#admin-content" className="admin-skip">Saltar al contenido</a>
        <aside className="fixed inset-y-0 left-0 hidden w-60 overflow-y-auto border-r border-border-color bg-surface px-3 py-6 lg:block">
          <Link href="/admin" className="admin-control mb-7 flex items-center gap-3 rounded-lg px-3">
            <CuentaHogarLogo className="h-12" />
            <span><span className="block font-heading text-lg font-extrabold text-brand-primary">Cuenta Hogar</span><span className="text-sm text-text-secondary">Administrador</span></span>
          </Link>
          <AdminSidebar pathname={pathname} />
          <a href="/nosotros#contacto" className="admin-control mt-5 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-background-main"><CircleHelp aria-hidden="true" className="size-5" />Ayuda</a>
          <button type="button" onClick={handleLogout} disabled={leaving} className="admin-control flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-[#B42318] disabled:opacity-60"><LogOut aria-hidden="true" className="size-5" />{leaving ? "Cerrando sesión…" : "Salir"}</button>
        </aside>
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border-color bg-surface px-4 py-3 sm:px-8">
          <div><p className="flex items-center gap-2 font-heading text-sm font-bold text-brand-primary lg:hidden"><CuentaHogarLogo className="h-9" />Cuenta Hogar · Administrador</p><p className="text-sm text-text-secondary">Operación diaria <span aria-hidden="true">/</span> <span className="font-semibold text-brand-primary">{label}</span></p></div>
          <div className="flex items-center gap-3">
            <Link href="/admin#alertas" className="admin-control flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm"><Bell aria-hidden="true" className="size-4" />Alertas</Link>
            <span className="hidden text-sm text-success sm:inline">Sesión activa</span>
            <button type="button" onClick={handleLogout} disabled={leaving} className="admin-control flex min-h-11 items-center gap-2 rounded-lg border border-border-color px-3 text-sm font-heading font-semibold disabled:opacity-60"><LogOut aria-hidden="true" className="size-4" />{leaving ? "Saliendo…" : "Salir"}</button>
          </div>
        </header>
        {error && <p role="alert" className="px-4 py-3 text-[#B42318]">{error}</p>}
        <main id="admin-content" tabIndex={-1} className="min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>
        <AdminMobileNav pathname={pathname} />
      </div>
    </AdminProtectedRoute>
  );
}
