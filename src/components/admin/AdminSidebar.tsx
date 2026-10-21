import Link from "next/link";
import { ADMIN_DESTINATIONS, activeAdminDestination } from "./navigation";

export function AdminSidebar({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const active = activeAdminDestination(pathname);
  return (
    <nav aria-label="Secciones de administración" className="space-y-1">
      {ADMIN_DESTINATIONS.map(({ id, label, href, icon: Icon }, index) => (
        <Link key={id} href={href} onClick={onNavigate} aria-current={active === id ? "page" : undefined}
          className={`admin-control flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-heading font-semibold ${index === 7 ? "mt-5" : ""} ${active === id ? "bg-brand-primary text-white" : "text-text-primary hover:bg-background-main"}`}>
          <Icon aria-hidden="true" className="size-5 shrink-0" />{label}
        </Link>
      ))}
      <div className="mt-5 border-t border-border-color pt-3">
        <p className="px-3 pb-1 text-xs font-semibold text-text-secondary">Accesos relacionados</p>
        <Link href="/admin/clientes" onClick={onNavigate} className="admin-control flex min-h-11 items-center rounded-xl px-3 text-sm hover:bg-background-main">Clientes</Link>
      </div>
    </nav>
  );
}
