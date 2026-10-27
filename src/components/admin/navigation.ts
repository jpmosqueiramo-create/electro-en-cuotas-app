import { CalendarDays, ClipboardList, FileText, Files, Wallet, Truck, Users, Package, ChartNoAxesCombined, Settings, FlaskConical, HandCoins } from "lucide-react";

export const ADMIN_DESTINATIONS = [
  { id: "today", label: "Hoy", href: "/admin", icon: CalendarDays },
  { id: "requests", label: "Solicitudes", href: "/admin/solicitudes", icon: ClipboardList },
  { id: "catalog", label: "Catálogo", href: "/admin/productos", icon: Package },
  { id: "collections", label: "Cobranzas", href: "/admin/cobranzas", icon: Wallet },
  { id: "settlements", label: "Rendiciones", href: "/admin/rendiciones", icon: HandCoins },
  { id: "sellers", label: "Vendedores afiliados", href: "/admin/comisiones", icon: Users },
  { id: "logistics", label: "Logística", href: "/admin/logistica", icon: Truck },
  { id: "budgets", label: "Presupuestos", href: "/admin/presupuestos", icon: FileText },
  { id: "clients", label: "Clientes", href: "/admin/clientes", icon: Users },
  { id: "reports", label: "Reportes", href: "/admin/reportes", icon: ChartNoAxesCombined },
  { id: "documents", label: "Documentación", href: "/admin/documentacion", icon: Files },
  { id: "laboratory", label: "Laboratorio de operaciones", href: "/admin/laboratorio", icon: FlaskConical },
  { id: "settings", label: "Configuración", href: "/admin/envios", icon: Settings },
] as const;

export function activeAdminDestination(pathname: string) {
  if (pathname.startsWith("/admin/operaciones/")) return "requests";
  if (pathname === "/admin/solicitudes" || pathname.startsWith("/admin/solicitudes/")) return "requests";
  if (pathname.startsWith("/admin/clientes")) return "clients";
  if (pathname.startsWith("/admin/rendiciones")) return "settlements";
  return ADMIN_DESTINATIONS.find(item => item.href === pathname)?.id;
}
