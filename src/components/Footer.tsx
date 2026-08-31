"use client";

import Link from "next/link";
import { RotateCcw, MapPin, Building2, FileText, ShieldCheck, Truck, ShoppingBag, Users, LogIn } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-[#0d0e11] text-zinc-400 text-xs py-16 font-sans">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        
        {/* GRID DE 4 COLUMNAS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 border-b border-zinc-800/80 pb-12">
          
          {/* COLUMNA 1: MARCA E IDENTIDAD */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-cuenta-hogar-oficial.png" 
                alt="Cuenta Hogar Logo" 
                className="h-14 w-auto object-contain bg-slate-950 p-1.5 rounded-xl border border-zinc-800 shadow-md" 
              />
            </div>
            
            <div className="space-y-1.5 text-zinc-400">
              <p className="font-black text-white text-sm">LOOP GESTIÓN INTEGRAL S.R.L.</p>
              <p className="font-mono text-[11px]">CUIT: 30-71829384-9</p>
              <div className="flex items-start gap-1.5 pt-1 text-zinc-400">
                <MapPin className="w-4 h-4 text-[#fe5000] flex-shrink-0 mt-0.5" />
                <span>Caracas 1101, C1416AOS Ciudad Autónoma de Buenos Aires.</span>
              </div>
            </div>
          </div>

          {/* COLUMNA 2: NAVEGACIÓN PRINCIPAL */}
          <div className="space-y-3">
            <h4 className="text-white font-black text-xs uppercase tracking-wider border-b border-zinc-800 pb-2">
              Navegación
            </h4>
            <ul className="space-y-2.5 font-bold">
              <li>
                <Link href="/#catalogo" className="text-zinc-300 hover:text-[#fe5000] transition-colors flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#fe5000]" /> Planes para vos
                </Link>
              </li>
              <li>
                <Link href="/nosotros" className="text-zinc-300 hover:text-[#fe5000] transition-colors flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#fe5000]" /> Nosotros
                </Link>
              </li>
              <li>
                <Link href="/flete" className="text-zinc-300 hover:text-[#fe5000] transition-colors flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-[#fe5000]" /> Traslado de Compras
                </Link>
              </li>
              <li>
                <Link href="/red-afiliados" className="text-zinc-300 hover:text-[#fe5000] transition-colors flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[#fe5000]" /> Red de Afiliados
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-zinc-300 hover:text-[#fe5000] transition-colors flex items-center gap-2">
                  <LogIn className="w-3.5 h-3.5 text-[#fe5000]" /> Portal de Clientes
                </Link>
              </li>
            </ul>
          </div>

          {/* COLUMNA 3: INFORMACIÓN LEGAL Y CONSUMIDOR */}
          <div className="space-y-3">
            <h4 className="text-white font-black text-xs uppercase tracking-wider border-b border-zinc-800 pb-2">
              Legales y Defensa del Consumidor
            </h4>
            <ul className="space-y-2.5 font-bold">
              <li>
                <Link href="/terms" className="text-zinc-300 hover:text-[#fe5000] transition-colors flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" /> Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-zinc-300 hover:text-[#fe5000] transition-colors flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" /> Política de Privacidad
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-zinc-300 hover:text-white transition-colors flex items-center gap-2 underline"
                >
                  Defensa de las y los Consumidores
                </a>
              </li>
            </ul>
          </div>

          {/* COLUMNA 4: DERECHO DE ARREPENTIMIENTO */}
          <div className="space-y-4 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800/80">
            <h4 className="text-white font-black text-xs uppercase tracking-wider">
              Solicitud de Cancelación
            </h4>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              ¿Querés revocar una solicitud o compra realizada recientemente? Podés ejercer tu derecho legal de arrepentimiento.
            </p>
            <Link 
              href="/arrepentimiento" 
              className="inline-flex items-center justify-center gap-2 bg-[#fe5000] hover:bg-orange-600 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-all uppercase tracking-wider w-full border border-orange-400/30 text-center"
            >
              <RotateCcw className="w-4 h-4" /> Botón de Arrepentimiento
            </Link>
          </div>

        </div>

        {/* AVISO LEGAL OBLIGATORIO Y COPYRIGHT */}
        <div className="space-y-4 text-center md:text-left pt-2">
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
            Aviso Legal Obligatorio:
          </p>
          <p className="text-zinc-400 leading-relaxed text-[11px] text-justify md:text-left max-w-5xl">
            LOOP GESTIÓN INTEGRAL S.R.L. opera comercialmente bajo la marca Cuenta Hogar prestando servicios de gestión administrativa, mandato comercial y financiación propia. No realizamos intermediación financiera en los términos de la Ley de Entidades Financieras N° 21.526. En el servicio de Traslado de Compras actuamos exclusivamente como prestatarios logísticos de traslado de mercadería.
          </p>
          <div className="pt-4 border-t border-zinc-800/80 text-center text-[11px] text-zinc-400 font-mono">
            © {new Date().getFullYear()} LOOP GESTIÓN INTEGRAL S.R.L. — Todos los derechos reservados.
          </div>
        </div>

      </div>
    </footer>
  );
}
