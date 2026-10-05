"use client";

import Link from "next/link";
import { MapPin, RotateCcw, MessageCircle } from "lucide-react";

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-[#090A0D] border-t border-[#1C1E26] text-white py-12 lg:py-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        
        <div className="grid grid-cols-1 grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* MARCA E INFRAESTRUCTURA */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-[#111318] border border-[#FFD21A]/40 rounded-xl shadow-md">
                <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-8 w-auto" />
              </div>
              <div>
                <span className="font-bold text-white text-base block tracking-tight">CUENTA HOGAR</span>
                <span className="font-mono text-[10px] text-[#FFD21A] uppercase block">LOOP GESTIÓN INTEGRAL S.R.L.</span>
              </div>
            </div>

            <p className="text-xs text-[#9CA3AF] max-w-md leading-relaxed">
              Operatoria de mandato comercial, traslado y logística con transporte propio desde nuestro centro de recepción en Buenos Aires hasta domicilios en el interior.
            </p>

            <div className="flex items-center gap-2 text-xs font-mono text-[#FFD21A]">
              <MapPin className="w-4 h-4 text-[#FFD21A] shrink-0" />
              <span>Centro de Logística & Recepción: Caracas 1101, CABA</span>
            </div>
          </div>

          {/* NAVEGACIÓN PÚBLICA */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider">
              Navegación
            </h4>
            <ul className="space-y-2 text-xs text-[#9CA3AF]">
              <li><Link href="/#modelo" className="hover:text-white transition-colors">Cómo Funciona</Link></li>
              <li><Link href="/servicio-de-compra" className="hover:text-white transition-colors">Servicio de Compra</Link></li>
              <li><Link href="/envios" className="hover:text-white transition-colors">Envíos Low Cost CABA</Link></li>
              <li><Link href="/nosotros" className="hover:text-white transition-colors">Sobre Nosotros</Link></li>
              <li><Link href="/red-afiliados" className="hover:text-white transition-colors">Red de Afiliados</Link></li>
              <li><Link href="/cliente" className="inline-flex items-center gap-1.5 text-white hover:text-[#FFD21A] font-bold transition-colors"><span className="w-1.5 h-1.5 rounded-full bg-[#FFD21A]"></span>Portal Clientes</Link></li>
              <li><Link href="/login-afiliado" className="hover:text-[#FFD21A] text-[#9CA3AF] transition-colors">Acceso Vendedores Afiliados</Link></li>
            </ul>
          </div>

          {/* SEGUINOS / CONTACTO */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider">
              Contacto & Redes
            </h4>
            <ul className="space-y-2 text-xs text-[#9CA3AF]">
              <li>
                <a 
                  href="https://wa.me/5491125659686"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Consultar por WhatsApp a Cuenta Hogar"
                  className="inline-flex items-center gap-2 hover:text-[#25D366] transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>WhatsApp · +54 9 11 2565-9686</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://www.instagram.com/cuenta_hogar/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visitar Instagram de Cuenta Hogar"
                  className="inline-flex items-center gap-2 hover:text-[#FFD21A] transition-colors"
                >
                  <InstagramIcon className="w-4 h-4 text-[#FFD21A]" />
                  <span>Instagram · @CUENTA_HOGAR</span>
                </a>
              </li>
            </ul>
          </div>

          {/* LEGAL & CONSUMIDOR */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider">
              Legal & Consumidor
            </h4>
            <ul className="space-y-2 text-xs text-[#9CA3AF]">
              <li><Link href="/terms" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Política de Privacidad</Link></li>
              <li>
                <a 
                  href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors underline decoration-[#FFD21A]/50"
                >
                  Defensa del Consumidor
                </a>
              </li>
              <li className="pt-1">
                <Link 
                  href="/arrepentimiento" 
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FFD21A] hover:text-[#FFE052] bg-[#161922] border border-[#FFD21A]/30 px-3 py-1.5 rounded-lg transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Boton de Arrepentimiento</span>
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* AVISO LEGAL OBLIGATORIO Y COPYRIGHT */}
        <div className="pt-8 border-t border-[#1C1E26] space-y-3">
          <p className="text-[11px] text-[#9CA3AF] leading-relaxed max-w-5xl">
            <strong className="text-[#FFD21A]">Aviso Legal Obligatorio:</strong> LOOP GESTIÓN INTEGRAL S.R.L. opera bajo la marca comercial Cuenta Hogar prestando servicios de gestión de compra por mandato comercial y traslado logístico asociado. No realizamos intermediación financiera en los términos de la Ley N° 21.526. En la solución Envíos Low Cost actuamos exclusivamente como prestatarios de traslado de mercadería recibida en nuestro local de CABA.
          </p>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#6B7280]">
            <p>© {new Date().getFullYear()} LOOP GESTIÓN INTEGRAL S.R.L. — Todos los derechos reservados.</p>
            
          </div>
        </div>

      </div>
    </footer>
  );
}
