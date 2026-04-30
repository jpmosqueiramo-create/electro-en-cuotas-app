"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function AdminPage() {
  const { logout } = useAuth();
  
  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-black text-yellow-500 p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-12 border-b border-yellow-500/30 pb-4">
          <div className="flex items-center gap-4">
  <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Cuenta Hogar Logo" className="h-12 w-auto object-contain" />
  <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600">Centro de Monitoreo Root</h1>
</div>
          <button onClick={() => { import("firebase/auth").then(({getAuth, signOut}) => { signOut(getAuth()); window.location.href="/login"; }); }} className="text-sm border border-red-500/50 text-red-500 hover:bg-red-900/50 px-4 py-2 rounded transition-colors font-bold">Cerrar Sesión Admin</button>
        </header>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-6 bg-zinc-900 border border-yellow-500/20 rounded-lg flex flex-col">
              <h2 className="text-2xl mb-4 font-semibold text-white">Gestor de Validaciones</h2>
              <p className="text-yellow-200/60 mb-6">Revisa las solicitudes de crédito enviadas por los clientes, valida su ID (DNI / Sueldo) y aprueba o rechaza los pedidos.</p>
              <Link href="/admin/validaciones" className="mt-auto bg-blue-500 text-white font-bold border border-blue-400 hover:bg-blue-400 text-center px-4 py-3 rounded w-full transition-colors shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                📥 Ver Bandeja de Pendientes
              </Link>
            </div>

            <div className="p-6 bg-zinc-900 border border-yellow-500/20 rounded-lg flex flex-col">
              <h2 className="text-2xl mb-4 font-semibold text-white">Catálogo de Productos</h2>
              <p className="text-yellow-200/60 mb-6">Agregar, visualizar y eliminar el inventario de electrodomésticos y sus fotografías de portada.</p>
              <Link href="/admin/productos" className="mt-auto bg-yellow-500 text-black font-bold text-center px-4 py-3 rounded w-full transition-colors hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                ⚡ Abrir Gestor de Productos
              </Link>
            </div>

            <div className="p-6 bg-zinc-900 border border-yellow-500/20 rounded-lg flex flex-col">
              <h2 className="text-2xl mb-4 font-semibold text-white">Rendiciones de Cobranza</h2>
              <p className="text-yellow-200/60 mb-6">Audita las entregas reportadas por los afiliados y confirma la recepción física del dinero en efectivo o en cuenta antes de considerarlo consolidado.</p>
              <Link href="/admin/rendiciones" className="mt-auto bg-green-600 text-white font-bold text-center px-4 py-3 rounded w-full transition-colors hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                💸 Auditar Dinero de Entregas
              </Link>
            </div>

            <div className="p-6 bg-zinc-900 border border-yellow-500/20 rounded-lg flex flex-col">
              <h2 className="text-2xl mb-4 font-semibold text-white">Cartera Activa y Cobranzas</h2>
              <p className="text-yellow-200/60 mb-6">Seguimiento maestro de todas las ventas que están en calle. Audita las cuotas atrasadas, gestiona cobranzas y registra promesas de pago con los clientes.</p>
              <Link href="/admin/cartera" className="mt-auto bg-purple-600 text-white font-bold text-center px-4 py-3 rounded w-full transition-colors hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                📈 Abrir Panel de Cartera
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
