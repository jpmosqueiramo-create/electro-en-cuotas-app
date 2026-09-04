"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogIn, Menu, X, Truck, Tag, Users } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const getLinkStyle = (targetPath: string) => {
    const isActive = pathname === targetPath || (targetPath === "/" && pathname === "/");
    if (isActive) {
      return "text-xs font-heading font-semibold text-white bg-zinc-800/90 border border-zinc-700/80 rounded-lg px-3.5 py-2 flex items-center gap-1.5 transition-all duration-200";
    }
    return "text-xs font-heading font-medium text-zinc-300 hover:text-white transition-colors duration-200 px-3 py-2 flex items-center gap-1.5 hover:bg-zinc-800/40 rounded-lg";
  };

  const getMobileLinkStyle = (targetPath: string) => {
    const isActive = pathname === targetPath || (targetPath === "/" && pathname === "/");
    if (isActive) {
      return "text-base font-heading font-bold text-white bg-zinc-800 px-4 py-3 rounded-xl border border-zinc-700 flex items-center gap-2";
    }
    return "text-base font-heading font-medium text-zinc-300 hover:text-white transition-colors flex items-center gap-2 px-3 py-2";
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#121316]/95 border-b border-zinc-800/80 backdrop-blur-md text-white transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* LOGO OFICIAL */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <img 
            src="/logo-cuenta-hogar-oficial.png" 
            alt="Cuenta Hogar Logo" 
            className="h-12 md:h-14 w-auto object-contain bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-sm hover:border-zinc-700 transition-colors" 
          />
        </Link>

        {/* DESKTOP MENU CON JERARQUÍA TIPOGRÁFICA Y ESPACIADO PROFESIONAL */}
        <div className="hidden lg:flex items-center gap-2">
          <Link href="/#catalogo" className={getLinkStyle("/")}>
            <Tag className="w-3.5 h-3.5 text-[#fe5000]" />
            <span>Planes para vos</span>
          </Link>

          <Link href="/nosotros" className={getLinkStyle("/nosotros")}>
            <span>Nosotros</span>
          </Link>

          <Link href="/flete" className={getLinkStyle("/flete")}>
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Envíos Low Cost</span>
          </Link>

          <Link href="/red-afiliados" className={getLinkStyle("/red-afiliados")}>
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Red de Afiliados</span>
          </Link>

          <div className="pl-3 ml-2 border-l border-zinc-800">
            <Link 
              href="/login" 
              className="flex items-center gap-2 text-xs font-heading font-semibold bg-[#fe5000] hover:bg-[#e04600] text-white px-4 py-2.5 rounded-xl shadow-sm transition-all duration-200"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Portal de Clientes</span>
            </Link>
          </div>
        </div>

        {/* MOBILE HAMBURGER BUTTON */}
        <button 
          className="lg:hidden text-zinc-300 hover:text-white p-2 hover:bg-zinc-800 rounded-xl transition-colors" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Abrir menú"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#181920] border-b border-zinc-800 p-6 flex flex-col gap-3 shadow-2xl text-white">
          <Link href="/#catalogo" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/")}>
            <Tag className="w-4 h-4 text-[#fe5000]" /> Planes para vos
          </Link>
          <Link href="/nosotros" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/nosotros")}>
            Nosotros
          </Link>
          <Link href="/flete" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/flete")}>
            <Truck className="w-4 h-4 text-emerald-400" /> Envíos Low Cost
          </Link>
          <Link href="/red-afiliados" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/red-afiliados")}>
            <Users className="w-4 h-4 text-amber-400" /> Red de Afiliados
          </Link>
          <div className="pt-3 border-t border-zinc-800">
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)} 
              className="flex items-center justify-center gap-2 text-sm font-heading font-semibold bg-[#fe5000] text-white px-5 py-3 rounded-xl shadow-sm"
            >
              <LogIn className="w-4 h-4" /> Portal de Clientes
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
