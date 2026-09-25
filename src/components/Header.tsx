"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, UserCheck } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const getLinkStyle = (targetPath: string) => {
    const isActive = pathname === targetPath || (targetPath === "/" && pathname === "/");
    if (isActive) {
      return "text-xs font-bold text-[#FFD21A] bg-[#1A1D26] border border-[#FFD21A]/30 rounded-xl px-3.5 py-2 flex items-center gap-1.5 transition-all";
    }
    return "text-xs font-bold text-[#9CA3AF] hover:text-[#FFD21A] hover:bg-[#1A1D26]/60 transition-all px-3 py-2 flex items-center gap-1.5 rounded-xl";
  };

  const getMobileLinkStyle = (targetPath: string) => {
    const isActive = pathname === targetPath;
    if (isActive) {
      return "text-sm font-bold text-[#FFD21A] bg-[#1A1D26] px-4 py-3 rounded-xl border border-[#FFD21A]/30 flex items-center gap-2";
    }
    return "text-sm font-bold text-[#D1D5DB] hover:text-[#FFD21A] transition-colors flex items-center gap-2 px-3 py-2";
  };

  return (
    <header className="sticky top-0 z-50 bg-[#111318]/95 backdrop-blur-md border-b border-[#222530] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        
        {/* BRANDING LOGO */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="p-1.5 bg-[#090A0D] border border-[#FFD21A]/40 rounded-xl shadow-md">
            <img 
              src="/logo-cuenta-hogar-oficial.png" 
              alt="Cuenta Hogar" 
              className="h-8 sm:h-10 w-auto object-contain" 
            />
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-[10px] font-mono font-bold tracking-widest text-[#FFD21A] uppercase">
              GESTIÓN DE COMPRAS · LOGÍSTICA
            </span>
            <span className="block text-xs font-bold text-white tracking-tight">
              CUENTA HOGAR
            </span>
          </div>
        </Link>

        {/* MENÚ DE NAVEGACIÓN DESKTOP */}
        <nav className="hidden lg:flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <Link href="/#modelo" className={getLinkStyle("/#modelo")}>Cómo Funciona</Link>
          <Link href="/productos" className={getLinkStyle("/productos")}>Opciones de compra</Link>
          <Link href="/flete" className={getLinkStyle("/flete")}>Envíos Low Cost</Link>
          <Link href="/nosotros" className={getLinkStyle("/nosotros")}>Nosotros</Link>
          <Link href="/red-afiliados" className={getLinkStyle("/red-afiliados")}>Red de Afiliados</Link>
        </nav>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2.5">
          <Link 
            href="/login-afiliado" 
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#E5E7EB] hover:text-[#FFD21A] border border-[#2D323E] hover:border-[#FFD21A]/50 px-3.5 py-2 rounded-xl transition-all"
          >
            <UserCheck className="w-4 h-4 text-[#FFD21A]" />
            <span>Afiliados</span>
          </Link>

          <Link 
            href="/#contacto" 
            className="inline-flex items-center gap-1.5 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] text-xs font-extrabold uppercase tracking-wider px-3.5 sm:px-5 py-2.5 rounded-xl transition-all shadow-md shadow-[#FFD21A]/20 transform active:scale-95"
          >
            <span>Solicitar Compra</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {/* MOBILE HAMBURGER BUTTON */}
          <button 
            className="lg:hidden text-[#9CA3AF] hover:text-white p-2 hover:bg-[#1A1D26] rounded-xl transition-colors" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#161922] border-b border-[#222530] p-6 flex flex-col gap-3 shadow-2xl text-white">
          <Link href="/#modelo" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/#modelo")}>
            Cómo Funciona
          </Link>
          <Link href="/productos" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/productos")}>
            Productos
          </Link>
          <Link href="/flete" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/flete")}>
            Envíos Low Cost CABA
          </Link>
          <Link href="/nosotros" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/nosotros")}>
            Nosotros
          </Link>
          <Link href="/red-afiliados" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/red-afiliados")}>
            Red de Afiliados
          </Link>

          <div className="pt-3 border-t border-[#222530] flex flex-col gap-2.5">
            <Link 
              href="/login-afiliado" 
              onClick={() => setMobileMenuOpen(false)} 
              className="flex items-center justify-center gap-2 text-xs font-bold text-[#E5E7EB] border border-[#2D323E] px-4 py-3 rounded-xl"
            >
              <UserCheck className="w-4 h-4 text-[#FFD21A]" />
              <span>Acceso Red de Afiliados</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
