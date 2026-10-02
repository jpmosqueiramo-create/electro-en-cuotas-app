import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { EnviosCalculator } from "@/components/EnviosCalculator";
import { EnviosFaq } from "@/components/EnviosFaq";
import { 
  Truck, 
  MapPin, 
  CalendarClock, 
  AlertCircle, 
  CheckCircle2, 
  Navigation, 
  Route, 
  Briefcase, 
  Layers, 
  Sparkles,
  ShieldCheck,
  Calculator,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  ChevronDown
} from "lucide-react";

export const metadata: Metadata = {
  title: "Envíos Low Cost CABA al Interior | Cuenta Hogar",
  description: "Recibimos tu compra en nuestro centro logístico de CABA (Caracas 1101) y la llevamos a tu domicilio en el interior con transporte propio y recorridos programados.",
  keywords: [
    "Envíos Low Cost CABA",
    "transporte propio buenos aires al interior",
    "comprar en caba envio al interior",
    "traslado de compras buenos aires",
    "recepcion mercaderia caba caracas 1101",
    "consolidacion de paquetes caba"
  ],
  alternates: {
    canonical: "https://cuenta-hogar.web.app/envios"
  }
};

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.419c-1.776 0-3.517-.476-5.044-1.377l-.362-.215-3.744.982.999-3.648-.236-.375c-.991-1.574-1.513-3.612-1.513-5.696 0-5.836 4.75-10.587 10.587-10.587 2.828 0 5.486 1.1 7.485 3.101 1.999 2 3.098 4.658 3.097 7.487 0 5.837-4.75 10.588-10.587 10.588m0-20.709c-6.726 0-12.2 5.474-12.2 12.2 0 2.147.56 4.246 1.624 6.091l-1.724 6.295 6.442-1.69c1.782.971 3.792 1.485 5.858 1.485 6.726 0 12.2-5.474 12.2-12.2 0-3.26-1.27-6.324-3.578-8.631-2.308-2.307-5.37-3.576-8.622-3.576" />
    </svg>
  );
}

export default function EnviosPage() {
  const whatsappTextDefault = `Hola, quiero conocer el servicio de Envíos Low Cost de Cuenta Hogar que estará disponible desde noviembre.

Suelo comprar productos en CABA y me interesa saber cómo podría recibirlos en mi localidad.

📍 Mi localidad es: 

¿Me cuentan cómo funciona el servicio?`;

  const whatsappUrlDefault = `https://wa.me/5491125659686?text=${encodeURIComponent(whatsappTextDefault)}`;

  return (
    <div className="min-h-screen bg-[#111318] text-white font-sans selection:bg-[#173E3B] selection:text-white">
      
      <Header />

      {/* 1. HERO ALTO CONTRASTE CON IDENTIDAD INSTITUCIONAL */}
      <section className="relative bg-[#111318] text-[#FFFDFC] pt-14 pb-20 lg:pt-20 lg:pb-28 overflow-hidden border-b border-[#173E3B]">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* IZQUIERDA: MENSAJE HERO */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* BADGE PRELANZAMIENTO NOVIEMBRE 2026 */}
              <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest bg-[#FFD21A] text-[#111318] px-3.5 py-1.5 rounded-lg shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#111318] animate-pulse"></span>
                <span>LANZAMIENTO · NOVIEMBRE 2026</span>
              </div>

              {/* TAG LOGÍSTICO */}
              <div className="inline-flex items-center gap-3 bg-[#FFD21A]/20 border border-[#FFD21A]/40 text-[#FFD21A] px-4 py-2 rounded-full text-xs font-heading font-extrabold uppercase tracking-widest shadow-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFD21A] animate-pulse"></span>
                ENVÍOS LOW COST · CABA <span className="text-[#FFFDFC] font-mono">●────────→ ●</span> INTERIOR
              </div>

              {/* H1 PROTAGONISTA */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-heading font-extrabold tracking-tight leading-[1.1] !text-white drop-shadow-md">
                Comprás en Buenos Aires.
                <span className="block mt-2 text-[#FFD21A] font-heading font-extrabold drop-shadow-sm">
                  Lo llevamos a la puerta de tu casa.
                </span>
              </h1>

              {/* BAJADA */}
              <p className="text-base sm:text-xl text-[#D1D5DB] font-sans font-medium leading-relaxed max-w-2xl drop-shadow-xs">
                Recibimos tus compras en nuestro punto logístico de CABA (Caracas 1101), consolidamos tus bultos y los transportamos con flota propia hasta tu localidad en el interior.
              </p>
              <div className="p-4 bg-[#FFD21A]/10 border border-[#FFD21A]/30 rounded-xl text-xs sm:text-sm text-[#FFD21A] font-bold space-y-1 max-w-2xl">
                <p className="font-extrabold">Servicio disponible desde noviembre de 2026.</p>
                <p className="text-[#D1D5DB] font-normal text-xs">Ya estamos recibiendo consultas para los próximos recorridos. Consultanos cómo funcionará en tu localidad.</p>
              </div>

              {/* CTA CONTRASTADO */}
              <div className="pt-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <a
                  href="#cotizador"
                  className="inline-flex items-center justify-center gap-2.5 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-heading font-extrabold px-8 py-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-[#FFD21A]/20 transform active:scale-95"
                >
                  <Calculator className="w-4.5 h-4.5" />
                  VER TARIFAS ESTIMADAS
                </a>

                <a
                  href={whatsappUrlDefault}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 bg-[#161922] hover:bg-[#222530] text-white border border-[#374151] font-heading font-bold px-7 py-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md"
                >
                  <WhatsAppIcon className="w-4.5 h-4.5 text-[#FFD21A]" />
                  Consultar por WhatsApp
                </a>
              </div>

              {/* REFUERZO SOBRIO */}
              <div className="pt-6 border-t border-[#FFFDFC]/15 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs sm:text-sm font-heading font-bold text-[#D1D5DB]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  <span>Recepción en CABA</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  <span>Consolidación sin cargo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  <span>Transporte propio</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  <span>Entrega en domicilio</span>
                </div>
              </div>

            </div>

            {/* DERECHA: FOTOGRAFÍA EDITORIAL DE LA OPERACIÓN */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#FFFDFC]/20 shadow-2xl group">
                <img 
                  src="/flota-cuenta-hogar.jpg" 
                  alt="Operación de transporte propio Cuenta Hogar" 
                  className="w-full h-[360px] sm:h-[440px] lg:h-[480px] object-cover group-hover:scale-102 transition-transform duration-700" 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#173E3B] via-transparent to-transparent flex items-end p-6">
                  <div className="bg-[#111318]/90 backdrop-blur-md border border-[#FFFDFC]/20 text-[#FFFDFC] p-4 rounded-xl w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FFD21A] text-[#111318] rounded-lg flex items-center justify-center shrink-0 font-bold">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-heading font-bold uppercase text-[#FFD21A] tracking-wider">
                          Operación Logística Directa
                        </p>
                        <p className="text-xs text-[#F7F3EC]/80 font-sans">
                          Salida programada CABA (Caracas 1101) ➔ Interior
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. COTIZADOR INTERACTIVO DE ENVIOS */}
      <section id="cotizador" className="py-16 lg:py-24 bg-[#161922] border-b border-[#222530] scroll-mt-20">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#FFD21A]">
              <Calculator className="w-4 h-4 text-[#FFD21A]" /> Calculadora Interactiva
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Cotizá tu Envío en Segundos
            </h2>
            <p className="text-[#9CA3AF] text-sm font-sans">
              Seleccioná tu destino y el tipo de carga para obtener una estimación rápida e iniciar la cotización por WhatsApp.
            </p>
            <div className="inline-block p-3 bg-[#FFD21A]/10 border border-[#FFD21A]/30 rounded-xl text-xs font-bold text-[#FFD21A] mt-1">
              Servicio disponible desde noviembre de 2026 · Ya estamos recibiendo consultas
            </div>
          </div>

          <EnviosCalculator />

        </div>
      </section>

      {/* 3. EL PROBLEMA Y LA SOLUCIÓN (COHERENCIA DE MARCA) */}
      <section className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#FFD21A]">
              <AlertCircle className="w-4 h-4" /> La realidad de comprar desde el interior
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-heading font-extrabold text-[#FFD21A] leading-tight">
              Compraste en Capital. ¿Y ahora cómo llega a tu casa?
            </h2>
          </div>

          {/* LISTA DE PROBLEMAS REALES VS SOLUCIÓN CUENTA HOGAR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-xs border-l-4 border-l-[#B44E2A]">
              <h3 className="font-heading font-bold text-[#FFD21A] text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#B44E2A]" /> El problema habitual
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#9CA3AF] font-sans">
                <li className="flex items-start gap-2">
                  <span className="text-[#B44E2A] font-bold">•</span>
                  <span>Coordinar quién recibe o retira compras en CABA desde cientos de kilómetros.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#B44E2A] font-bold">•</span>
                  <span>Pagar múltiples encomiendas individuales si le compraste a 2 o más locales.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#B44E2A] font-bold">•</span>
                  <span>Incertidumbre de horarios y riesgo de roturas por manipulación excesiva.</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#161922] border border-[#173E3B] p-6 rounded-2xl space-y-3 shadow-xs border-l-4 border-l-[#2F7D5C]">
              <h3 className="font-heading font-bold text-[#FFD21A] text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#2F7D5C]" /> La solución Cuenta Hogar
              </h3>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#D1D5DB] font-sans">
                <li className="flex items-start gap-2">
                  <span className="text-[#2F7D5C] font-bold">✓</span>
                  <span>Un único punto logístico de recepción oficial en CABA: <strong>Caracas 1101</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2F7D5C] font-bold">✓</span>
                  <span><strong>Consolidación sin cargo:</strong> agrupamos todos tus bultos en un solo viaje.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#2F7D5C] font-bold">✓</span>
                  <span>Transporte propio con salida programada y entrega directa en tu domicilio.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* TEXTO DE CIERRE CENTRALIZADO */}
          <div className="bg-[#161922] border border-[#222530] p-8 rounded-2xl text-center space-y-3 max-w-3xl mx-auto shadow-sm">
            <p className="text-base sm:text-lg font-heading font-bold text-[#FFD21A] leading-relaxed">
              Centralizamos la recepción de tus proveedores en Buenos Aires y nos encargamos del traslado completo con nuestra flota.
            </p>
            <p className="text-xs text-[#9CA3AF] font-sans">
              Recepción centralizada en CABA (Caracas 1101) previa coordinación administrativa.
            </p>
          </div>

        </div>
      </section>

      {/* 4. RECORRIDO VISUAL "Así viaja tu compra" REDISEÑADO */}
      <section className="py-20 lg:py-28 bg-[#161922] border-b border-[#222530]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12 lg:space-y-16">
          
          {/* ENCABEZADO DE LA SECCIÓN */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#FFD21A]">
              <Route className="w-4 h-4 text-[#FFD21A]" /> Trazabilidad Directa CABA ➔ Interior
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Así viaja tu compra
            </h2>
            <p className="text-[#9CA3AF] text-sm sm:text-base font-sans leading-relaxed">
              Un proceso transparente de 6 pasos desde el local en Capital hasta la puerta de tu casa.
            </p>
          </div>

          {/* VISTA DESKTOP: SECUENCIA HORIZONTAL CONECTADA (lg:block hidden) */}
          <div className="hidden lg:block relative pt-4 pb-2">
            
            {/* LÍNEA DE CONEXIÓN HORIZONTAL CONTINUA DETRÁS DE LAS TARJETAS */}
            <div className="absolute top-[48px] left-[6%] right-[6%] h-[3px] bg-[#222530] z-0 rounded-full" />
            <div className="absolute top-[48px] left-[6%] right-[6%] h-[3px] bg-gradient-to-r from-[#FFD21A] via-[#FFD21A]/70 to-[#FFD21A] z-0 rounded-full opacity-80" />

            {/* GRID DE 6 PASOS CON GAP REDUCIDO */}
            <div className="grid grid-cols-6 gap-3 xl:gap-4 relative z-10">
              {[
                {
                  numero: "01",
                  titulo: "Cotizás tu envío",
                  descripcion: "Nos enviás el origen y detalles del paquete para coordinar.",
                  badge: "INICIO"
                },
                {
                  numero: "02",
                  titulo: "Despachás a CABA",
                  descripcion: "Tu proveedor entrega en Caracas 1101, CABA.",
                  badge: "RECEPCIÓN",
                  destacadoDesc: true
                },
                {
                  numero: "03",
                  titulo: "Verificación",
                  descripcion: "Recibimos, etiquetamos e identificamos tus bultos.",
                  badge: "CONTROL"
                },
                {
                  numero: "04",
                  titulo: "Consolidación",
                  descripcion: "Agrupamos tus compras de distintos locales sin costo extra.",
                  badge: "SIN CARGO"
                },
                {
                  numero: "05",
                  titulo: "Recorrido activo",
                  descripcion: "Cargamos en nuestra flota propia según la ruta programada.",
                  badge: "EN RUTA"
                },
                {
                  numero: "06",
                  titulo: "Entrega en domicilio",
                  descripcion: "Te lo bajamos en la puerta de tu casa en el interior.",
                  badge: "DESTINO"
                }
              ].map((paso, idx) => (
                <div key={idx} className="relative group flex flex-col">
                  
                  {/* CONECTOR EN EL GAP ENTRE TARJETAS ADYACENTES */}
                  {idx < 5 && (
                    <div className="absolute -right-3.5 xl:-right-4 top-[24px] -translate-y-1/2 z-30 pointer-events-none flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-[#161922] border border-[#FFD21A]/40 flex items-center justify-center text-[#FFD21A] shadow-md">
                        <ChevronRight className="w-3 h-3 text-[#FFD21A]" />
                      </div>
                    </div>
                  )}

                  {/* CABECERA DEL PASO CON CIRCULO NUMERADO Y BADGE */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className={`w-10 h-10 rounded-full font-mono font-extrabold text-xs flex items-center justify-center shrink-0 border-2 transition-transform duration-200 group-hover:scale-105 ${
                      idx === 0 || idx === 5 
                        ? 'bg-[#FFD21A] text-[#111318] border-[#FFD21A] shadow-lg shadow-[#FFD21A]/20' 
                        : 'bg-[#111318] text-white border-[#FFD21A]/40 group-hover:border-[#FFD21A]'
                    }`}>
                      {paso.numero}
                    </div>

                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      idx === 0 || idx === 5 
                        ? 'bg-[#FFD21A]/10 text-[#FFD21A] border-[#FFD21A]/40' 
                        : 'bg-[#161922] text-[#9CA3AF] border-[#222530]'
                    }`}>
                      {paso.badge}
                    </span>
                  </div>

                  {/* CUERPO DE LA TARJETA */}
                  <div className={`bg-[#111318] border transition-all duration-200 rounded-2xl p-4 xl:p-5 flex-1 flex flex-col justify-between space-y-4 shadow-lg group-hover:border-[#FFD21A]/50 ${
                    idx === 0 || idx === 5 
                      ? 'border-[#FFD21A]/40 bg-gradient-to-b from-[#111318] to-[#161922]' 
                      : 'border-[#222530]'
                  }`}>
                    <div className="space-y-2">
                      <h4 className="font-heading font-bold text-white group-hover:text-[#FFD21A] text-sm leading-snug transition-colors">
                        {paso.titulo}
                      </h4>
                      <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed">
                        {paso.destacadoDesc ? (
                          <>Tu proveedor entrega en <strong className="text-white font-semibold">Caracas 1101, CABA</strong>.</>
                        ) : (
                          paso.descripcion
                        )}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#222530] flex items-center justify-between text-[10px] font-mono">
                      <span className={idx === 0 || idx === 5 ? "text-[#FFD21A] font-bold" : "text-[#9CA3AF]"}>
                        {idx === 0 ? "PASO INICIAL" : idx === 5 ? "DESTINO FINAL" : `ETAPA 0${idx+1}`}
                      </span>
                      {idx < 5 ? (
                        <ArrowRight className="w-3 h-3 text-[#FFD21A]/60 group-hover:text-[#FFD21A] transition-colors" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD21A]" />
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* VISTA MOBILE Y TABLET: TIMELINE VERTICAL CONTINUO (lg:hidden block) */}
          <div className="block lg:hidden relative pl-4 sm:pl-6">
            
            {/* LÍNEA DE CONEXIÓN VERTICAL CONTINUA */}
            <div className="absolute left-[23px] sm:left-[31px] top-6 bottom-6 w-[3px] bg-gradient-to-b from-[#FFD21A] via-[#FFD21A]/60 to-[#FFD21A] rounded-full z-0 opacity-80" />

            <div className="space-y-6 relative z-10">
              {[
                {
                  numero: "01",
                  titulo: "Cotizás tu envío",
                  descripcion: "Nos enviás el origen y detalles del paquete para coordinar.",
                  badge: "INICIO"
                },
                {
                  numero: "02",
                  titulo: "Despachás a CABA",
                  descripcion: "Tu proveedor entrega en Caracas 1101, CABA.",
                  badge: "RECEPCIÓN",
                  destacadoDesc: true
                },
                {
                  numero: "03",
                  titulo: "Verificación",
                  descripcion: "Recibimos, etiquetamos e identificamos tus bultos.",
                  badge: "CONTROL"
                },
                {
                  numero: "04",
                  titulo: "Consolidación",
                  descripcion: "Agrupamos tus compras de distintos locales sin costo extra.",
                  badge: "SIN CARGO"
                },
                {
                  numero: "05",
                  titulo: "Recorrido activo",
                  descripcion: "Cargamos en nuestra flota propia según la ruta programada.",
                  badge: "EN RUTA"
                },
                {
                  numero: "06",
                  titulo: "Entrega en domicilio",
                  descripcion: "Te lo bajamos en la puerta de tu casa en el interior.",
                  badge: "DESTINO"
                }
              ].map((paso, idx) => (
                <div key={idx} className="relative pl-9 sm:pl-11 flex flex-col">
                  
                  {/* NODO CIRCULAR CON NÚMERO SOBRE LA LÍNEA VERTICAL */}
                  <div className={`absolute left-0 top-1 -translate-x-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full font-mono font-extrabold text-xs sm:text-sm flex items-center justify-center z-10 border-2 shadow-md ${
                    idx === 0 || idx === 5 
                      ? 'bg-[#FFD21A] text-[#111318] border-[#FFD21A] ring-4 ring-[#161922]' 
                      : 'bg-[#111318] text-white border-[#FFD21A]/50 ring-4 ring-[#161922]'
                  }`}>
                    {paso.numero}
                  </div>

                  {/* TARJETA DEL PASO EN MOBILE/TABLET */}
                  <div className={`bg-[#111318] border rounded-2xl p-4 sm:p-5 space-y-3 shadow-lg ${
                    idx === 0 || idx === 5 
                      ? 'border-[#FFD21A]/40 bg-gradient-to-r from-[#111318] to-[#161922]' 
                      : 'border-[#222530]'
                  }`}>
                    <div className="flex items-center justify-between gap-2 border-b border-[#222530] pb-2.5">
                      <h4 className="font-heading font-bold text-white text-sm sm:text-base">
                        {paso.titulo}
                      </h4>
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                        idx === 0 || idx === 5 
                          ? 'bg-[#FFD21A]/10 text-[#FFD21A] border-[#FFD21A]/40' 
                          : 'bg-[#161922] text-[#9CA3AF] border-[#222530]'
                      }`}>
                        {paso.badge}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-[#9CA3AF] font-sans leading-relaxed">
                      {paso.destacadoDesc ? (
                        <>Tu proveedor entrega en <strong className="text-white font-semibold">Caracas 1101, CABA</strong>.</>
                      ) : (
                        paso.descripcion
                      )}
                    </p>

                    <div className="pt-2 border-t border-[#222530]/60 flex items-center justify-between text-[11px] font-mono text-[#9CA3AF]">
                      <span className={idx === 0 || idx === 5 ? "text-[#FFD21A] font-bold" : ""}>
                        {idx === 0 ? "Paso 1 de 6 — Inicio CABA" : idx === 5 ? "Paso 6 de 6 — Entrega Final" : `Etapa ${idx+1} de 6`}
                      </span>
                      {idx < 5 ? (
                        <div className="flex items-center gap-1 text-[#FFD21A] text-xs">
                          <span>Siguiente</span>
                          <ChevronDown className="w-3.5 h-3.5 text-[#FFD21A]" />
                        </div>
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD21A]" />
                      )}
                    </div>
                  </div>

                </div>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* 5. PUNTO LOGÍSTICO CENTRAL CABA */}
      <section className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-[#161922] border-2 border-[#173E3B] rounded-3xl p-8 sm:p-12 shadow-md space-y-8">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[#222530] pb-6">
              <div className="space-y-1">
                <span className="text-xs font-heading font-bold text-[#FFD21A] uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Sede Oficial de Recepción CABA
                </span>
                <h2 className="text-3xl font-heading font-extrabold text-[#FFD21A]">
                  Tu punto logístico central en Capital
                </h2>
              </div>

              <div className="bg-[#111318] border border-[#222530] px-5 py-3 rounded-2xl flex items-center gap-3 shrink-0">
                <CalendarClock className="w-5 h-5 text-[#FFD21A]" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#9CA3AF] tracking-wider">Horario de recepción</p>
                  <p className="text-base font-heading font-bold text-[#FFD21A]">A COORDINAR</p>
                </div>
              </div>
            </div>

            <p className="text-base sm:text-lg text-white font-sans leading-relaxed">
              Tus vendedores o proveedores entregan la mercadería directamente en nuestro local autorizado de CABA.
            </p>

            {/* DIRECCIÓN Y MAPA DE GOOGLE MAPS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-4">
                <div className="bg-[#111318] border border-[#222530] p-6 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#173E3B] text-white rounded-xl flex items-center justify-center shrink-0 font-bold">
                    <Navigation className="w-5 h-5 text-[#FFD21A]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase font-bold text-[#9CA3AF] tracking-wider">Dirección para tus proveedores:</p>
                    <p className="text-lg font-heading font-bold text-[#FFD21A]">Caracas 1101, CABA, Argentina</p>
                  </div>
                </div>

                <div className="w-full rounded-2xl overflow-hidden border border-[#222530]">
                  <iframe
                    title="Ubicación Centro de Recepción CABA - Caracas 1101"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.473539827663!2d-58.46820522346083!3d-34.61747805822394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcc9f3a61c572b%3A0x6b2e35a1408018e6!2sCaracas%201101%2C%20C1416AOS%20CABA!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
                    width="100%"
                    height="220"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="w-full h-[220px] rounded-2xl"
                  />
                </div>
              </div>

              {/* FOTOGRAFÍA DEL LOCAL CABA */}
              <div className="relative rounded-2xl overflow-hidden border border-[#222530] shadow-md h-full min-h-[300px] group">
                <img 
                  src="/deposito-cuenta-hogar.jpg" 
                  alt="Centro logístico real Cuenta Hogar CABA Caracas 1101" 
                  className="w-full h-full object-cover min-h-[300px] group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#173E3B]/90 via-transparent to-transparent flex items-end p-5">
                  <div>
                    <p className="text-xs font-heading font-bold uppercase text-[#FFD21A] tracking-wider">
                      Centro Logístico CABA
                    </p>
                    <p className="text-xs text-[#FFFDFC]/90 font-sans">
                      Caracas 1101, Capital Federal
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ALERTA OBLIGATORIA */}
            <div className="flex items-center gap-3 text-xs sm:text-sm text-[#FFD21A] font-bold bg-[#FFD21A]/10 border border-[#B44E2A]/20 p-4 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0 text-[#B44E2A]" />
              <span>Importante: no enviar mercadería sin coordinar previamente con Cuenta Hogar para la emisión de la orden de recepción.</span>
            </div>

          </div>
        </div>
      </section>

      {/* 6. LOGÍSTICA ORGANIZADA ("De nuestro centro en CABA a tu domicilio.") */}
      <section className="py-20 lg:py-28 bg-[#161922] border-b border-[#222530]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* IZQUIERDA: CONTENIDO */}
            <div className="lg:col-span-6 space-y-6 text-left">
              
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FFD21A] bg-[#111318] border border-[#FFD21A]/30 px-3.5 py-1.5 rounded-full">
                  <Layers className="w-3.5 h-3.5 text-[#FFD21A]" /> LOGÍSTICA ORGANIZADA · CABA → INTERIOR
                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-heading font-extrabold text-[#FFD21A] leading-tight">
                  De nuestro centro en CABA a tu domicilio.
                </h2>
              </div>

              <p className="text-base sm:text-lg text-[#9CA3AF] font-sans leading-relaxed">
                Recibimos y organizamos cada compra en nuestro centro de CABA, la preparamos para el recorrido correspondiente y coordinamos la entrega en tu domicilio.
              </p>

              {/* AVISO DISCRETO DE PRELANZAMIENTO */}
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#FFD21A] bg-[#FFD21A]/10 border border-[#FFD21A]/20 px-3.5 py-2 rounded-xl">
                <CalendarClock className="w-4 h-4 text-[#FFD21A]" />
                <span>Disponible desde noviembre · Ya estamos recibiendo consultas</span>
              </div>

              {/* LOS CUATRO BENEFICIOS ORGANIZACIONALES */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-start gap-3.5 bg-[#111318] border border-[#222530] p-4 rounded-2xl hover:border-[#FFD21A]/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-[#FFD21A]/10 border border-[#FFD21A]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-[#FFD21A]" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-white text-sm sm:text-base">Recepción coordinada en CABA</h4>
                    <p className="text-xs sm:text-sm text-[#9CA3AF] font-sans mt-0.5 leading-relaxed">
                      Identificamos cada compra desde que llega a nuestro centro de recepción.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-[#111318] border border-[#222530] p-4 rounded-2xl hover:border-[#FFD21A]/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-[#FFD21A]/10 border border-[#FFD21A]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-[#FFD21A]" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-white text-sm sm:text-base">Preparación por recorrido</h4>
                    <p className="text-xs sm:text-sm text-[#9CA3AF] font-sans mt-0.5 leading-relaxed">
                      Organizamos los bultos según localidad, tipo de carga y próxima salida.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-[#111318] border border-[#222530] p-4 rounded-2xl hover:border-[#FFD21A]/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-[#FFD21A]/10 border border-[#FFD21A]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-[#FFD21A]" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-white text-sm sm:text-base">Traslado programado</h4>
                    <p className="text-xs sm:text-sm text-[#9CA3AF] font-sans mt-0.5 leading-relaxed">
                      Planificamos los recorridos para tener mayor control sobre tiempos y entregas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-[#111318] border border-[#222530] p-4 rounded-2xl hover:border-[#FFD21A]/30 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-[#FFD21A]/10 border border-[#FFD21A]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4.5 h-4.5 text-[#FFD21A]" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-white text-sm sm:text-base">Entrega en tu domicilio</h4>
                    <p className="text-xs sm:text-sm text-[#9CA3AF] font-sans mt-0.5 leading-relaxed">
                      Llevamos la compra hasta tu dirección dentro de las localidades de cobertura.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* DERECHA: FOTOGRAFÍA REAL DEL CENTRO DE RECEPCIÓN Y PREPARACIÓN */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden border-2 border-[#222530] shadow-2xl group">
                <img 
                  src="/centro-logistico-caba.jpg" 
                  alt="Centro de recepción y preparación Cuenta Hogar CABA" 
                  className="w-full h-[420px] sm:h-[500px] object-cover group-hover:scale-105 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/90 via-transparent to-transparent flex items-end p-6 sm:p-8">
                  <div className="flex items-center gap-3 bg-[#111318]/85 backdrop-blur-md border border-[#FFD21A]/30 px-4 py-2.5 rounded-xl text-white shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFD21A] shrink-0 animate-pulse"></span>
                    <p className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider">
                      CENTRO DE RECEPCIÓN Y PREPARACIÓN · CABA → INTERIOR
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 7. SECCIÓN COMERCIOS Y EMPRENDEDORES */}
      <section className="py-20 lg:py-28 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          
          <div className="max-w-3xl space-y-4 text-left">
            <div className="inline-flex items-center gap-2 bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
              <Briefcase className="w-4 h-4 text-[#FFD21A]" /> PARA COMERCIOS Y EMPRENDEDORES
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-white leading-tight">
              Cuenta Hogar, cerca de los negocios del interior
            </h2>
            <p className="text-base sm:text-lg text-[#FFD21A] font-bold leading-relaxed">
              Comprá a distintos proveedores en Capital. Nosotros recibimos, organizamos y consolidamos tus compras para que lleguen juntas en un solo envío.
            </p>
          </div>

          {/* DESTACADO PRINCIPAL: CONSOLIDACIÓN SIN CARGO */}
          <div className="bg-[#161922] border-2 border-[#FFD21A] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            <div className="space-y-2 max-w-2xl relative z-10">
              <span className="inline-block bg-[#FFD21A] text-[#111318] text-xs font-mono font-extrabold uppercase px-3 py-1 rounded-md tracking-wider">
                BENEFICIO LOGÍSTICO EXCLUSIVO
              </span>
              <h3 className="text-2xl font-extrabold text-white">
                CONSOLIDACIÓN SIN CARGO DE MÚLTIPLES PROVEEDORES
              </h3>
              <p className="text-sm text-[#D1D5DB] leading-relaxed">
                Comprá en distintos locales de CABA. Agrupamos todos tus paquetes en nuestro depósito y pagás un único envío ajustado al volumen total.
              </p>
            </div>
            <div className="bg-[#111318] border border-[#2A2E3D] px-6 py-4 rounded-xl text-center shrink-0 w-full md:w-auto relative z-10">
              <span className="block text-[11px] font-mono text-[#9CA3AF] uppercase font-bold">Base Logística en CABA</span>
              <span className="block text-sm font-bold text-[#FFD21A] mt-0.5">Caracas 1101, Capital Federal</span>
            </div>
          </div>

          {/* GRID DE BENEFICIOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-lg hover:border-[#FFD21A]/50 transition-all">
              <div className="w-10 h-10 bg-[#111318] text-[#FFD21A] rounded-xl flex items-center justify-center font-bold border border-[#FFD21A]/30">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Un solo punto de recepción</h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Tus proveedores envían sus entregas directamente a Caracas 1101 en CABA.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-lg hover:border-[#FFD21A]/50 transition-all">
              <div className="w-10 h-10 bg-[#111318] text-[#FFD21A] rounded-xl flex items-center justify-center font-bold border border-[#FFD21A]/30">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Compras organizadas</h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Identificamos y mantenemos agrupada la mercadería correspondiente a tu comercio.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-lg hover:border-[#FFD21A]/50 transition-all">
              <div className="w-10 h-10 bg-[#111318] text-[#FFD21A] rounded-xl flex items-center justify-center font-bold border border-[#FFD21A]/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Consolidación sin cargo</h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Reunimos compras realizadas a distintos proveedores antes del traslado.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-lg hover:border-[#FFD21A]/50 transition-all">
              <div className="w-10 h-10 bg-[#111318] text-[#FFD21A] rounded-xl flex items-center justify-center font-bold border border-[#FFD21A]/30">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Entrega en tu comercio</h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Aprovechamos los recorridos programados para llevar la carga directo a tu local.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 8. RUTAS Y LOCALIDADES ACTIVAS */}
      <section className="py-20 lg:py-24 bg-[#161922] border-b border-[#222530]">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-12">
          
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#FFD21A]">
              <MapPin className="w-4 h-4 text-[#FFD21A]" /> Cobertura Logística
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Rutas y Localidades Activas
            </h2>
            <p className="text-[#9CA3AF] text-sm font-sans">
              Contamos con cronogramas y recorridos activos en las siguientes localidades del interior:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {["Lincoln", "Zavalía", "Los Toldos", "Chivilcoy", "O'Brien"].map((loc) => (
              <div key={loc} className="bg-[#111318] border border-[#222530] p-5 rounded-2xl text-center space-y-1 shadow-xs hover:border-[#173E3B] transition-colors">
                <MapPin className="w-5 h-5 text-[#FFD21A] mx-auto mb-1" />
                <p className="font-heading font-bold text-[#FFD21A] text-base">{loc}</p>
                <p className="text-[10px] text-[#9CA3AF] font-mono font-bold">Recorrido Activo</p>
              </div>
            ))}
          </div>

          <div className="bg-[#111318] border border-[#222530] p-4 rounded-xl inline-block text-xs font-heading font-semibold text-[#9CA3AF]">
            🌱 Estamos incorporando progresivamente nuevas localidades al mapa de recorridos.
          </div>

        </div>
      </section>

      {/* 9. SECCIÓN PREGUNTAS FRECUENTES (FAQ) */}
      <section className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#FFD21A]">
              <HelpCircle className="w-4 h-4 text-[#FFD21A]" /> Respuestas Claras
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Preguntas Frecuentes de Envíos
            </h2>
          </div>

          <EnviosFaq />
        </div>
      </section>

      {/* 10. COTIZACIÓN FINAL POR WHATSAPP */}
      <section className="py-20 lg:py-28 bg-[#161922] text-[#FFFDFC]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#FFD21A]/20 border border-[#FFD21A]/40 text-[#FFD21A] px-4 py-2 rounded-full text-xs font-heading font-extrabold uppercase tracking-widest shadow-xs">
              <Truck className="w-4 h-4 text-[#FFD21A]" /> Cotización Inmediata
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight leading-tight !text-white drop-shadow-sm">
              ¿Querés saber el costo exacto de tu envío?
            </h2>
            
            <p className="text-base sm:text-lg text-[#D1D5DB] font-sans font-medium max-w-xl mx-auto leading-relaxed">
              Contanos qué compraste y a qué localidad tenemos que llevarlo. Te enviamos la cotización ajustada por WhatsApp en minutos.
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-4">
            <a
              href={whatsappUrlDefault}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-heading font-extrabold px-10 py-5 rounded-2xl text-sm uppercase tracking-wider transition-all shadow-xl shadow-black/30 hover:scale-[1.02] active:scale-95"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Cotizar Envío por WhatsApp
            </a>

            <p className="text-xs text-[#9CA3AF] font-sans">
              ⏱️ Atención directa de lunes a sábados de 08:00 a 20:00 hs.
            </p>
          </div>

        </div>
      </section>

      <Footer />

    </div>
  );
}
