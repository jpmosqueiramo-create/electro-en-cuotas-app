"use client";

import Link from "next/link";
import { RotateCcw, MapPin, Building2, FileText, ShieldCheck, Truck, Tag, Users, LogIn } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-[#123230] bg-[#173E3B] text-[#F7F3EC]/90 text-xs py-16 font-sans">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        
        {/* GRID DE 4 COLUMNAS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 border-b border-[#123230] pb-12">
          
          {/* COLUMNA 1: MARCA E IDENTIDAD */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-cuenta-hogar-oficial.png" 
                alt="Cuenta Hogar Logo" 
                className="h-12 w-auto object-contain bg-[#FFFDFC] p-1 rounded-xl shadow-xs" 
              />
            </div>
            
            <div className="space-y-1 text-[#F7F3EC]/80">
              <p className="font-heading font-bold text-white text-sm">LOOP GESTIÓN INTEGRAL S.R.L.</p>
              <p className="font-mono text-[11px] text-[#E7B86A]">CUIT: 30-71859402-4</p>
              <div className="flex items-start gap-1.5 pt-2 text-[#F7F3EC]/90">
                <MapPin className="w-3.5 h-3.5 text-[#E7B86A] shrink-0 mt-0.5" />
                <span>Caracas 1101, C1416AOS Ciudad Autónoma de Buenos Aires.</span>
              </div>
            </div>
          </div>

          {/* COLUMNA 2: NAVEGACIÓN PRINCIPAL */}
          <div className="space-y-3">
            <h4 className="text-white font-heading font-bold text-xs uppercase tracking-wider border-b border-[#123230] pb-2">
              Navegación
            </h4>
            <ul className="space-y-2.5 font-medium">
              <li>
                <Link href="/#catalogo" className="text-[#F7F3EC]/90 hover:text-[#E7B86A] transition-colors flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-[#E7B86A]" /> Planes para vos
                </Link>
              </li>
              <li>
                <Link href="/nosotros" className="text-[#F7F3EC]/90 hover:text-[#E7B86A] transition-colors flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#F7F3EC]/70" /> Nosotros
                </Link>
              </li>
              <li>
                <Link href="/flete" className="text-[#F7F3EC]/90 hover:text-[#E7B86A] transition-colors flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-[#E7B86A]" /> Envíos Low Cost
                </Link>
              </li>
              <li>
                <Link href="/red-afiliados" className="text-[#F7F3EC]/90 hover:text-[#E7B86A] transition-colors flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#E7B86A]" /> Red de Afiliados
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-[#F7F3EC]/90 hover:text-[#E7B86A] transition-colors flex items-center gap-2">
                  <LogIn className="w-3.5 h-3.5 text-[#E7B86A]" /> Portal de Clientes
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMNA 3: INFORMACIÓN LEGAL Y CONSUMIDOR */}
          <div className="space-y-3">
            <h4 className="text-white font-heading font-bold text-xs uppercase tracking-wider border-b border-[#123230] pb-2">
              Legales y Defensa del Consumidor
            </h4>
            <ul className="space-y-2.5 font-medium">
              <li>
                <Link href="/terms" className="text-[#F7F3EC]/90 hover:text-white transition-colors flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#F7F3EC]/70" /> Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-[#F7F3EC]/90 hover:text-white transition-colors flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F7F3EC]/70" /> Política de Privacidad
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[#F7F3EC]/90 hover:text-white transition-colors flex items-center gap-2 underline"
                >
                  Defensa de las y los Consumidores
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMNA 4: DERECHO DE ARREPENTIMIENTO */}
          <div className="space-y-3 bg-[#112F2D] p-5 rounded-xl border border-[#123230]">
            <h4 className="text-white font-heading font-bold text-xs uppercase tracking-wider">
              Solicitud de Cancelación
            </h4>
            <p className="text-[11px] text-[#F7F3EC]/80 leading-relaxed">
              ¿Querés revocar una solicitud o compra realizada recientemente? Podés ejercer tu derecho legal de arrepentimiento.
            </p>
            <Link 
              href="/arrepentimiento" 
              className="inline-flex items-center justify-center gap-2 bg-[#F7F3EC] hover:bg-white text-[#173E3B] font-heading font-semibold text-xs px-4 py-2.5 rounded-lg transition-all uppercase tracking-wider w-full text-center"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#173E3B]" /> Botón de Arrepentimiento
            </Link>
          </div>

        </div>

        {/* AVISO LEGAL OBLIGATORIO Y COPYRIGHT */}
        <div className="space-y-3 text-center md:text-left pt-2">
          <p className="text-[#E7B86A] text-xs font-heading font-bold uppercase tracking-wider">
            Aviso Legal Obligatorio:
          </p>
          <p className="text-[#F7F3EC]/80 leading-relaxed text-[11px] text-justify md:text-left max-w-5xl">
            LOOP GESTIÓN INTEGRAL S.R.L. opera comercialmente bajo la marca Cuenta Hogar prestando servicios de gestión administrativa, mandato comercial y financiación propia. No realizamos intermediación financiera en los términos de la Ley de Entidades Financieras N° 21.526. En el servicio de Envíos Low Cost actuamos exclusivamente como prestatarios logísticos de traslado de mercadería.
          </p>
          <div className="pt-4 border-t border-[#123230] text-center text-[11px] text-[#F7F3EC]/60 font-mono">
            © {new Date().getFullYear()} LOOP GESTIÓN INTEGRAL S.R.L. — Todos los derechos reservados.
          </div>
        </div>

      </div>
    </footer>
  );
}
