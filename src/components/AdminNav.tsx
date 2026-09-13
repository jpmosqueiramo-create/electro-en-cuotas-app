"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShieldCheck, 
  Package, 
  DollarSign, 
  TrendingUp, 
  UserCheck, 
  FileCheck, 
  FileText, 
  Users, 
  FileSpreadsheet, 
  Home, 
  LogOut
} from "lucide-react";

interface AdminNavProps {
  title?: string;
  subtitle?: string;
}

const ADMIN_MODULES = [
  { name: "Inicio", href: "/admin", icon: Home },
  { name: "Validaciones", href: "/admin/validaciones", icon: ShieldCheck },
  { name: "Productos", href: "/admin/productos", icon: Package },
  { name: "Cartera Activa", href: "/admin/cartera", icon: TrendingUp },
  { name: "Rendiciones", href: "/admin/rendiciones", icon: DollarSign },
  { name: "Comisiones", href: "/admin/comisiones", icon: UserCheck },
  { name: "Remitos", href: "/admin/remitos", icon: FileCheck },
  { name: "Presupuestos", href: "/admin/presupuestos", icon: FileText },
  { name: "Clientes", href: "/admin/clientes", icon: Users },
  { name: "Reportes Excel", href: "/admin/reportes", icon: FileSpreadsheet },
];

export function AdminNav({ title, subtitle }: AdminNavProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    import("firebase/auth").then(({ getAuth, signOut }) => {
      signOut(getAuth());
      window.location.href = "/login";
    });
  };

  return (
    <header className="space-y-4">
      {/* BARRA SUPERIOR INSTITUCIONAL */}
      <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* LOGO & TITULO DE SECCION */}
        <div className="flex items-center gap-3.5">
          <Link href="/admin" className="shrink-0 group">
            <img 
              src="/logo-cuenta-hogar-oficial.png" 
              alt="Cuenta Hogar Logo" 
              className="h-11 w-auto object-contain bg-[#173E3B] p-1.5 rounded-xl shadow-xs group-hover:opacity-95 transition-opacity" 
            />
          </Link>
          <div className="h-9 w-px bg-[#DED8CF] hidden sm:block" />
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-heading font-bold uppercase tracking-widest text-[#B44E2A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#B44E2A]" /> Centro de Monitoreo Root
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-[#173E3B] leading-tight">
              {title || "Panel Maestro de Administración"}
            </h1>
            {subtitle && (
              <p className="text-xs text-[#68706E] font-sans mt-0.5 hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* ACCIONES Y BOTON SALIR */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-[#DED8CF]">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F7F3EC] border border-[#DED8CF] rounded-xl text-xs font-heading font-bold text-[#173E3B]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Sesión Activa:</span> Admin
          </div>

          <button 
            onClick={handleLogout} 
            className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-red-600 bg-[#FFFDFC] border border-[#DED8CF] hover:bg-red-50 px-3.5 py-2 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            title="Cerrar Sesión Administrador"
          >
            <LogOut className="w-4 h-4 text-red-600" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* BARRA DE NAVEGACION HORIZONTAL (SOLAPAS TABS) */}
      <nav className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-1.5 shadow-xs overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {ADMIN_MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = pathname === mod.href;

            return (
              <Link
                key={mod.href}
                href={mod.href}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-heading font-bold transition-all shadow-2xs whitespace-nowrap ${
                  isActive
                    ? "bg-[#173E3B] text-white shadow-xs"
                    : "text-[#1F2928] hover:bg-[#F7F3EC] hover:text-[#173E3B]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#B44E2A]"}`} />
                <span>{mod.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
