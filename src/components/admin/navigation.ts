import { CalendarDays, ClipboardList, FileText, Files, Wallet, Truck, Users, Package, ChartNoAxesCombined, Settings } from "lucide-react";

export const ADMIN_DESTINATIONS = [
  { id: "today", label: "Hoy", href: "/admin", icon: CalendarDays },
  { id: "requests", label: "Solicitudes", href: "/admin/solicitudes", icon: ClipboardList },
  { id: "budgets", label: "Presupuestos", href: "/admin/presupuestos", icon: FileText },
  { id: "documents", label: "Documentación", href: "/admin/documentacion", icon: Files },
  { id: "collections", label: "Cobranzas", href: "/admin/cobranzas", icon: Wallet },
  { id: "logistics", label: "Logística", href: "/admin/logistica", icon: Truck },
  { id: "sellers", label: "Vendedores afiliados", href: "/admin/comisiones", icon: Users },
  { id: "catalog", label: "Catálogo", href: "/admin/productos", icon: Package },
  { id: "reports", label: "Reportes", href: "/admin/reportes", icon: ChartNoAxesCombined },
  { id: "settings", label: "Configuración", href: "/admin/envios", icon: Settings },
] as const;

export function activeAdminDestination(pathname: string) {
  if (pathname === "/admin/solicitudes" || pathname.startsWith("/admin/solicitudes/")) return "requests";
  if (pathname.startsWith("/admin/clientes")) return "requests";
  if (pathname.startsWith("/admin/rendiciones")) return "sellers";
  return ADMIN_DESTINATIONS.find(item => item.href === pathname)?.id;
}
