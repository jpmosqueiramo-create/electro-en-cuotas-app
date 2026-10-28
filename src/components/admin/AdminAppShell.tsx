"use client";

import { AdminAlertsLink } from './AdminAlertsLink';
import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleHelp, LogOut, ShieldCheck } from "lucide-react";
import { CuentaHogarLogo } from '@/components/CuentaHogarLogo';
import { useAuth } from "@/components/AuthProvider";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { AdminHorizontalNav } from "./AdminHorizontalNav";

export function AdminAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
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
      <div className="admin-shell min-h-screen bg-background-main text-text-primary" data-testid="admin-original-interface">
        <a href="#admin-content" className="admin-skip">Saltar al contenido</a>
        <div className="mx-auto max-w-7xl space-y-4 px-4 pt-4 sm:px-8 sm:pt-8">
          <header className="flex flex-col gap-4 rounded-2xl border border-border-color bg-surface p-4 shadow-xs sm:p-5 md:flex-row md:items-center md:justify-between">
            <Link href="/admin" className="admin-control flex min-w-0 items-center gap-3.5 rounded-xl">
              <CuentaHogarLogo className="h-14 shrink-0" />
              <span className="min-w-0 border-l border-border-color pl-3.5">
                <span className="flex items-center gap-1.5 font-heading text-xs font-bold text-brand-secondary"><ShieldCheck aria-hidden="true" className="size-4 shrink-0" />Administración</span>
                <span className="block font-heading text-xl font-extrabold leading-tight text-brand-primary sm:text-2xl">Cuenta Hogar</span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-2 border-t border-border-color pt-3 md:border-0 md:pt-0">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color bg-background-main px-3 text-xs font-semibold text-brand-primary"><span aria-hidden="true" className="size-2 rounded-full bg-success" />Sesión activa</span>
              <AdminAlertsLink />
              <a href="/nosotros#contacto" className="admin-control inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold"><CircleHelp aria-hidden="true" className="size-4" />Ayuda</a>
              <button type="button" onClick={handleLogout} disabled={leaving} className="admin-control inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border-color px-3 text-xs font-semibold text-[#B42318] disabled:opacity-60"><LogOut aria-hidden="true" className="size-4" />{leaving ? "Saliendo…" : "Salir"}</button>
            </div>
          </header>
          <AdminHorizontalNav pathname={pathname} />
        </div>
        {error && <p role="alert" className="px-4 py-3 text-[#B42318]">{error}</p>}
        <main id="admin-content" tabIndex={-1} className="min-w-0 pb-[env(safe-area-inset-bottom)]">{children}</main>
      </div>
    </AdminProtectedRoute>
  );
}
