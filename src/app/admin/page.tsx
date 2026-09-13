"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { AdminNav } from "@/components/AdminNav";
import Link from "next/link";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { 
  Bell, 
  FileText, 
  Package, 
  DollarSign, 
  TrendingUp, 
  Users, 
  FileCheck, 
  FileSpreadsheet, 
  UserCheck, 
  ShieldCheck,
  ArrowRight
} from "lucide-react";

export default function AdminPage() {
  const [alertas, setAlertas] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "alertas_admin"), where("leida", "==", false));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data: any[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setAlertas(data.sort((a, b) => (b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : 0) - (a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : 0)));
    }, (error) => {
      console.error("Error listening to admin alerts:", error);
    });
    return () => unsubscribe();
  }, []);

  const marcarLeida = async (id: string) => {
    try {
      await updateDoc(doc(db, "alertas_admin", id), { leida: true });
      setAlertas(alertas.filter(a => a.id !== id));
    } catch(e){}
  };

  const MODULE_CARDS = [
    {
      title: "Gestor de Validaciones",
      subtitle: "Aprobación y firma digital de créditos",
      desc: "Revisá las solicitudes de crédito enviadas por clientes, validá DNI/recibos de sueldo y gestioná contratos.",
      href: "/admin/validaciones",
      btnText: "📥 Ver Bandeja de Pendientes",
      icon: ShieldCheck,
      color: "#173E3B",
      bgIcon: "bg-[#173E3B]/10",
      badge: "Principal"
    },
    {
      title: "Catálogo de Productos",
      subtitle: "Inventario, precios y fotografías",
      desc: "Gestioná el inventario completo, costos de proveedor, precios de venta en cuotas y portadas visuales.",
      href: "/admin/productos",
      btnText: "⚡ Abrir Gestor de Productos",
      icon: Package,
      color: "#173E3B",
      bgIcon: "bg-[#173E3B]/10",
      badge: "Inventario"
    },
    {
      title: "Cartera Activa y Cobranzas",
      subtitle: "Seguimiento maestro de créditos en calle",
      desc: "Auditá cuotas atrasadas, registrá cobranzas con recibos oficiales PDF y promesas de pago.",
      href: "/admin/cartera",
      btnText: "📈 Panel de Cartera",
      icon: TrendingUp,
      color: "#B44E2A",
      bgIcon: "bg-[#B44E2A]/10",
      badge: "Finanzas"
    },
    {
      title: "Rendiciones de Cobranza",
      subtitle: "Auditoría física de efectivo de entregas",
      desc: "Auditá las entregas reportadas por vendedores afiliados y confirmá la recepción de dinero antes de consolidar.",
      href: "/admin/rendiciones",
      btnText: "💸 Auditar Dinero de Entregas",
      icon: DollarSign,
      color: "#2F7D5C",
      bgIcon: "bg-[#2F7D5C]/10",
      badge: "Caja"
    },
    {
      title: "Comisiones Afiliados",
      subtitle: "Liquidación y pagos a la red de ventas",
      desc: "Visualizá comisiones acumuladas por cada vendedor afiliado y emití comprobantes de liquidación.",
      href: "/admin/comisiones",
      btnText: "💰 Liquidar Comisiones",
      icon: UserCheck,
      color: "#B44E2A",
      bgIcon: "bg-[#B44E2A]/10",
      badge: "Red Ventas"
    },
    {
      title: "Registro de Remitos",
      subtitle: "Historial maestro de Remitos Tipo R",
      desc: "Consultá el historial de remitos por Mandato Comercial y Traslados Internos con re-descarga de PDF.",
      href: "/admin/remitos",
      btnText: "📜 Ver Registro de Remitos",
      icon: FileCheck,
      color: "#173E3B",
      bgIcon: "bg-[#173E3B]/10",
      badge: "Logística"
    },
    {
      title: "Historial de Presupuestos",
      subtitle: "Registro de cotizaciones confeccionadas",
      desc: "Consultá el historial de presupuestos armados por la fuerza de venta (aprobados, pendientes o eliminados).",
      href: "/admin/presupuestos",
      btnText: "📄 Historial de Presupuestos",
      icon: FileText,
      color: "#173E3B",
      bgIcon: "bg-[#173E3B]/10",
      badge: "Cotizaciones"
    },
    {
      title: "Base de Datos de Clientes",
      subtitle: "Directorio maestro de titulares",
      desc: "Perfiles de clientes, DNI, CUIL, números de contacto, domicilios e historial crediticio.",
      href: "/admin/clientes",
      btnText: "👥 Base de Datos Clientes",
      icon: Users,
      color: "#173E3B",
      bgIcon: "bg-[#173E3B]/10",
      badge: "Directorio"
    },
    {
      title: "Reportes y Planillas Excel",
      subtitle: "Exportación de planillas financieras",
      desc: "Descargá reportes consolidados en Excel y CSV: Cobros de cuotas, Fletes y Liquidaciones de comisiones.",
      href: "/admin/reportes",
      btnText: "📊 Abrir Reportes Excel",
      icon: FileSpreadsheet,
      color: "#2F7D5C",
      bgIcon: "bg-[#2F7D5C]/10",
      badge: "Planillas"
    }
  ];

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] font-sans selection:bg-[#173E3B] selection:text-white p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* HEADER NAVEGADOR REUTILIZABLE */}
          <AdminNav 
            title="Centro de Monitoreo Root" 
            subtitle="Tablero maestro de operaciones, crédito, cartera y reportes corporativos de Cuenta Hogar" 
          />

          {/* ALERTAS Y AVISOS DE ACCION REQUERIDA */}
          {alertas.length > 0 && (
            <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-heading font-bold text-[#173E3B] flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#B44E2A] animate-bounce" /> 
                Alertas Operativas ({alertas.length})
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {alertas.map(alerta => (
                  <div key={alerta.id} className="bg-[#F7F3EC] border border-[#DED8CF] p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] bg-[#B44E2A]/10 border border-[#B44E2A]/20 text-[#B44E2A] font-heading font-bold px-2.5 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">
                        {alerta.tipo ? alerta.tipo.replace('_', ' ') : 'ALERTA'}
                      </span>
                      <p className="text-sm font-heading font-bold text-[#1F2928]">{alerta.mensaje}</p>
                      {alerta.fechaCreacion && (
                        <p className="text-xs text-[#68706E] font-sans mt-1">
                          {alerta.fechaCreacion.toDate ? alerta.fechaCreacion.toDate().toLocaleString() : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(alerta.tipo === "NUEVO_PRESUPUESTO" || alerta.tipo === "APERTURA_CUENTA") && (
                        <Link 
                          href="/admin/validaciones?tab=aperturas" 
                          className="bg-[#173E3B] hover:bg-[#123230] text-white text-xs font-heading font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                        >
                          📋 Atender Solicitud
                        </Link>
                      )}
                      <button 
                        onClick={() => marcarLeida(alerta.id)} 
                        className="bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B] text-xs font-heading font-semibold text-[#68706E] px-3.5 py-2 rounded-xl transition-colors shadow-xs whitespace-nowrap cursor-pointer"
                      >
                        ✓ Marcar Leída
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GRID DE MODULOS DE ADMINISTRACION CON DISENO UNIFICADO */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULE_CARDS.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div 
                  key={idx} 
                  className="group bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B] rounded-2xl p-6 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-11 h-11 ${card.bgIcon} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-6 h-6" style={{ color: card.color }} />
                      </div>
                      <span className="text-[10px] font-heading font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#F7F3EC] border border-[#DED8CF] text-[#68706E]">
                        {card.badge}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-heading font-bold text-[#173E3B] group-hover:text-[#B44E2A] transition-colors">
                        {card.title}
                      </h2>
                      <p className="text-[11px] font-heading font-semibold text-[#B44E2A]">
                        {card.subtitle}
                      </p>
                    </div>

                    <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  <Link 
                    href={card.href} 
                    className="inline-flex items-center justify-between w-full px-4 py-3 bg-[#F7F3EC] hover:bg-[#173E3B] text-[#173E3B] hover:text-white border border-[#DED8CF] hover:border-[#173E3B] rounded-xl text-xs font-heading font-bold transition-all shadow-2xs group/btn"
                  >
                    <span>{card.btnText}</span>
                    <ArrowRight className="w-4 h-4 text-[#B44E2A] group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
                  </Link>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </AdminProtectedRoute>
  );
}
