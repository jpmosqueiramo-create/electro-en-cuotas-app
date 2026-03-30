"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { useAuth } from "@/components/AuthProvider";

export default function AdminPage() {
  const { logout } = useAuth();
  
  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-black text-yellow-500 p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-12 border-b border-yellow-500/30 pb-4">
            <h1 className="text-3xl font-bold text-yellow-400">Panel de Super Administrador</h1>
            <button 
              onClick={logout}
              className="text-sm border border-yellow-500/50 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded transition-colors"
            >
              Cerrar Sesión
            </button>
          </header>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="p-6 bg-zinc-900 border border-yellow-500/20 rounded-lg">
              <h2 className="text-2xl mb-4 font-semibold">Validación de Pagos</h2>
              <p className="text-yellow-200/60 mb-4">Revisa y confirma los comprobantes de pago subidos por los clientes.</p>
              <button className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded w-full transition-colors">
                Ver Pendientes
              </button>
            </div>

            <div className="p-6 bg-zinc-900 border border-yellow-500/20 rounded-lg">
              <h2 className="text-2xl mb-4 font-semibold">Gestión Total (CRUD)</h2>
              <p className="text-yellow-200/60 mb-4">Editar, crear y eliminar productos, usuarios, comprobantes y configuraciones.</p>
              <button className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded w-full transition-colors">
                Abrir Administrador de Datos
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
