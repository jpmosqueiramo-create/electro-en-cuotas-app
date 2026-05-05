"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState, useEffect } from "react";

export default function AdminPage() {
  const { logout } = useAuth();

  const [alertas, setAlertas] = useState<any[]>([]);

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const q = query(collection(db, "alertas_admin"), where("leida", "==", false));
        const snap = await getDocs(q);
        const data: any[] = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        setAlertas(data.sort((a,b) => b.fechaCreacion?.toMillis() - a.fechaCreacion?.toMillis()));
      } catch (e) {}
    };
    fetchAlertas();
  }, []);

  const marcarLeida = async (id: string) => {
    try {
      await updateDoc(doc(db, "alertas_admin", id), { leida: true });
      setAlertas(alertas.filter(a => a.id !== id));
    } catch(e){}
  };

  
  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#FAFAFA] text-yellow-500 p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12 border-b border-yellow-500/30 pb-4">
          <div className="flex items-center gap-4">
  <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Cuenta Hogar Logo" className="h-12 w-auto object-contain" />
  <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">Centro de Monitoreo Root</h1>
</div>
          <button onClick={() => { import("firebase/auth").then(({getAuth, signOut}) => { signOut(getAuth()); window.location.href="/login"; }); }} className="text-sm border border-red-500/50 text-red-500 hover:bg-red-900/50 px-4 py-2 rounded transition-colors font-bold">Cerrar Sesión Admin</button>
        </header>

          
          {alertas.length > 0 && (
            <div className="mb-8 bg-white border border-yellow-500/30 rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">🔔 Alertas y Avisos ({alertas.length})</h2>
              <div className="space-y-3">
                {alertas.map(alerta => (
                  <div key={alerta.id} className="bg-yellow-50 border border-yellow-500/20 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-600 font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1 inline-block">{alerta.tipo.replace('_', ' ')}</span>
                      <p className="text-sm font-bold text-zinc-900">{alerta.mensaje}</p>
                      {alerta.fechaCreacion && <p className="text-xs text-gray-500 mt-1">{alerta.fechaCreacion.toDate().toLocaleString()}</p>}
                    </div>
                    <button onClick={() => marcarLeida(alerta.id)} className="bg-white border border-gray-200 hover:border-gray-300 text-xs font-bold text-gray-600 px-3 py-1.5 rounded transition-colors shadow-sm whitespace-nowrap">
                      ✓ Marcar Leída
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-6 bg-[#FAFAFA] border border-yellow-500/20 rounded-lg flex flex-col">
              <h2 className="text-2xl mb-4 font-semibold text-zinc-900">Gestor de Validaciones</h2>
              <p className="text-yellow-200/60 mb-6">Revisa las solicitudes de crédito enviadas por los clientes, valida su ID (DNI / Sueldo) y aprueba o rechaza los pedidos.</p>
              <Link href="/admin/validaciones" className="mt-auto bg-blue-500 text-zinc-900 font-bold border border-blue-400 hover:bg-blue-400 text-center px-4 py-3 rounded w-full transition-colors shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                📥 Ver Bandeja de Pendientes
              </Link>
            </div>

            <div className="p-6 bg-[#FAFAFA] border border-yellow-500/20 rounded-lg flex flex-col">
              <h2 className="text-2xl mb-4 font-semibold text-zinc-900">Catálogo de Productos</h2>
              <p className="text-yellow-200/60 mb-6">Agregar, visualizar y eliminar el inventario de electrodomésticos y sus fotografías de portada.</p>
              <Link href="/admin/productos" className="mt-auto bg-yellow-500 text-black font-bold text-center px-4 py-3 rounded w-full transition-colors hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                ⚡ Abrir Gestor de Productos
              </Link>
            </div>

            <div className="p-6 bg-[#FAFAFA] border border-yellow-500/20 rounded-lg flex flex-col">
              <h2 className="text-2xl mb-4 font-semibold text-zinc-900">Rendiciones de Cobranza</h2>
              <p className="text-yellow-200/60 mb-6">Audita las entregas reportadas por los afiliados y confirma la recepción física del dinero en efectivo o en cuenta antes de considerarlo consolidado.</p>
              <Link href="/admin/rendiciones" className="mt-auto bg-green-600 text-white font-bold text-center px-4 py-3 rounded w-full transition-colors hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                💸 Auditar Dinero de Entregas
              </Link>
            </div>

            <div className="p-6 bg-[#FAFAFA] border border-yellow-500/20 rounded-lg flex flex-col">
              <h2 className="text-2xl mb-4 font-semibold text-zinc-900">Cartera Activa y Cobranzas</h2>
              <p className="text-yellow-200/60 mb-6">Seguimiento maestro de todas las ventas que están en calle. Audita las cuotas atrasadas, gestiona cobranzas y registra promesas de pago con los clientes.</p>
              <Link href="/admin/cartera" className="mt-auto bg-purple-600 text-zinc-900 font-bold text-center px-4 py-3 rounded w-full transition-colors hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                📈 Abrir Panel de Cartera
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
