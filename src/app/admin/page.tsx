"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { AdminNav } from "@/components/AdminNav";
import Link from "next/link";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { resolveAlertAction, AlertaAdminItem } from "@/lib/budgetAlertRouting";
import { useState, useEffect } from "react";
import { Bell, ArrowRight, ClipboardList, Files, FileText, Wallet, Truck, CalendarDays, CheckCheck } from "lucide-react";
import { adminPaths } from "@/lib/adminCanonicalNavigation";
import { ADMIN_DESTINATIONS } from "@/components/admin/navigation";

const OPERATIONS = [
  { title: "Solicitudes", description: "Revisar la bandeja de solicitudes y los datos de cada operación.", href: adminPaths.requests, icon: ClipboardList, action: "Revisar bandeja" },
  { title: "Información y documentación", description: "Consultar archivos y continuar la revisión desde la ficha de operación.", href: adminPaths.documents, icon: Files, action: "Revisar documentación" },
  { title: "Presupuestos", description: "Continuar un presupuesto o consultar las propuestas preparadas.", href: "/admin/presupuestos", icon: FileText, action: "Abrir presupuestos" },
  { title: "Pagos y cobranzas", description: "Consultar cuotas, comprobantes y gestiones de cobranza.", href: adminPaths.collections, icon: Wallet, action: "Abrir cobranzas" },
  { title: "Logística y entregas", description: "Consultar proveedor, custodia y entrega desde la ficha de operación.", href: adminPaths.logistics, icon: Truck, action: "Revisar entregas" },
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
        <AdminNav title="Hoy" subtitle="¿Qué necesitás resolver ahora?" />

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

        <section aria-labelledby="operations-title">
          <h2 id="operations-title" className="mb-4 font-heading text-lg font-bold text-brand-primary">Acciones operativas</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {OPERATIONS.map(({ title, description, href, icon: Icon, action }) => <article key={title} className="flex flex-col rounded-2xl border border-border-color bg-surface p-4">
              <Icon aria-hidden="true" className="mb-3 size-6 text-brand-secondary" />
              <h3 className="font-heading text-base font-bold text-brand-primary">{title}</h3>
              <p className="mb-3 mt-1.5 flex-1 text-sm text-text-secondary">{description}</p>
              <Link href={href} className="admin-control flex min-h-11 items-center justify-between gap-2 rounded-xl bg-background-main px-3 text-sm font-heading font-semibold text-brand-primary">{action}<ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link>
            </article>)}
          </div>
        </section>

        <section aria-labelledby="agenda-title" className="rounded-2xl border border-border-color bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-3"><CalendarDays aria-hidden="true" className="size-5 text-brand-secondary" /><h2 id="agenda-title" className="font-heading text-lg font-bold text-brand-primary">Agenda y seguimiento</h2></div>
          <p className="mt-2 text-sm text-text-secondary">Consultá promesas y vencimientos en Cobranzas, y los fondos pendientes de rendición en su módulo.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={adminPaths.collections} className="admin-control inline-flex min-h-11 items-center rounded-xl border border-border-color px-4 text-sm font-semibold">Promesas y vencimientos</Link>
            <Link href="/admin/rendiciones" className="admin-control inline-flex min-h-11 items-center rounded-xl border border-border-color px-4 text-sm font-semibold">Revisar rendiciones</Link>
          </div>
        </section>

        <section aria-labelledby="secondary-title">
          <h2 id="secondary-title" className="text-sm font-heading font-semibold text-text-secondary">Otras herramientas</h2>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {ADMIN_DESTINATIONS.filter(item => ["sellers", "catalog", "reports", "settings"].includes(item.id)).map(({ id, label, href }) => <Link key={id} href={href} className="admin-control inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-text-secondary underline decoration-border-color underline-offset-4 hover:text-brand-primary hover:decoration-current">{label}<ArrowRight aria-hidden="true" className="size-4" /></Link>)}
          </div>
        </section>
      </div>
    </AdminProtectedRoute>
  );
}
