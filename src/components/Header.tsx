"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogIn, Menu, X } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const getLinkStyle = (targetPath: string) => {
    const isActive = pathname === targetPath || (targetPath === "/" && (pathname === "/" || pathname === "/#catalogo"));
    if (isActive) {
      return "text-sm font-black text-zinc-900 bg-white shadow-xl shadow-orange-950/30 -translate-y-0.5 border border-white/80 rounded-xl px-4 py-2 flex items-center gap-1.5 transition-all duration-300 scale-105";
    }
    return "text-sm font-bold text-white/90 hover:text-white transition-all duration-300 px-3.5 py-2 hover:bg-white/15 hover:-translate-y-0.5 rounded-xl flex items-center gap-1.5";
  };

  const getMobileLinkStyle = (targetPath: string) => {
    const isActive = pathname === targetPath || (targetPath === "/" && (pathname === "/" || pathname === "/#catalogo"));
    if (isActive) {
      return "text-lg font-black text-zinc-900 bg-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-white/80";
    }
    return "text-lg font-bold text-white hover:text-amber-200 transition-colors flex items-center gap-2 px-2 py-1";
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#ff5e14] via-[#fe5000] to-[#e04600] border-b border-orange-600/40 shadow-xl text-white backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* LOGO OFICIAL */}
        <Link href="/" className="flex items-center gap-3">
          <img 
            src="/logo-cuenta-hogar-oficial.png" 
            alt="Cuenta Hogar Logo" 
            className="h-14 md:h-16 w-auto object-contain bg-slate-950 p-1.5 rounded-xl border border-zinc-800 shadow-md hover:scale-105 transition-transform" 
          />
        </Link>

        {/* DESKTOP MENU CON BOTÓN FLOTANTE DESTACADO PARA LA PÁGINA ACTIVA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/#catalogo" className={getLinkStyle("/")}>
            Planes para vos
          </Link>
          <Link href="/nosotros" className={getLinkStyle("/nosotros")}>
            Nosotros
          </Link>
          <Link href="/flete" className={getLinkStyle("/flete")}>
            🚚 Envíos Low Cost
          </Link>
          <Link href="/red-afiliados" className={getLinkStyle("/red-afiliados")}>
            Red de Afiliados
          </Link>
          <Link href="/login" className="flex items-center gap-2 text-sm font-black bg-slate-950 text-white border border-zinc-800 px-5 py-2.5 rounded-full hover:bg-zinc-900 shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-300">
            <LogIn className="w-4 h-4 text-[#fe5000]" />
            <span>Portal de Clientes</span>
          </Link>
        </div>

        {/* MOBILE HAMBURGER BUTTON */}
        <button 
          className="lg:hidden text-white p-2 hover:bg-white/10 rounded-xl transition-colors" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Abrir menú"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-20 left-0 w-full bg-[#e04600] border-b border-orange-700/60 p-6 flex flex-col gap-4 shadow-2xl text-white z-50">
          <Link href="/#catalogo" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/")}>
            Planes para vos
          </Link>
          <Link href="/nosotros" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/nosotros")}>
            Nosotros
          </Link>
          <Link href="/flete" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/flete")}>
            🚚 Envíos Low Cost
          </Link>
          <Link href="/red-afiliados" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/red-afiliados")}>
            Red de Afiliados
          </Link>
          <div className="pt-4 border-t border-orange-700/60">
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 text-lg font-black bg-slate-950 text-white border border-zinc-800 px-5 py-3 rounded-xl hover:bg-zinc-900 shadow-lg">
              <LogIn className="w-5 h-5 text-[#fe5000]" /> Portal de Clientes
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
