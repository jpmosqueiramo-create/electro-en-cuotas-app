"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";
import { ADMIN_DESTINATIONS, activeAdminDestination } from "./navigation";
import { AdminSidebar } from "./AdminSidebar";

export function AdminMobileNav({ pathname }: { pathname: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const active = activeAdminDestination(pathname);
  const primary = ADMIN_DESTINATIONS.filter(item => ["today", "requests", "collections"].includes(item.id));
  const moreActive = !primary.some(item => item.id === active);
  const close = () => dialog.current?.close();

  return (
    <>
      <nav aria-label="Navegación móvil de administración" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border-color bg-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {primary.map(({ id, href, label, icon: Icon }) => (
          <Link key={id} href={href} aria-current={active === id ? "page" : undefined}
            className={`admin-control flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-heading font-semibold ${active === id ? "text-brand-primary bg-background-main" : "text-text-secondary"}`}>
            <Icon aria-hidden="true" className="size-5" />{label}
          </Link>
        ))}
        <button ref={trigger} type="button" aria-haspopup="dialog" aria-controls="admin-more-menu" aria-expanded={open}
          onClick={() => { dialog.current?.showModal(); setOpen(true); }}
          className={`admin-control flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg text-xs font-heading font-semibold ${moreActive ? "bg-background-main text-brand-primary" : "text-text-secondary"}`}>
          <MoreHorizontal aria-hidden="true" className="size-5" />Más
        </button>
      </nav>
      {/* Native dialog provides focus containment, Escape and an inert background. */}
      <dialog ref={dialog} id="admin-more-menu" aria-labelledby="admin-more-title"
        onClose={() => { setOpen(false); trigger.current?.focus(); }}
        className="admin-menu fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-border-color bg-surface p-4 text-text-primary shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="admin-more-title" className="font-heading text-lg font-bold text-brand-primary">Administración</h2>
          <button type="button" onClick={close} className="admin-control flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border-color" aria-label="Cerrar menú"><X aria-hidden="true" className="size-5" /></button>
        </div>
        <AdminSidebar pathname={pathname} onNavigate={close} />
      </dialog>
    </>
  );
}
