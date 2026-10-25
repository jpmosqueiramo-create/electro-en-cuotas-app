"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { AdminNav } from "@/components/AdminNav";
import Link from "next/link";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { resolveAlertAction, AlertaAdminItem } from "@/lib/budgetAlertRouting";
import { useState, useEffect } from "react";
import { Bell, ArrowRight, ClipboardList, Files, FileText, Wallet, Truck, CheckCheck, Package, Users, UserCheck, ChartNoAxesCombined, HandCoins } from "lucide-react";
import { adminPaths } from "@/lib/adminCanonicalNavigation";
import { ADMIN_DESTINATIONS } from "@/components/admin/navigation";

const MODULE_CARDS = [
  { title: "Solicitudes de clientes", subtitle: "Consultas y seguimiento", description: "Revisá las solicitudes recibidas y abrí la ficha de cada operación.", href: adminPaths.requests, icon: ClipboardList, action: "Ver bandeja de solicitudes", badge: "Principal" },
  { title: "Catálogo de productos", subtitle: "Referencias, precios y fotografías", description: "Administrá las referencias del catálogo y sus opciones disponibles.", href: "/admin/productos", icon: Package, action: "Abrir catálogo de productos", badge: "Catálogo" },
  { title: "Cartera y cobranzas", subtitle: "Cuotas, saldos y comprobantes", description: "Consultá vencimientos, pagos, recibos y gestiones de cobranza.", href: adminPaths.collections, icon: Wallet, action: "Abrir cartera y cobranzas", badge: "Finanzas" },
  { title: "Rendiciones", subtitle: "Control de fondos", description: "Consultá los fondos bajo custodia y las rendiciones registradas.", href: "/admin/rendiciones", icon: HandCoins, action: "Revisar rendiciones", badge: "Caja" },
  { title: "Vendedores afiliados y comisiones", subtitle: "Registro y seguimiento", description: "Consultá vendedores afiliados, porcentajes, comisiones y liquidaciones.", href: "/admin/comisiones", icon: UserCheck, action: "Abrir vendedores afiliados", badge: "Afiliados" },
  { title: "Logística y entregas", subtitle: "Proveedor, traslado y recepción", description: "Seguí el producto y consultá la documentación de traslado y entrega.", href: adminPaths.logistics, icon: Truck, action: "Abrir logística", badge: "Logística" },
  { title: "Presupuestos", subtitle: "Confección e historial de propuestas", description: "Prepará presupuestos o retomá las propuestas ya guardadas.", href: adminPaths.budgets, icon: FileText, action: "Abrir presupuestos", badge: "Propuestas" },
  { title: "Clientes", subtitle: "Directorio de clientes", description: "Consultá los datos y el historial disponible de cada cliente.", href: "/admin/clientes", icon: Users, action: "Abrir clientes", badge: "Directorio" },
  { title: "Reportes y planillas", subtitle: "Consulta y exportación", description: "Accedé a los reportes y las planillas disponibles del sistema.", href: "/admin/reportes", icon: ChartNoAxesCombined, action: "Abrir reportes", badge: "Planillas" },
  { title: "Documentación", subtitle: "Archivos y revisión", description: "Consultá documentación y continuá la revisión desde la ficha de operación.", href: adminPaths.documents, icon: Files, action: "Revisar documentación", badge: "Documentos" },
];

export default function AdminPage() {
  const [alertas, setAlertas] = useState<AlertaAdminItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [alertError, setAlertError] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "alertas_admin"), where("leida", "==", false));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLoadingAlerts(false);
      setAlertError(false);
      const data: AlertaAdminItem[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setAlertas(data.sort((a, b) => {
        const getMs = (item: AlertaAdminItem) => {
          const fc = item.fechaCreacion as { toMillis?: () => number } | undefined;
          return fc?.toMillis ? fc.toMillis() : 0;
        };
        return getMs(b) - getMs(a);
      }));
    }, (error) => {
      console.error("Error listening to admin alerts:", error);
      setAlertError(true);
      setLoadingAlerts(false);
    });
    return () => unsubscribe();
  }, []);

  const marcarLeida = async (id: string) => {
    try {
      await updateDoc(doc(db, "alertas_admin", id), { leida: true });
      setAlertas(alertas.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  const alertsEmpty = !loadingAlerts && !alertError && alertas.length === 0;

  return (
    <AdminProtectedRoute>
      <div className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8">
        <AdminNav title="Panel de Administración" subtitle="Elegí el módulo con el que querés trabajar." />

        <section id="alertas" aria-labelledby="alerts-title" className={`scroll-mt-4 rounded-2xl border border-border-color bg-surface ${alertsEmpty ? "p-4" : "p-4 sm:p-6"}`}>
          {alertsEmpty ? <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 id="alerts-title" className="flex items-center gap-2 font-heading text-base font-semibold text-brand-primary"><CheckCheck aria-hidden="true" className="size-4 shrink-0" />Sin alertas pendientes</h2>
              <p className="mt-1 text-sm text-text-secondary">No hay avisos sin leer en este momento.</p>
            </div>
            <Link href={adminPaths.requests} className="admin-control inline-flex min-h-11 w-24 shrink-0 items-center rounded-lg text-sm text-text-secondary underline underline-offset-4 sm:w-auto">Ver bandejas</Link>
          </div> : <>
          <div className="mb-4 flex items-start gap-3">
            <Bell aria-hidden="true" className="mt-1 size-5 shrink-0 text-brand-secondary" />
            <div>
              <h2 id="alerts-title" className="font-heading text-lg font-bold text-brand-primary">Pendientes y alertas</h2>
              <p className="text-sm text-text-secondary">Avisos no leídos. Marcar un aviso como leído no resuelve la tarea de la operación.</p>
            </div>
          </div>
          {loadingAlerts ? <p role="status" className="text-sm text-text-secondary">Cargando avisos…</p>
            : alertError ? <p role="alert" className="text-sm text-[#B42318]">No pudimos cargar los avisos. Recargá la página para volver a intentarlo.</p>
            : <ul className="space-y-3">{alertas.map(alerta => {
              const action = resolveAlertAction(alerta);
              const fecha = alerta.fechaCreacion && typeof alerta.fechaCreacion === "object" && "toDate" in alerta.fechaCreacion && typeof (alerta.fechaCreacion as { toDate?: () => Date }).toDate === "function"
                ? (alerta.fechaCreacion as { toDate: () => Date }).toDate().toLocaleString("es-AR") : null;
              return <li key={alerta.id} className="rounded-xl border border-border-color bg-background-main p-4">
                <span className="text-xs font-heading font-semibold text-brand-secondary">{alerta.tipo ? alerta.tipo.replaceAll("_", " ") : "Aviso"}</span>
                <p className="mt-1 break-words font-semibold">{alerta.mensaje}</p>
                {fecha && <p className="mt-1 text-sm text-text-secondary">{fecha}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {action && <Link href={action.href} className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-heading font-semibold text-white">{action.label}<ArrowRight aria-hidden="true" className="size-4" /></Link>}
                  <button type="button" onClick={() => alerta.id && marcarLeida(alerta.id)} className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color bg-surface px-4 text-sm font-semibold"><CheckCheck aria-hidden="true" className="size-4" />Marcar leída</button>
                </div>
              </li>;
            })}</ul>}
          </>}
        </section>

        <section aria-label="Módulos de administración" data-testid="admin-module-cards" className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MODULE_CARDS.map(({ title, subtitle, description, href, icon: Icon, action, badge }) => <article key={href} className="group flex min-w-0 flex-col justify-between gap-5 rounded-2xl border border-border-color bg-surface p-6 shadow-xs transition-shadow hover:border-brand-primary hover:shadow-md">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10"><Icon aria-hidden="true" className="size-6 text-brand-primary" /></span><span className="rounded-full border border-border-color bg-background-main px-2.5 py-1 text-xs font-semibold text-text-secondary">{badge}</span></div>
              <div><h2 className="break-words font-heading text-lg font-bold text-brand-primary">{title}</h2><p className="mt-1 text-xs font-semibold text-brand-secondary">{subtitle}</p></div>
              <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
            </div>
            <Link href={href} className="admin-control inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-border-color bg-background-main px-4 py-3 font-heading text-sm font-bold text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-primary hover:text-white">{action}<ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link>
          </article>)}
        </section>

        <details className="rounded-2xl border border-border-color bg-surface p-4">
          <summary className="min-h-11 cursor-pointer font-heading text-sm font-semibold text-brand-primary">Otras herramientas</summary>
          <div className="flex flex-wrap gap-3 pt-3">{ADMIN_DESTINATIONS.filter(item => ["settings", "laboratory"].includes(item.id)).map(({ id, label, href }) => <Link key={id} href={href} className="admin-control inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-color px-4 text-sm text-text-secondary">{label}<ArrowRight aria-hidden="true" className="size-4" /></Link>)}</div>
        </details>
      </div>
    </AdminProtectedRoute>
  );
}
