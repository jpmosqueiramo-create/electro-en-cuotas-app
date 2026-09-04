"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc } from "firebase/firestore";
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
  LogOut,
  ShieldCheck
} from "lucide-react";

export default function AdminPage() {
  const { logout } = useAuth();

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

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] font-sans selection:bg-[#173E3B] selection:text-white p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* HEADER PRINCIPAL - ESTILO INSTITUCIONAL CUENTA HOGAR */}
          <header className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <img 
                src="/logo-cuenta-hogar-oficial.png" 
                alt="Cuenta Hogar Logo" 
                className="h-12 w-auto object-contain bg-[#173E3B] p-1.5 rounded-xl shadow-xs" 
              />
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-heading font-bold uppercase tracking-widest text-[#B44E2A]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#B44E2A]" /> Panel Maestro de Administración
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#173E3B]">
                  Centro de Monitoreo Root
                </h1>
              </div>
            </div>

            <button 
              onClick={() => { import("firebase/auth").then(({getAuth, signOut}) => { signOut(getAuth()); window.location.href="/login"; }); }} 
              className="inline-flex items-center gap-2 text-xs font-heading font-bold text-red-600 bg-[#FFFDFC] border border-[#DED8CF] hover:bg-red-50 px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0"
            >
              <LogOut className="w-4 h-4 text-red-600" />
              Cerrar Sesión Admin
            </button>
          </header>

          {/* ALERTAS Y AVISOS */}
          {alertas.length > 0 && (
            <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-xl font-heading font-bold text-[#173E3B] flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#B44E2A]" /> Alertas y Avisos ({alertas.length})
              </h2>
              <div className="space-y-3">
                {alertas.map(alerta => (
                  <div key={alerta.id} className="bg-[#F7F3EC] border border-[#DED8CF] p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] bg-[#B44E2A]/10 border border-[#B44E2A]/20 text-[#B44E2A] font-heading font-bold px-2.5 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">
                        {alerta.tipo.replace('_', ' ')}
                      </span>
                      <p className="text-sm font-heading font-bold text-[#1F2928]">{alerta.mensaje}</p>
                      {alerta.fechaCreacion && (
                        <p className="text-xs text-[#68706E] font-sans mt-1">
                          {alerta.fechaCreacion.toDate().toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(alerta.tipo === "NUEVO_PRESUPUESTO" || alerta.tipo === "APERTURA_CUENTA") && (
                        <Link 
                          href="/admin/validaciones?tab=aperturas" 
                          className="bg-[#173E3B] hover:bg-[#123230] text-white text-xs font-heading font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                        >
                          📋 Ver Presupuesto
                        </Link>
                      )}
                      <button 
                        onClick={() => marcarLeida(alerta.id)} 
                        className="bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B] text-xs font-heading font-semibold text-[#68706E] px-3.5 py-2 rounded-xl transition-colors shadow-xs whitespace-nowrap"
                      >
                        ✓ Marcar Leída
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GRID DE MÓDULOS DE ADMINISTRACIÓN */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. GESTOR DE VALIDACIONES */}
            <div className="p-6 bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B]/60 rounded-2xl flex flex-col justify-between shadow-xs transition-all">
              <div className="space-y-3 mb-6">
                <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-heading font-bold text-[#173E3B]">Gestor de Validaciones</h2>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Revisá las solicitudes de crédito enviadas por los clientes, validá su ID (DNI / Sueldo) y aprobá o rechazá los pedidos.
                </p>
              </div>
              <Link 
                href="/admin/validaciones" 
                className="btn-primary text-xs uppercase tracking-wider w-full justify-center text-center py-3.5"
              >
                📥 Ver Bandeja de Pendientes
              </Link>
            </div>

            {/* 2. CATÁLOGO DE PRODUCTOS */}
            <div className="p-6 bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B]/60 rounded-2xl flex flex-col justify-between shadow-xs transition-all">
              <div className="space-y-3 mb-6">
                <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                  <Package className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-heading font-bold text-[#173E3B]">Catálogo de Productos</h2>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Agregar, visualizar y administrar el inventario de productos y sus fotografías de portada.
                </p>
              </div>
              <Link 
                href="/admin/productos" 
                className="bg-[#FFFDFC] border border-[#173E3B] text-[#173E3B] hover:bg-[#F7F3EC] font-heading font-bold text-xs uppercase tracking-wider text-center px-4 py-3.5 rounded-xl w-full transition-colors shadow-xs"
              >
                ⚡ Abrir Gestor de Productos
              </Link>
            </div>

            {/* 3. RENDICIONES DE COBRANZA */}
            <div className="p-6 bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B]/60 rounded-2xl flex flex-col justify-between shadow-xs transition-all">
              <div className="space-y-3 mb-6">
                <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#2F7D5C]">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-heading font-bold text-[#173E3B]">Rendiciones de Cobranza</h2>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Auditá las entregas reportadas por los afiliados y confirmá la recepción física del dinero en efectivo o en cuenta antes de considerarlo consolidado.
                </p>
              </div>
              <Link 
                href="/admin/rendiciones" 
                className="bg-[#2F7D5C] hover:bg-[#256449] text-white font-heading font-bold text-xs uppercase tracking-wider text-center px-4 py-3.5 rounded-xl w-full transition-colors shadow-xs"
              >
                💸 Auditar Dinero de Entregas
              </Link>
            </div>

            {/* 4. CARTERA ACTIVA Y COBRANZAS */}
            <div className="p-6 bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#B44E2A]/60 rounded-2xl flex flex-col justify-between shadow-xs transition-all">
              <div className="space-y-3 mb-6">
                <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#B44E2A]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-heading font-bold text-[#173E3B]">Cartera Activa y Cobranzas</h2>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Seguimiento maestro de todas las ventas que están en calle. Auditá las cuotas atrasadas, gestioná cobranzas y registrá promesas de pago con los clientes.
                </p>
              </div>
              <Link 
                href="/admin/cartera" 
                className="btn-lowcost text-xs uppercase tracking-wider w-full justify-center text-center py-3.5"
              >
                📈 Abrir Panel de Cartera
              </Link>
            </div>

            {/* 5. COMISIONES AFILIADOS */}
            <div className="p-6 bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B]/60 rounded-2xl flex flex-col justify-between shadow-xs transition-all">
              <div className="space-y-3 mb-6">
                <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#B44E2A]">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-heading font-bold text-[#173E3B]">Comisiones Afiliados</h2>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Visualizá las comisiones acumuladas por cada vendedor afiliado y registrá el pago (liquidación) de las mismas.
                </p>
              </div>
              <Link 
                href="/admin/comisiones" 
                className="bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B] text-[#173E3B] font-heading font-bold text-xs uppercase tracking-wider text-center px-4 py-3.5 rounded-xl w-full transition-colors shadow-xs"
              >
                💰 Liquidar Comisiones
              </Link>
            </div>

            {/* 6. REGISTRO DE REMITOS */}
            <div className="p-6 bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B]/60 rounded-2xl flex flex-col justify-between shadow-xs transition-all">
              <div className="space-y-3 mb-6">
                <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                  <FileCheck className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-heading font-bold text-[#173E3B]">Registro de Remitos</h2>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Historial maestro de todos los remitos emitidos (Remito Tipo R por Mandato Comercial y Traslados Internos). Consultá, buscá por cliente o re-descargá comprobantes PDF.
                </p>
              </div>
              <Link 
                href="/admin/remitos" 
                className="btn-primary text-xs uppercase tracking-wider w-full justify-center text-center py-3.5"
              >
                📜 Abrir Registro de Remitos
              </Link>
            </div>

            {/* 7. HISTORIAL DE PRESUPUESTOS */}
            <div className="p-6 bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B]/60 rounded-2xl flex flex-col justify-between shadow-xs transition-all">
              <div className="space-y-3 mb-6">
                <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-heading font-bold text-[#173E3B]">Historial de Presupuestos</h2>
                <p className="text-[#68706E] text-xs font-sans leading-relaxed">
                  Registro maestro de todas las cotizaciones confeccionadas (aprobadas, rechazadas, pendientes o eliminadas), ordenadas por fecha.
                </p>
              </div>
              <Link 
                href="/admin/presupuestos" 
                className="bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B] text-[#173E3B] font-heading font-bold text-xs uppercase tracking-wider text-center px-4 py-3.5 rounded-xl w-full transition-colors shadow-xs"
              >
                📄 Ver Historial de Presupuestos
              </Link>
            </div>

            {/* 8. BASE DE DATOS DE CLIENTES */}
            <div className="p-6 bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B]/60 rounded-2xl flex flex-col justify-between shadow-xs transition-all">
              <div className="space-y-3 mb-6">
                <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#173E3B]">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-heading font-bold text-[#173E3B]">Base de Datos de Clientes</h2>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Directorio maestro de perfiles de clientes, DNI, CUIL, teléfonos, direcciones, ocupación e historial de compras.
                </p>
              </div>
              <Link 
                href="/admin/clientes" 
                className="btn-primary text-xs uppercase tracking-wider w-full justify-center text-center py-3.5"
              >
                👥 Ver Base de Datos de Clientes
              </Link>
            </div>

            {/* 9. REPORTES Y PLANILLAS EXCEL */}
            <div className="p-6 bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#2F7D5C]/60 rounded-2xl flex flex-col justify-between shadow-xs transition-all">
              <div className="space-y-3 mb-6">
                <div className="w-10 h-10 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl flex items-center justify-center text-[#2F7D5C]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-heading font-bold text-[#2F7D5C]">Reportes y Planillas Excel</h2>
                <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                  Centro de planillas financieras descargables en Excel y Google Sheets: Cobros de cuotas, Gastos de Fletes y Pago de Comisiones a afiliados.
                </p>
              </div>
              <Link 
                href="/admin/reportes" 
                className="bg-[#2F7D5C] hover:bg-[#256449] text-white font-heading font-bold text-xs uppercase tracking-wider text-center px-4 py-3.5 rounded-xl w-full transition-colors shadow-xs"
              >
                📊 Abrir Reportes y Planillas (Excel)
              </Link>
            </div>

          </div>

        </div>
      </div>
    </AdminProtectedRoute>
  );
}
