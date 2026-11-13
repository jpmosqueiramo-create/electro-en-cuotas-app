import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Image from "next/image";
import { EnviosCalculator } from "@/components/EnviosCalculator";
import { EnviosFaq } from "@/components/EnviosFaq";
import {
  Truck,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Route,
  Briefcase,
  Layers,
  Sparkles,
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
    <div className="public-site">

      <Header />
      <main id="contenido">

      {/* 1. HERO ALTO CONTRASTE REENFOCADO EN LA NECESIDAD DEL CLIENTE PARTICULAR */}
      <section className="public-hero public-warm">
          <div className="public-container public-split">
            <div className="public-stack">
              <p className="public-kicker">Envíos Low Cost</p>
              <h1>Compraste en Buenos Aires. Ahora falta hacerlo llegar.</h1>
              <p className="public-copy">Tu proveedor entrega la compra en Caracas 1101, CABA, previa coordinación. La recibimos, la organizamos para el próximo recorrido y la llevamos a tu domicilio dentro de la cobertura.</p>
              <div className="public-actions">
                <a className="public-button" href="#cotizador">Ver tarifas estimadas</a>
                <a className="public-link" href={whatsappUrlDefault} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>
              </div>
              <p className="public-note">Disponible desde el 25 de noviembre de 2026. Ya estamos recibiendo consultas.</p>
            </div>
            <Image className="public-photo" src="/entrega-ford-transit.jpg" alt="Vehículo de Cuenta Hogar en una entrega a domicilio" width={1024} height={576} sizes="(max-width: 767px) 100vw, 50vw" preload />
          </div>
        </section>

{/* 2. COTIZADOR INTERACTIVO DE ENVIOS (SECCIÓN EN FONDO BLANCO LUMINOSO) */}
      <section id="cotizador" className="public-section scroll-mt-20">
        <div className="public-container space-y-8">

          <div className="public-stack">
            <h2>Estimá el costo de tu envío</h2>
            <p className="public-copy">Seleccioná tu localidad y el tipo de carga. Si necesitás ayuda, podés continuar la consulta por WhatsApp.</p>
          </div>

          <EnviosCalculator />

        </div>
      </section>

      {/* 3. EL PROBLEMA Y LA SOLUCIÓN (COHERENCIA DE MARCA) */}
      <section id="condiciones-del-servicio" className="public-section scroll-mt-20">
        <div className="max-w-5xl mx-auto px-6 space-y-12">

          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 text-[.875rem] font-heading font-bold text-[var(--public-ink)]">
              <AlertCircle className="w-4 h-4" /> La realidad de comprar desde el interior
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-heading font-semibold text-[var(--public-ink)] leading-tight">
              Compraste en Capital. ¿Y ahora cómo llega a tu casa?
            </h2>
          </div>

          {/* LISTA DE PROBLEMAS REALES VS SOLUCIÓN CUENTA HOGAR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-6 rounded-md space-y-3 border-l-4 border-l-[var(--public-line)]">
              <h3 className="font-heading font-bold text-[var(--public-ink)] text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#B44E2A]" /> El problema habitual
              </h3>
              <ul className="space-y-2.5 text-[.875rem] sm:text-sm text-[var(--public-muted)] font-sans">
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

            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-6 rounded-md space-y-3 border-l-4 border-l-[var(--public-line)]">
              <h3 className="font-heading font-bold text-[var(--public-ink)] text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#2F7D5C]" /> La solución Cuenta Hogar
              </h3>
              <ul className="space-y-2.5 text-[.875rem] sm:text-sm text-[var(--public-ink)] font-sans">
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
          <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-8 rounded-md text-center space-y-3 max-w-3xl mx-auto">
            <p className="text-base sm:text-lg font-heading font-bold text-[var(--public-ink)] leading-relaxed">
              Centralizamos la recepción de tus proveedores en Buenos Aires y nos encargamos del traslado completo hacia tu localidad.
            </p>
            <p className="text-[.875rem] text-[var(--public-muted)] font-sans">
              Recepción centralizada en CABA (Caracas 1101) previa coordinación administrativa.
            </p>
          </div>

        </div>
      </section>

      {/* 4. RECORRIDO VISUAL "Así viaja tu compra" REDISEÑADO */}
      <section className="public-section">
        <div className="public-container space-y-12 lg:space-y-16">

          {/* ENCABEZADO DE LA SECCIÓN */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-[.875rem] font-heading font-bold text-[var(--public-ink)]">
              <Route className="w-4 h-4 text-[var(--public-ink)]" /> Trazabilidad Directa CABA ➔ Interior
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-[var(--public-ink)]">
              Así viaja tu compra
            </h2>
            <p className="text-[var(--public-muted)] text-sm sm:text-base font-sans leading-relaxed">
              Un proceso transparente de 6 pasos desde el local en Capital hasta la puerta de tu casa.
            </p>
          </div>

          {/* VISTA DESKTOP: SECUENCIA HORIZONTAL CONECTADA (lg:block hidden) */}
          <div className="hidden lg:block relative pt-4 pb-2">

            {/* LÍNEA DE CONEXIÓN HORIZONTAL CONTINUA DETRÁS DE LAS TARJETAS */}
            <div className="absolute top-[48px] left-[6%] right-[6%] h-[3px] bg-[#222530] z-0 rounded-md" />
            <div className="absolute top-[48px] left-[6%] right-[6%] h-[3px] z-0 rounded-md opacity-80" />

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
                    <div className="absolute -right-3.5 xl:-right-4 top-[24px] z-30 pointer-events-none flex items-center justify-center">
                      <div className="w-5 h-5 rounded-md bg-[var(--public-warm)] border border-[var(--public-line)] flex items-center justify-center text-[var(--public-ink)]">
                        <ChevronRight className="w-3 h-3 text-[var(--public-ink)]" />
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
                      <h4 className="font-heading font-bold text-[var(--public-ink)] group-hover:text-[var(--public-ink)] text-sm leading-snug transition-colors">
                        {paso.titulo}
                      </h4>
                      <p className="text-[.875rem] text-[var(--public-muted)] font-sans leading-relaxed">
                        {paso.destacadoDesc ? (
                          <>Tu proveedor entrega en <strong className="text-[var(--public-ink)] font-semibold">Caracas 1101, CABA</strong>.</>
                        ) : (
                          paso.descripcion
                        )}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[var(--public-line)] flex items-center justify-between text-[.875rem]">
                      <span className={idx === 0 || idx === 5 ? "text-[#FFD21A] font-bold" : "text-[#9CA3AF]"}>
                        {idx === 0 ? "PASO INICIAL" : idx === 5 ? "DESTINO FINAL" : `ETAPA 0${idx+1}`}
                      </span>
                      {idx < 5 ? (
                        <ArrowRight className="w-3 h-3 text-[var(--public-ink)] group-hover:text-[var(--public-ink)] transition-colors" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--public-ink)]" />
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
            <div className="absolute left-[23px] sm:left-[31px] top-6 bottom-6 w-[3px] rounded-md z-0 opacity-80" />

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
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--public-line)] pb-2.5">
                      <h4 className="font-heading font-bold text-[var(--public-ink)] text-sm sm:text-base">
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

                    <p className="text-[.875rem] sm:text-sm text-[var(--public-muted)] font-sans leading-relaxed">
                      {paso.destacadoDesc ? (
                        <>Tu proveedor entrega en <strong className="text-[var(--public-ink)] font-semibold">Caracas 1101, CABA</strong>.</>
                      ) : (
                        paso.descripcion
                      )}
                    </p>

                    <div className="pt-2 border-t border-[var(--public-line)] flex items-center justify-between text-[.875rem] text-[var(--public-muted)]">
                      <span className={idx === 0 || idx === 5 ? "text-[#FFD21A] font-bold" : ""}>
                        {idx === 0 ? "Paso 1 de 6 — Inicio CABA" : idx === 5 ? "Paso 6 de 6 — Entrega Final" : `Etapa ${idx+1} de 6`}
                      </span>
                      {idx < 5 ? (
                        <div className="flex items-center gap-1 text-[var(--public-ink)] text-[.875rem]">
                          <span>Siguiente</span>
                          <ChevronDown className="w-3.5 h-3.5 text-[var(--public-ink)]" />
                        </div>
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--public-ink)]" />
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
      <section id="recepcion-caba" className="public-section scroll-mt-20">
        <div className="public-container space-y-10 lg:space-y-12">

          {/* ENCABEZADO DE SECCIÓN */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] font-bold px-3.5 py-1.5 rounded-md">
              TU PUNTO DE RECEPCIÓN EN CABA
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-semibold text-[var(--public-ink)] tracking-tight leading-[1.12]">
              Tu compra llega a Capital.<br />
              <span className="text-[var(--public-ink)] block mt-1">
                Nosotros nos ocupamos del resto.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-[var(--public-ink)] font-sans leading-relaxed max-w-2xl mx-auto">
              Tu proveedor entrega la mercadería en nuestro centro de recepción de Caracas 1101, previa coordinación. Desde ahí la identificamos, la organizamos para el recorrido correspondiente y coordinamos la entrega en tu domicilio.
            </p>

            {/* AVISO DE DISPONIBILIDAD ÚNICO */}
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] font-semibold">

                <span>Disponible desde el 25 de noviembre de 2026 · Ya estamos recibiendo consultas.</span>
              </div>
            </div>
          </div>

          {/* ESTRUCTURA DESKTOP DE 2 COLUMNAS (IZQ ~45%, DER ~55%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* COLUMNA IZQUIERDA: INFORMACIÓN PRÁCTICA, DIRECCIÓN Y MAPA */}
            <div className="lg:col-span-5 space-y-5">

              {/* BLOQUE DE DIRECCIÓN Y HORARIO */}
              <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-5 sm:p-6 rounded-md space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--public-line)] pb-3.5">
                  <div>
                    <span className="text-[.875rem] font-bold text-[var(--public-ink)]">
                      DIRECCIÓN DE RECEPCIÓN
                    </span>
                    <h3 className="text-xl font-semibold text-[var(--public-ink)] mt-0.5">
                      Caracas 1101 · CABA
                    </h3>
                  </div>
                  <div className="bg-[var(--public-warm)] border border-[var(--public-line)] px-3 py-2 rounded-md text-right">
                    <p className="text-[.875rem] font-bold text-[var(--public-muted)]">Horario de recepción</p>
                    <p className="text-[.875rem] font-bold text-[var(--public-ink)]">A COORDINAR</p>
                  </div>
                </div>

                <p className="text-[.875rem] text-[var(--public-muted)] font-sans leading-relaxed">
                  Punto de recepción para compras previamente coordinadas.
                </p>

                <div className="pt-1">
                  <a
                    href="https://maps.google.com/?q=Caracas+1101+CABA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[var(--public-warm)] hover:bg-[var(--public-warm)] text-[var(--public-ink)] border border-[var(--public-line)] text-[.875rem] font-bold px-4 py-2.5 rounded-md"
                  >
                    <Navigation className="w-3.5 h-3.5 text-[var(--public-ink)]" />
                    <span>ABRIR EN MAPS</span>
                  </a>
                </div>
              </div>

              {/* ADVERTENCIA IMPORTANTE (FONDOS AMARILLOS SUAVES, SIN ROJO) */}
              <div className="p-4 bg-[#FFFDF5] border border-[var(--public-line)] rounded-md text-[.875rem] text-[var(--public-ink)] font-semibold flex items-start gap-3">
                <AlertCircle className="w-4.5 h-4.5 text-[var(--public-ink)] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  No enviar mercadería sin coordinar previamente con Cuenta Hogar.
                </p>
              </div>

              {/* MAPA GOOGLE MAPS IFRAME */}
              <div className="w-full rounded-md overflow-hidden border border-[var(--public-line)]">
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
              <div className="relative rounded-md overflow-hidden border border-[var(--public-line)] bg-[var(--public-warm)] group h-full min-h-[360px]">
                <img
                  src="/deposito-cuenta-hogar.jpg"
                  alt="Centro de recepción Cuenta Hogar CABA Caracas 1101"
                  className="w-full h-full max-h-[460px] object-cover duration-700"
                />
                <div className="absolute inset-0 flex items-end p-4 sm:p-5">
                  <p className="text-[.875rem] font-medium text-[var(--public-ink)] bg-[var(--public-warm)] backdrop-blur-md px-3 py-1.5 rounded-lg border border-[var(--public-line)]">
                    Centro de recepción en CABA · Caracas 1101
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* SECUENCIA DE 4 PASOS ("¿QUÉ PASA DESPUÉS?") */}
          <div className="pt-6 border-t border-[var(--public-line)] space-y-4">
            <span className="text-[.875rem] font-bold text-[var(--public-ink)] block text-center sm:text-left">
              ¿QUÉ PASA DESPUÉS?
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* PASO 01 */}
              <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-4.5 rounded-md space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[.875rem] font-black text-[var(--public-black)] bg-[var(--public-yellow)] px-2 py-0.5 rounded">
                    01
                  </span>
                  <h3 className="text-sm font-bold text-[var(--public-ink)] leading-tight">
                    Tu proveedor entrega en CABA
                  </h3>
                </div>
                <p className="text-[.875rem] text-[var(--public-muted)] font-sans leading-relaxed pt-1">
                  Recibimos la compra en Caracas 1101, previa coordinación.
                </p>
              </div>

              {/* PASO 02 */}
              <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-4.5 rounded-md space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[.875rem] font-black text-[var(--public-black)] bg-[var(--public-yellow)] px-2 py-0.5 rounded">
                    02
                  </span>
                  <h3 className="text-sm font-bold text-[var(--public-ink)] leading-tight">
                    Recibimos e identificamos
                  </h3>
                </div>
                <p className="text-[.875rem] text-[var(--public-muted)] font-sans leading-relaxed pt-1">
                  Registramos la compra y la preparamos para el recorrido correspondiente.
                </p>
              </div>

              {/* PASO 03 */}
              <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-4.5 rounded-md space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[.875rem] font-black text-[var(--public-black)] bg-[var(--public-yellow)] px-2 py-0.5 rounded">
                    03
                  </span>
                  <h3 className="text-sm font-bold text-[var(--public-ink)] leading-tight">
                    Organizamos la próxima salida
                  </h3>
                </div>
                <p className="text-[.875rem] text-[var(--public-muted)] font-sans leading-relaxed pt-1">
                  La incorporamos al recorrido programado hacia tu localidad.
                </p>
              </div>

              {/* PASO 04 */}
              <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-4.5 rounded-md space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[.875rem] font-black text-[var(--public-black)] bg-[var(--public-yellow)] px-2 py-0.5 rounded">
                    04
                  </span>
                  <h3 className="text-sm font-bold text-[var(--public-ink)] leading-tight">
                    Entregamos en tu domicilio
                  </h3>
                </div>
                <p className="text-[.875rem] text-[var(--public-muted)] font-sans leading-relaxed pt-1">
                  Coordinamos la llegada dentro de las localidades de cobertura.
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 7. SECCIÓN COMERCIOS Y EMPRENDEDORES */}
      <section className="public-section">
        <div className="public-container space-y-12">

          <div className="max-w-3xl space-y-4 text-left">
            <div className="inline-flex items-center gap-2 bg-transparent border border-[var(--public-line)] text-[var(--public-ink)] px-3.5 py-1.5 rounded-md text-[.875rem] font-bold">
              <Briefcase className="w-4 h-4 text-[var(--public-ink)]" /> PARA COMERCIOS Y EMPRENDEDORES
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold text-[var(--public-ink)] leading-tight">
              Cuenta Hogar, cerca de los negocios del interior
            </h2>
            <p className="text-base sm:text-lg text-[var(--public-ink)] font-bold leading-relaxed">
              Comprá a distintos proveedores en Capital. Nosotros recibimos, organizamos y consolidamos tus compras en CABA para trasladarlas juntas a tu localidad.
            </p>
          </div>

          {/* BLOQUE OFICIAL DE CUPOS LIMITADOS Y GRATUIDAD DE RECEPCIÓN / CONSOLIDACIÓN */}
          <div className="bg-[var(--public-warm)] border-2 border-[var(--public-line)] rounded-md p-6 sm:p-8 space-y-4 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[var(--public-line)] pb-6">
              <div className="space-y-2 max-w-2xl">
                <span className="inline-block bg-[var(--public-yellow)] text-[var(--public-black)] text-[.875rem] font-semibold px-3 py-1 rounded-md">
                  BENEFICIO LOGÍSTICO ESPECIAL
                </span>
                <h3 className="text-2xl font-semibold text-[var(--public-ink)]">
                  Recepción y consolidación sin cargo, con cupos limitados
                </h3>
                <p className="text-sm text-[var(--public-ink)] leading-relaxed">
                  Si comprás mercadería de forma recurrente en CABA, podés utilizar nuestro centro de recepción para reunir compras de distintos proveedores sin costo adicional por recepción ni consolidación. Trabajaremos con una cantidad limitada de clientes recurrentes para mantener el espacio, la organización y la calidad del servicio.
                </p>
              </div>

              <div className="bg-[var(--public-warm)] border border-[var(--public-line)] px-6 py-4 rounded-md text-center shrink-0 w-full md:w-auto">
                <span className="block text-[.875rem] text-[var(--public-muted)] font-bold">Punto Logístico CABA</span>
                <span className="block text-sm font-bold text-[var(--public-ink)] mt-0.5">Caracas 1101, Capital Federal</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <div className="text-[.875rem] text-[var(--public-ink)] font-bold">
                * Nota: La recepción, consolidación y custodia temporal de la mercadería no tienen costo adicional para clientes recurrentes. El traslado al interior se cotiza por bulto según sus características y el recorrido.
              </div>
              <a
                href="https://wa.me/5491125659686?text=Hola%2C%20quiero%20conocer%20c%C3%B3mo%20funcionar%C3%A1%20%2AEnv%C3%ADos%20Low%20Cost%20de%20Cuenta%20Hogar%2A%20para%20mi%20negocio/emprendimiento%20a%20partir%20de%20noviembre.%0A%0ARealizo%20compras%20en%20CABA%20y%20me%20interesa%20poder%20recibirlas%20en%20un%20mismo%20punto%2C%20consolidarlas%20sin%20cargo%20y%20trasladarlas%20juntas%20hasta%20mi%20localidad.%0A%0A%F0%9F%93%8D%20Mi%20localidad%20es%3A%0A%0A%C2%BFMe%20cuentan%20c%C3%B3mo%20funcionar%C3%A1%20el%20servicio%20para%20mi%20negocio%3F"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lowcost text-[.875rem] shrink-0"
              >
                <WhatsAppIcon className="w-4 h-4" />
                QUIERO CONOCER EL SERVICIO PARA MI NEGOCIO
              </a>
            </div>
          </div>

          {/* GRID DE BENEFICIOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-6 rounded-md space-y-3 hover:border-[var(--public-line)]">
              <div className="w-10 h-10 bg-[var(--public-warm)] text-[var(--public-ink)] rounded-md flex items-center justify-center font-bold border border-[var(--public-line)]">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[var(--public-ink)]">Un solo punto de recepción</h4>
              <p className="text-[.875rem] text-[var(--public-muted)] leading-relaxed">
                Recepción sin cargo en Caracas 1101, CABA para las entregas de todos tus proveedores.
              </p>
            </div>

            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-6 rounded-md space-y-3 hover:border-[var(--public-line)]">
              <div className="w-10 h-10 bg-[var(--public-warm)] text-[var(--public-ink)] rounded-md flex items-center justify-center font-bold border border-[var(--public-line)]">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[var(--public-ink)]">Compras organizadas</h4>
              <p className="text-[.875rem] text-[var(--public-muted)] leading-relaxed">
                Identificamos y agrupamos la mercadería correspondiente a tu comercio.
              </p>
            </div>

            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-6 rounded-md space-y-3 hover:border-[var(--public-line)]">
              <div className="w-10 h-10 bg-[var(--public-warm)] text-[var(--public-ink)] rounded-md flex items-center justify-center font-bold border border-[var(--public-line)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[var(--public-ink)]">Consolidación sin cargo</h4>
              <p className="text-[.875rem] text-[var(--public-muted)] leading-relaxed">
                Reunimos compras de distintos proveedores sin costo extra antes de enviarlas.
              </p>
            </div>

            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-6 rounded-md space-y-3 hover:border-[var(--public-line)]">
              <div className="w-10 h-10 bg-[var(--public-warm)] text-[var(--public-ink)] rounded-md flex items-center justify-center font-bold border border-[var(--public-line)]">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[var(--public-ink)]">Entrega en tu comercio</h4>
              <p className="text-[.875rem] text-[var(--public-muted)] leading-relaxed">
                Traslado cotizado por bulto según sus características y el recorrido.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 8. RUTAS Y LOCALIDADES ACTIVAS */}
      <section className="public-section">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-12">

          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-[.875rem] font-heading font-bold text-[var(--public-ink)]">
              <MapPin className="w-4 h-4 text-[var(--public-ink)]" /> Cobertura Logística
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-[var(--public-ink)]">
              Rutas y Localidades Previstas
            </h2>
            <p className="text-[var(--public-muted)] text-sm font-sans">
              Contamos con cronogramas y recorridos previstos desde el 25 de noviembre en las siguientes localidades del interior:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {["Lincoln", "Zavalía", "Los Toldos", "Chivilcoy", "O'Brien"].map((loc) => (
              <div key={loc} className="bg-[var(--public-warm)] border border-[var(--public-line)] p-5 rounded-md text-center space-y-1 hover:border-[var(--public-line)] transition-colors">
                <MapPin className="w-5 h-5 text-[var(--public-ink)] mx-auto mb-1" />
                <p className="font-heading font-bold text-[var(--public-ink)] text-base">{loc}</p>
                <p className="text-[.875rem] text-[var(--public-muted)] font-bold">Recorrido Previsto</p>
              </div>
            ))}
          </div>

          <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-4 rounded-md inline-block text-[.875rem] font-heading font-semibold text-[var(--public-muted)]">
            🌱 Estamos incorporando progresivamente nuevas localidades al mapa de recorridos.
          </div>

        </div>
      </section>

      {/* 9. SECCIÓN PREGUNTAS FRECUENTES (FAQ) */}
      <section id="preguntas-frecuentes" className="public-section scroll-mt-20">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-[.875rem] font-heading font-bold text-[var(--public-ink)]">
              <HelpCircle className="w-4 h-4 text-[var(--public-ink)]" /> Respuestas Claras
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-[var(--public-ink)]">
              Preguntas Frecuentes de Envíos
            </h2>
          </div>

          <EnviosFaq />
        </div>
      </section>

      {/* 10. COTIZACIÓN FINAL POR WHATSAPP */}
      <section className="py-20 lg:py-28 bg-[var(--public-warm)] text-[var(--public-ink)]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-transparent border border-[var(--public-line)] text-[var(--public-ink)] px-4 py-2 rounded-md text-[.875rem] font-heading font-semibold">
              <Truck className="w-4 h-4 text-[var(--public-ink)]" /> ESTIMÁ TU ENVÍO
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-semibold tracking-tight leading-tight !text-white">
              ¿Querés conocer el valor estimado?
            </h2>

            <p className="text-base sm:text-lg text-[var(--public-ink)] font-sans font-medium max-w-xl mx-auto leading-relaxed">
              Contanos tu localidad y qué tenés pensado comprar. Te orientamos por WhatsApp sobre cómo funcionará el servicio a partir del 25 de noviembre y el valor estimado del traslado por bulto.
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-4">
            <a
              href={whatsappUrlDefault}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 bg-[var(--public-yellow)] hover:bg-[#f2c300] text-[var(--public-black)] font-heading font-semibold px-10 py-5 rounded-md text-sm"
            >
              <WhatsAppIcon className="w-5 h-5" />
              CONSULTAR VALOR ESTIMADO POR WHATSAPP
            </a>

            <p className="text-[.875rem] text-[var(--public-muted)] font-sans">
              ⏱️ Atención directa de lunes a sábados de 08:00 a 20:00 hs.
            </p>
          </div>

        </div>
      </section>

      </main>
      <Footer />

    </div>
  );
}
