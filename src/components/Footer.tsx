"use client";

import Link from "next/link";
import { RotateCcw, MapPin, Building2, FileText, ShieldCheck, Truck, Tag, Users, LogIn } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#235854] bg-[#173E3B] text-[#FFFDFC] py-16 font-sans">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        
        {/* GRID DE 4 COLUMNAS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 border-b border-[#235854] pb-12">
          
          {/* COLUMNA 1: MARCA E IDENTIDAD */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-cuenta-hogar-oficial.png" 
                alt="Cuenta Hogar Logo" 
                className="h-12 w-auto object-contain bg-[#FFFDFC] p-1.5 rounded-xl shadow-md border border-[#DED8CF]" 
              />
            </div>
            
            <div className="space-y-2 text-[#FFFDFC]">
              <p className="font-heading font-extrabold text-white text-base tracking-tight">LOOP GESTIÓN INTEGRAL S.R.L.</p>
              <p className="font-mono text-xs font-bold text-[#E7B86A]">CUIT: 30-71859402-4</p>
              <div className="flex items-start gap-2 pt-2 text-xs text-[#F7F3EC] leading-relaxed">
                <MapPin className="w-4 h-4 text-[#E7B86A] shrink-0 mt-0.5" />
                <span>Caracas 1101, C1416AOS Ciudad Autónoma de Buenos Aires.</span>
              </div>
            </div>
          </div>

          {/* COLUMNA 2: NAVEGACIÓN PRINCIPAL */}
          <div className="space-y-4">
            <h4 className="text-white font-heading font-extrabold text-sm uppercase tracking-wider border-b-2 border-[#E7B86A] pb-2 inline-block">
              Navegación
            </h4>
            <ul className="space-y-3 text-sm font-semibold">
              <li>
                <Link href="/#catalogo" className="text-[#FFFDFC] hover:text-[#E7B86A] transition-colors flex items-center gap-2.5">
                  <Tag className="w-4 h-4 text-[#E7B86A]" /> Planes para vos
                </Link>
              </li>
              <li>
                <Link href="/nosotros" className="text-[#FFFDFC] hover:text-[#E7B86A] transition-colors flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-[#E7B86A]" /> Nosotros
                </Link>
              </li>
              <li>
                <Link href="/flete" className="text-[#FFFDFC] hover:text-[#E7B86A] transition-colors flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#E7B86A]" /> Envíos Low Cost
                </Link>
              </li>
              <li>
                <Link href="/red-afiliados" className="text-[#FFFDFC] hover:text-[#E7B86A] transition-colors flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[#E7B86A]" /> Red de Afiliados
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-[#FFFDFC] hover:text-[#E7B86A] transition-colors flex items-center gap-2.5">
                  <LogIn className="w-4 h-4 text-[#E7B86A]" /> Portal de Clientes
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMNA 3: INFORMACIÓN LEGAL Y CONSUMIDOR */}
          <div className="space-y-4">
            <h4 className="text-white font-heading font-extrabold text-sm uppercase tracking-wider border-b-2 border-[#E7B86A] pb-2 inline-block">
              Legales y Consumidor
            </h4>
            <ul className="space-y-3 text-sm font-semibold">
              <li>
                <Link href="/terms" className="text-[#FFFDFC] hover:text-[#E7B86A] transition-colors flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#E7B86A]" /> Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[#FFFDFC] hover:text-[#E7B86A] transition-colors flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#E7B86A]" /> Política de Privacidad
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#FFFDFC] hover:text-[#E7B86A] transition-colors flex items-center gap-2.5 underline decoration-[#E7B86A]"
                >
                  Defensa del Consumidor
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMNA 4: DERECHO DE ARREPENTIMIENTO */}
          <div className="space-y-4 bg-[#112F2D] p-5 rounded-2xl border border-[#235854] shadow-lg">
            <h4 className="text-white font-heading font-extrabold text-xs uppercase tracking-wider">
              Solicitud de Cancelación
            </h4>
            <p className="text-xs text-[#FFFDFC] leading-relaxed font-sans">
              ¿Querés revocar una solicitud o compra realizada recientemente? Podés ejercer tu derecho legal de arrepentimiento.
            </p>
            <Link 
              href="/arrepentimiento" 
              className="inline-flex items-center justify-center gap-2 bg-[#B44E2A] hover:bg-[#984021] text-white font-heading font-bold text-xs px-4 py-3 rounded-xl transition-all uppercase tracking-wider w-full text-center shadow-md hover:scale-[1.02] active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-white" /> Botón de Arrepentimiento
            </Link>
          </div>

        </div>

        {/* AVISO LEGAL OBLIGATORIO Y COPYRIGHT */}
        <div className="space-y-4 text-center md:text-left pt-2">
          <p className="text-[#E7B86A] text-xs font-heading font-extrabold uppercase tracking-wider">
            Aviso Legal Obligatorio:
          </p>
          <p className="text-[#FFFDFC] leading-relaxed text-xs text-justify md:text-left max-w-5xl">
            LOOP GESTIÓN INTEGRAL S.R.L. opera comercialmente bajo la marca Cuenta Hogar prestando servicios de gestión administrativa, mandato comercial y financiación propia. No realizamos intermediación financiera en los términos de la Ley de Entidades Financieras N° 21.526. En el servicio de Envíos Low Cost actuamos exclusivamente como prestatarios logísticos de traslado de mercadería.
          </p>
          <div className="pt-6 border-t border-[#235854] text-center text-xs text-[#FFFDFC]/80 font-mono">
            © {new Date().getFullYear()} LOOP GESTIÓN INTEGRAL S.R.L. — Todos los derechos reservados.
          </div>
        </div>

      </div>
    </footer>
  );
}
