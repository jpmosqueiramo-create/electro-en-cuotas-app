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
      return "text-xs font-heading font-bold text-[#173E3B] bg-[#F7F3EC] border border-[#DED8CF] rounded-lg px-3.5 py-2 flex items-center gap-1.5 transition-all duration-180";
    }
    return "text-xs font-heading font-semibold text-[#173E3B] hover:text-[#112F2D] hover:bg-[#F7F3EC]/80 transition-colors duration-180 px-3 py-2 flex items-center gap-1.5 rounded-lg";
  };

  const getMobileLinkStyle = (targetPath: string) => {
    const isActive = pathname === targetPath || (targetPath === "/" && pathname === "/");
    if (isActive) {
      return "text-base font-heading font-bold text-[#173E3B] bg-[#F7F3EC] px-4 py-3 rounded-xl border border-[#DED8CF] flex items-center gap-2";
    }
    return "text-base font-heading font-semibold text-[#173E3B] hover:text-[#112F2D] transition-colors flex items-center gap-2 px-3 py-2";
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#FFFDFC]/95 border-b border-[#DED8CF] backdrop-blur-md text-[#173E3B] transition-all shadow-xs">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* LOGO OFICIAL */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <img 
            src="/logo-cuenta-hogar-oficial.png" 
            alt="Cuenta Hogar Logo" 
            className="h-12 md:h-14 w-auto object-contain bg-[#173E3B] p-1.5 rounded-xl shadow-xs" 
          />
        </Link>

        {/* DESKTOP MENU CON PALETA INSTITUCIONAL */}
        <div className="hidden lg:flex items-center gap-2">
          <Link href="/#catalogo" className={getLinkStyle("/")}>
            <Tag className="w-3.5 h-3.5 text-[#B44E2A]" />
            <span>Planes para vos</span>
          </Link>

          <Link href="/nosotros" className={getLinkStyle("/nosotros")}>
            <span>Nosotros</span>
          </Link>

          <Link href="/flete" className={getLinkStyle("/flete")}>
            <Truck className="w-3.5 h-3.5 text-[#B44E2A]" />
            <span>Envíos Low Cost</span>
          </Link>

          <Link href="/red-afiliados" className={getLinkStyle("/red-afiliados")}>
            <Users className="w-3.5 h-3.5 text-[#173E3B]" />
            <span>Red de Afiliados</span>
          </Link>

          <div className="pl-3 ml-2 border-l border-[#DED8CF]">
            <Link 
              href="/login" 
              className="flex items-center gap-2 text-xs font-heading font-semibold bg-[#173E3B] hover:bg-[#112F2D] text-white px-4 py-2.5 rounded-xl shadow-xs transition-all duration-180"
            >
              <LogIn className="w-3.5 h-3.5 text-[#E7B86A]" />
              <span>Portal de Clientes</span>
            </Link>
          </div>
        </div>

        {/* MOBILE HAMBURGER BUTTON */}
        <button 
          className="lg:hidden text-[#173E3B] hover:text-[#112F2D] p-2 hover:bg-[#F7F3EC] rounded-xl transition-colors" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Abrir menú"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FFFDFC] border-b border-[#DED8CF] p-6 flex flex-col gap-3 shadow-xl text-[#173E3B]">
          <Link href="/#catalogo" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/")}>
            <Tag className="w-4 h-4 text-[#B44E2A]" /> Planes para vos
          </Link>
          <Link href="/nosotros" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/nosotros")}>
            Nosotros
          </Link>
          <Link href="/flete" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/flete")}>
            <Truck className="w-4 h-4 text-[#B44E2A]" /> Envíos Low Cost
          </Link>
          <Link href="/red-afiliados" onClick={() => setMobileMenuOpen(false)} className={getMobileLinkStyle("/red-afiliados")}>
            <Users className="w-4 h-4 text-[#173E3B]" /> Red de Afiliados
          </Link>
          <div className="pt-3 border-t border-[#DED8CF]">
            <Link 
              href="/login" 
              onClick={() => setMobileMenuOpen(false)} 
              className="flex items-center justify-center gap-2 text-sm font-heading font-semibold bg-[#173E3B] text-white px-5 py-3 rounded-xl shadow-xs"
            >
              <LogIn className="w-4 h-4 text-[#E7B86A]" /> Portal de Clientes
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
