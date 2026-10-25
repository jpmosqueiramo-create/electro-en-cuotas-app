"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ADMIN_DESTINATIONS, activeAdminDestination } from "./navigation";

// The original horizontal navigation, connected exclusively to current modules.
export function AdminHorizontalNav({ pathname }: { pathname: string }) {
  const active = activeAdminDestination(pathname);
  const modules = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = modules.current;
    const selected = container?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!container || !selected) return;
    const outer = container.getBoundingClientRect(), inner = selected.getBoundingClientRect();
    if (inner.left < outer.left) container.scrollLeft -= outer.left - inner.left;
    else if (inner.right > outer.right) container.scrollLeft += inner.right - outer.right;
  }, [active]);
  return <nav aria-label="Secciones de administración" className="min-w-0 rounded-2xl border border-border-color bg-surface p-1.5 shadow-xs">
    <p className="px-3 pt-1 text-xs text-text-secondary sm:hidden">Deslizá las opciones para ver todos los módulos.</p>
    <div ref={modules} className="flex max-w-full gap-1 overflow-x-auto pb-1" tabIndex={0} aria-label="Módulos de administración">
      {ADMIN_DESTINATIONS.filter(item => item.id !== "laboratory").map(({ id, label, href, icon: Icon }) => <Link key={id} href={href} aria-current={active === id ? "page" : undefined}
        className={`admin-control inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 font-heading text-xs font-bold transition-colors ${active === id ? "bg-brand-primary text-white shadow-xs" : "text-text-primary hover:bg-background-main hover:text-brand-primary"}`}>
        <Icon aria-hidden="true" className={`size-4 shrink-0 ${active === id ? "text-white" : "text-brand-secondary"}`} />{id === "today" ? "Inicio" : label}
      </Link>)}
    </div>
  </nav>;
}
