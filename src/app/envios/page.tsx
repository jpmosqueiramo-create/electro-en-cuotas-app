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
  title: { absolute: "Envíos Low Cost | Cuenta Hogar" },
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

      {/* 1. HERO ALTO CONTRASTE REENFOCADO EN LA NECESIDAD DEL CLIENTE PARTICULAR */}
      <section className="relative bg-[#111318] text-[#FFFDFC] pt-12 pb-16 lg:pt-16 lg:pb-24 overflow-hidden border-b border-[#222530]">
        
        {/* RESPLANDOR SUTIL DE FONDO */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#FFD21A]/5 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* COLUMNA IZQUIERDA (CONTENIDO EN DESKTOP / NARRATIVA PRINCIPAL) */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* 1. EYEBROW (ENVÍOS LOW COST · CABA → INTERIOR) */}
              <div className="inline-flex items-center gap-2.5 bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
                <Truck className="w-3.5 h-3.5 text-[#FFD21A]" />
                <span>ENVÍOS LOW COST · CABA → INTERIOR</span>
              </div>

              {/* 2. NUEVO TÍTULO CONECTADO CON EL DOLOR DEL USUARIO */}
              <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight leading-[1.1] text-white">
                Compraste en Buenos Aires.<br />
                <span className="text-[#FFD21A] block mt-1.5">
                  Ahora falta hacerlo llegar.
                </span>
              </h1>

              {/* 3. NUEVA BAJADA ORIENTADA AL CLIENTE PARTICULAR */}
              <p className="text-sm sm:text-base lg:text-lg text-[#E5E7EB] font-normal leading-relaxed max-w-2xl">
                Tu proveedor entrega la compra en nuestro punto de recepción en CABA. Nosotros la recibimos, la organizamos para el próximo recorrido y la llevamos hasta la puerta de tu domicilio en el interior.
              </p>

              {/* 4. BLOQUE DE PUENTE DOLOR / SOLUCIÓN */}
              <div className="p-4 bg-[#161922] border border-[#2D323E] rounded-xl text-xs sm:text-sm text-[#FFD21A] font-bold leading-snug max-w-2xl shadow-sm">
                Sin tener que resolver por separado quién recibe, cómo trasladarlo o dónde retirarlo.
              </div>

              {/* 5. FOTOGRAFÍA DE ENTREGA A DOMICILIO EN MOBILE (EN MOBILE APARECE AQUÍ) */}
              <div className="lg:hidden relative pt-2">
                <div className="relative rounded-2xl overflow-hidden border border-[#2D323E] bg-[#090A0D] shadow-xl">
                  <img 
                    src="/entrega-ford-transit.jpg" 
                    alt="Ford Transit Cuenta Hogar realizando entrega a domicilio en el interior" 
                    className="w-full h-[240px] sm:h-[300px] object-cover object-center"
                  />
                  
                  {/* OVERLAY SOBRIO ORIENTADO AL CLIENTE */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/90 via-transparent to-transparent flex items-end p-4">
                    <div className="bg-[#161922]/90 backdrop-blur-md border border-[#2D323E] p-3 rounded-xl w-full text-left">
                      <p className="text-xs font-mono font-bold uppercase text-[#FFD21A] tracking-wider">
                        DE CABA A TU DOMICILIO
                      </p>
                      <p className="text-[11px] text-[#D1D5DB] font-medium mt-0.5">
                        Recibimos tu compra y coordinamos la entrega en el interior.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. DISPONIBILIDAD (ÚNICO BLOQUE DE PRELANZAMIENTO) */}
              <div className="p-3.5 bg-[#FFFDF5] border border-[#FFD21A]/60 rounded-xl text-xs text-[#111318] font-semibold space-y-0.5 max-w-2xl shadow-xs">
                <div className="flex items-center gap-2 font-bold text-[#111318]">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A] animate-pulse"></span>
                  <span>Disponible desde el 25 de noviembre de 2026</span>
                </div>
                <p className="text-[11px] text-[#56616E] pl-4">
                  Ya estamos recibiendo consultas para los próximos recorridos.
                </p>
              </div>

              {/* 7. BOTONES DE ACCIÓN (CTAs) */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <a
                  href="#cotizador"
                  className="inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-extrabold px-8 h-[52px] rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#FFD21A]/20 transform active:scale-95 shrink-0"
                >
                  <Calculator className="w-4.5 h-4.5 text-[#111318]" />
                  <span>VER TARIFAS ESTIMADAS</span>
                </a>

                <a
                  href={whatsappUrlDefault}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#161922] hover:bg-[#222530] text-white border border-[#374151] font-bold px-7 h-[52px] rounded-xl text-xs uppercase tracking-wider transition-all shrink-0 shadow-sm"
                >
                  <WhatsAppIcon className="w-4.5 h-4.5 text-[#FFD21A]" />
                  <span>CONSULTAR POR WHATSAPP</span>
                </a>
              </div>

              {/* 8. TRES BENEFICIOS EN LUGAR DE CUATRO (DESGLOSADOS CLARAMENTE) */}
              <div className="pt-4 border-t border-[#222530] grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider block">
                    PUNTO DE RECEPCIÓN CABA
                  </span>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed">
                    Tu proveedor entrega la compra en Caracas 1101, previa coordinación.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider block">
                    UN SOLO CONTACTO
                  </span>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed">
                    Coordinás con Cuenta Hogar desde la recepción hasta la entrega.
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider block">
                    ENTREGA EN TU DOMICILIO
                  </span>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed">
                    Recibís tu compra en tu domicilio dentro de las localidades del recorrido.
                  </p>
                </div>

              </div>

            </div>

            {/* COLUMNA DERECHA (DESKTOP): FOTOGRAFÍA DE LA FORD TRANSIT ENTREGANDO A DOMICILIO */}
            <div className="hidden lg:block lg:col-span-5 relative lg:pt-1">
              <div className="relative rounded-3xl overflow-hidden border border-[#2D323E] bg-[#090A0D] shadow-2xl group">
                <img 
                  src="/entrega-ford-transit.jpg" 
                  alt="Ford Transit Cuenta Hogar realizando entrega a domicilio en el interior" 
                  className="w-full h-[460px] object-cover object-center group-hover:scale-102 transition-transform duration-700" 
                />
                
                {/* OVERLAY SOBRIO Y ELEGANTE SOBRE LA FOTO EN DESKTOP */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/90 via-transparent to-transparent flex items-end p-6">
                  <div className="bg-[#161922]/90 backdrop-blur-md border border-[#2D323E] p-4 rounded-2xl w-full text-left shadow-lg">
                    <p className="text-xs font-mono font-bold uppercase text-[#FFD21A] tracking-wider">
                      DE CABA A TU DOMICILIO
                    </p>
                    <p className="text-xs text-[#D1D5DB] font-medium mt-1 leading-snug">
                      Recibimos tu compra y coordinamos la entrega en el interior.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

{/* 2. COTIZADOR INTERACTIVO DE ENVIOS (SECCIÓN EN FONDO BLANCO LUMINOSO) */}
      <section id="cotizador" className="py-16 lg:py-24 bg-[#FFFFFF] text-[#111318] border-b border-[#DCE1E6] scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
          
          {/* ENCABEZADO DEL COTIZADOR */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-[#56616E] bg-[#F4F6F8] px-3.5 py-1.5 rounded-full border border-[#DCE1E6]">
              <Calculator className="w-3.5 h-3.5 text-[#111318]" /> CALCULADORA INTERACTIVA
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111318] tracking-tight">
              Cotizá tu envío en segundos
            </h2>
            
            <p className="text-sm sm:text-base text-[#56616E] leading-relaxed max-w-xl mx-auto">
              Seleccioná tu localidad y el tipo de carga para obtener una estimación. Si necesitás ayuda, después podés continuar la consulta por WhatsApp.
            </p>

            <div className="pt-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFDF5] border border-[#FFD21A]/60 text-[#111318] text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#FFD21A] animate-pulse"></span>
                <span>Disponible desde el 25 de noviembre de 2026 · Ya estamos recibiendo consultas</span>
              </div>
            </div>
          </div>

          <EnviosCalculator />

        </div>
      </section>

      {/* 3. EL PROBLEMA Y LA SOLUCIÓN (COHERENCIA DE MARCA) */}
      <section id="preguntas-frecuentes" className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530] scroll-mt-20">
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
              Centralizamos la recepción de tus proveedores en Buenos Aires y nos encargamos del traslado completo hacia tu localidad.
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
                  titulo: "Recepción e Identificación",
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
                  titulo: "Recorrido previsto",
                  descripcion: "Cargamos en nuestro transporte según la ruta programada.",
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
                  titulo: "Recepción e Identificación",
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
                  titulo: "Recorrido previsto",
                  descripcion: "Cargamos en nuestro transporte según la ruta programada.",
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

      {/* 5. SECCIÓN FUSIONADA: PUNTO DE RECEPCIÓN EN CABA Y PROCESO HASTA TU DOMICILIO */}
      <section id="recepcion-caba" className="py-16 lg:py-20 bg-[#111318] border-b border-[#222530] scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10 lg:space-y-12">
          
          {/* ENCABEZADO DE SECCIÓN */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block bg-[#161922] border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-xs">
              TU PUNTO DE RECEPCIÓN EN CABA
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-extrabold text-white tracking-tight leading-[1.12]">
              Tu compra llega a Capital.<br />
              <span className="text-[#FFD21A] block mt-1">
                Nosotros nos ocupamos del resto.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[#D1D5DB] font-sans leading-relaxed max-w-2xl mx-auto">
              Tu proveedor entrega la mercadería en nuestro centro de recepción de Caracas 1101, previa coordinación. Desde ahí la identificamos, la organizamos para el recorrido correspondiente y coordinamos la entrega en tu domicilio.
            </p>

            {/* AVISO DE DISPONIBILIDAD ÚNICO */}
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161922] border border-[#FFD21A]/40 text-[#FFD21A] text-xs font-mono font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#FFD21A] animate-pulse"></span>
                <span>Disponible desde el 25 de noviembre de 2026 · Ya estamos recibiendo consultas.</span>
              </div>
            </div>
          </div>

          {/* ESTRUCTURA DESKTOP DE 2 COLUMNAS (IZQ ~45%, DER ~55%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMNA IZQUIERDA: INFORMACIÓN PRÁCTICA, DIRECCIÓN Y MAPA */}
            <div className="lg:col-span-5 space-y-5">
              
              {/* BLOQUE DE DIRECCIÓN Y HORARIO */}
              <div className="bg-[#161922] border border-[#252A32] p-5 sm:p-6 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#252A32] pb-3.5">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FFD21A]">
                      DIRECCIÓN DE RECEPCIÓN
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-0.5">
                      Caracas 1101 · CABA
                    </h3>
                  </div>
                  <div className="bg-[#111318] border border-[#252A32] px-3 py-2 rounded-xl text-right">
                    <p className="text-[10px] uppercase font-bold text-[#9CA3AF]">Horario de recepción</p>
                    <p className="text-xs font-bold text-[#FFD21A]">A COORDINAR</p>
                  </div>
                </div>

                <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed">
                  Punto de recepción para compras previamente coordinadas.
                </p>

                <div className="pt-1">
                  <a
                    href="https://maps.google.com/?q=Caracas+1101+CABA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#111318] hover:bg-[#1A1D26] text-[#FFD21A] border border-[#FFD21A]/40 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[#FFD21A]" />
                    <span>ABRIR EN MAPS</span>
                  </a>
                </div>
              </div>

              {/* ADVERTENCIA IMPORTANTE (FONDOS AMARILLOS SUAVES, SIN ROJO) */}
              <div className="p-4 bg-[#FFFDF5] border border-[#FFD21A]/60 rounded-xl text-xs text-[#111318] font-semibold flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-4.5 h-4.5 text-[#111318] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  No enviar mercadería sin coordinar previamente con Cuenta Hogar.
                </p>
              </div>

              {/* MAPA GOOGLE MAPS IFRAME */}
              <div className="w-full rounded-2xl overflow-hidden border border-[#252A32] shadow-md">
                <iframe
                  title="Ubicación Centro de Recepción CABA - Caracas 1101"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.473539827663!2d-58.46820522346083!3d-34.61747805822394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcc9f3a61c572b%3A0x6b2e35a1408018e6!2sCaracas%201101%2C%20C1416AOS%20CABA!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-[200px] rounded-2xl"
                />
              </div>

            </div>

            {/* COLUMNA DERECHA: FOTOGRAFÍA ÚNICA REAL DEL CENTRO DE RECEPCIÓN */}
            <div className="lg:col-span-7 h-full">
              <div className="relative rounded-2xl overflow-hidden border border-[#252A32] bg-[#161922] shadow-xl group h-full min-h-[360px]">
                <img 
                  src="/deposito-cuenta-hogar.jpg" 
                  alt="Centro de recepción Cuenta Hogar CABA Caracas 1101" 
                  className="w-full h-full max-h-[460px] object-cover group-hover:scale-102 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/80 via-transparent to-transparent flex items-end p-4 sm:p-5">
                  <p className="text-xs font-mono font-medium text-[#D1D5DB] bg-[#111318]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#252A32]">
                    Centro de recepción en CABA · Caracas 1101
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* SECUENCIA DE 4 PASOS ("¿QUÉ PASA DESPUÉS?") */}
          <div className="pt-6 border-t border-[#222530] space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#FFD21A] block text-center sm:text-left">
              ¿QUÉ PASA DESPUÉS?
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* PASO 01 */}
              <div className="bg-[#161922] border border-[#252A32] p-4.5 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[#111318] bg-[#FFD21A] px-2 py-0.5 rounded">
                    01
                  </span>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    Tu proveedor entrega en CABA
                  </h3>
                </div>
                <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed pt-1">
                  Recibimos la compra en Caracas 1101, previa coordinación.
                </p>
              </div>

              {/* PASO 02 */}
              <div className="bg-[#161922] border border-[#252A32] p-4.5 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[#111318] bg-[#FFD21A] px-2 py-0.5 rounded">
                    02
                  </span>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    Recibimos e identificamos
                  </h3>
                </div>
                <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed pt-1">
                  Registramos la compra y la preparamos para el recorrido correspondiente.
                </p>
              </div>

              {/* PASO 03 */}
              <div className="bg-[#161922] border border-[#252A32] p-4.5 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[#111318] bg-[#FFD21A] px-2 py-0.5 rounded">
                    03
                  </span>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    Organizamos la próxima salida
                  </h3>
                </div>
                <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed pt-1">
                  La incorporamos al recorrido programado hacia tu localidad.
                </p>
              </div>

              {/* PASO 04 */}
              <div className="bg-[#161922] border border-[#252A32] p-4.5 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-[#111318] bg-[#FFD21A] px-2 py-0.5 rounded">
                    04
                  </span>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    Entregamos en tu domicilio
                  </h3>
                </div>
                <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed pt-1">
                  Coordinamos la llegada dentro de las localidades de cobertura.
                </p>
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
              Comprá a distintos proveedores en Capital. Nosotros recibimos, organizamos y consolidamos tus compras en CABA para trasladarlas juntas a tu localidad.
            </p>
          </div>

          {/* BLOQUE OFICIAL DE CUPOS LIMITADOS Y GRATUIDAD DE RECEPCIÓN / CONSOLIDACIÓN */}
          <div className="bg-[#161922] border-2 border-[#FFD21A] rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[#222530] pb-6">
              <div className="space-y-2 max-w-2xl">
                <span className="inline-block bg-[#FFD21A] text-[#111318] text-xs font-mono font-extrabold uppercase px-3 py-1 rounded-md tracking-wider">
                  BENEFICIO LOGÍSTICO ESPECIAL
                </span>
                <h3 className="text-2xl font-extrabold text-white">
                  Recepción y consolidación sin cargo, con cupos limitados
                </h3>
                <p className="text-sm text-[#D1D5DB] leading-relaxed">
                  Si comprás mercadería de forma recurrente en CABA, podés utilizar nuestro centro de recepción para reunir compras de distintos proveedores sin costo adicional por recepción ni consolidación. Trabajaremos con una cantidad limitada de clientes recurrentes para mantener el espacio, la organización y la calidad del servicio.
                </p>
              </div>

              <div className="bg-[#111318] border border-[#2A2E3D] px-6 py-4 rounded-xl text-center shrink-0 w-full md:w-auto">
                <span className="block text-[11px] font-mono text-[#9CA3AF] uppercase font-bold">Punto Logístico CABA</span>
                <span className="block text-sm font-bold text-[#FFD21A] mt-0.5">Caracas 1101, Capital Federal</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <div className="text-xs text-[#FFD21A] font-bold font-mono">
                * Nota: La recepción, consolidación y custodia temporal de la mercadería no tienen costo adicional para clientes recurrentes. El traslado al interior se cotiza por bulto según sus características y el recorrido.
              </div>
              <a
                href="https://wa.me/5491125659686?text=Hola%2C%20quiero%20conocer%20c%C3%B3mo%20funcionar%C3%A1%20%2AEnv%C3%ADos%20Low%20Cost%20de%20Cuenta%20Hogar%2A%20para%20mi%20negocio/emprendimiento%20a%20partir%20de%20noviembre.%0A%0ARealizo%20compras%20en%20CABA%20y%20me%20interesa%20poder%20recibirlas%20en%20un%20mismo%20punto%2C%20consolidarlas%20sin%20cargo%20y%20trasladarlas%20juntas%20hasta%20mi%20localidad.%0A%0A%F0%9F%93%8D%20Mi%20localidad%20es%3A%0A%0A%C2%BFMe%20cuentan%20c%C3%B3mo%20funcionar%C3%A1%20el%20servicio%20para%20mi%20negocio%3F"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lowcost text-xs uppercase tracking-wider shrink-0"
              >
                <WhatsAppIcon className="w-4 h-4" />
                QUIERO CONOCER EL SERVICIO PARA MI NEGOCIO
              </a>
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
                Recepción sin cargo en Caracas 1101, CABA para las entregas de todos tus proveedores.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-lg hover:border-[#FFD21A]/50 transition-all">
              <div className="w-10 h-10 bg-[#111318] text-[#FFD21A] rounded-xl flex items-center justify-center font-bold border border-[#FFD21A]/30">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Compras organizadas</h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Identificamos y agrupamos la mercadería correspondiente a tu comercio.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-lg hover:border-[#FFD21A]/50 transition-all">
              <div className="w-10 h-10 bg-[#111318] text-[#FFD21A] rounded-xl flex items-center justify-center font-bold border border-[#FFD21A]/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Consolidación sin cargo</h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Reunimos compras de distintos proveedores sin costo extra antes de enviarlas.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-6 rounded-2xl space-y-3 shadow-lg hover:border-[#FFD21A]/50 transition-all">
              <div className="w-10 h-10 bg-[#111318] text-[#FFD21A] rounded-xl flex items-center justify-center font-bold border border-[#FFD21A]/30">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white">Entrega en tu comercio</h4>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Traslado cotizado por bulto según sus características y el recorrido.
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
              Rutas y Localidades Previstas
            </h2>
            <p className="text-[#9CA3AF] text-sm font-sans">
              Contamos con cronogramas y recorridos previstos desde el 25 de noviembre en las siguientes localidades del interior:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {["Lincoln", "Zavalía", "Los Toldos", "Chivilcoy", "O'Brien"].map((loc) => (
              <div key={loc} className="bg-[#111318] border border-[#222530] p-5 rounded-2xl text-center space-y-1 shadow-xs hover:border-[#173E3B] transition-colors">
                <MapPin className="w-5 h-5 text-[#FFD21A] mx-auto mb-1" />
                <p className="font-heading font-bold text-[#FFD21A] text-base">{loc}</p>
                <p className="text-[10px] text-[#9CA3AF] font-mono font-bold">Recorrido Previsto</p>
              </div>
            ))}
          </div>

          <div className="bg-[#111318] border border-[#222530] p-4 rounded-xl inline-block text-xs font-heading font-semibold text-[#9CA3AF]">
            🌱 Estamos incorporando progresivamente nuevas localidades al mapa de recorridos.
          </div>

        </div>
      </section>

      {/* 9. SECCIÓN PREGUNTAS FRECUENTES (FAQ) */}
      <section id="preguntas-frecuentes" className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530] scroll-mt-20">
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
              <Truck className="w-4 h-4 text-[#FFD21A]" /> ESTIMÁ TU ENVÍO
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold tracking-tight leading-tight !text-white drop-shadow-sm">
              ¿Querés conocer el valor estimado?
            </h2>
            
            <p className="text-base sm:text-lg text-[#D1D5DB] font-sans font-medium max-w-xl mx-auto leading-relaxed">
              Contanos tu localidad y qué tenés pensado comprar. Te orientamos por WhatsApp sobre cómo funcionará el servicio a partir del 25 de noviembre y el valor estimado del traslado por bulto.
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
              CONSULTAR VALOR ESTIMADO POR WHATSAPP
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
