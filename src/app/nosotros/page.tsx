"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, RotateCcw, CreditCard, ShieldCheck, ShoppingBag, MapPin, HelpCircle, ChevronDown, ChevronUp, Sparkles, HeartHandshake, Truck } from "lucide-react";
import { useState } from "react";

export default function NosotrosPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const localidades = [
    "Lincoln",
    "Zavalía",
    "Chivilcoy",
    "Bragado",
    "Los Toldos",
    "Zonas aledañas"
  ];

  const faqs = [
    {
      q: "¿Ofrecen el servicio de Traslado de Compras si ya compré en CABA por mi cuenta?",
      a: "Sí, absolutamente. Si ya compraste tu tecnología o electrodoméstico por tu cuenta en Capital Federal y no necesitás financiación, podés pedir que entreguen la caja en nuestro Centro de Recepción en Caracas 1101, CABA. Nosotros lo recibimos, lo custodiamos y lo trasladamos con máxima protección directo a tu puerta en el interior."
    },
    {
      q: "¿Cuáles son los requisitos para acceder a una compra financiada?",
      a: "El análisis es a sola firma. Solicitamos tu DNI, un comprobante de servicio o domicilio y la información de contacto básica. Buscamos dar acceso real a familias, trabajadores y emprendedores sin complicaciones bancarias."
    },
    {
      q: "¿Cómo es el proceso de entrega de los productos?",
      a: "Coordinamos la entrega directa en tu domicilio. Nosotros mismos nos encargamos de retirar el producto, verificar su correcto embalaje y llevártelo a la puerta de tu casa en Lincoln, Zavalía, Chivilcoy, Bragado, Los Toldos y zonas aledañas."
    },
    {
      q: "¿Qué sucede si el producto presenta algún inconveniente técnico?",
      a: "Contás con nuestro respaldo. Si bien no realizamos reparaciones técnicas propias ni abrimos equipos, actuamos como tus representantes para gestionar la garantía oficial ante el fabricante o vendedor originario y asumir el traslado logístico."
    },
    {
      q: "¿Cómo se abonan las cuotas mensuales?",
      a: "Disponemos de cobradores domiciliarios de confianza en tu localidad, o bien podés abonar de forma digital por transferencia bancaria o Mercado Pago."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 font-sans selection:bg-[#fe5000] selection:text-white">
      
      <Header />

      {/* HERO INSTITUCIONAL */}
      <section className="pt-16 pb-16 max-w-7xl mx-auto px-6">
        
        {/* ENCABEZADO Y FILOSOFÍA CON SHOWCASE DE IMAGEN CONCEPTUAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16">
          
          {/* Columna Izquierda: Copy & Filosofía */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-[#fe5000]/10 border border-[#fe5000]/20 text-[#fe5000] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Nuestra Filosofía
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-zinc-900 leading-tight">
              De nuestra mano a tu casa.
            </h1>
            
            <p className="text-base sm:text-lg text-zinc-600 font-normal leading-relaxed bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm text-justify">
              Sabemos que el acceso a la tecnología a veces se hace cuesta arriba por las trabas bancarias. <strong className="text-zinc-900 font-bold">Cuenta Hogar</strong> nació con un propósito claro: <span className="text-[#fe5000] font-bold">ser el puente entre lo que necesitás y tu capacidad de pago</span>. Nos basamos en la confianza, la palabra y el trato directo. Operamos con capital propio para gestionar tus compras y entregarte soluciones reales, sin intermediarios financieros.
            </p>
          </div>

          {/* Columna Derecha: Tarjeta Fotográfica Conceptual */}
          <div className="lg:col-span-6 relative group">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 bg-white">
              <img 
                src="/nosotros-filosofia-hero.jpg" 
                alt="Cuenta Hogar: De nuestra mano a tu casa" 
                className="w-full h-[400px] object-cover group-hover:scale-105 transition-transform duration-700" 
              />
              
              {/* Overlay inferior con badge de legitimidad */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 text-white p-4 rounded-2xl w-full flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-3">
                    <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-8 w-auto object-contain" />
                    <div>
                      <p className="text-xs font-black uppercase text-white tracking-wide">Trato Directo y Confianza</p>
                      <p className="text-[11px] text-zinc-300 font-medium">Financiación propia a sola firma</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#fe5000]/20 text-[#fe5000] border border-[#fe5000]/40 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    Sin Bancos
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 3 PILARES PRINCIPALES */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-zinc-900">Los 3 Pilares de Nuestro Servicio</h2>
            <p className="text-zinc-500 text-sm font-medium mt-1">Diseñados para facilitarte la vida en cada etapa de tu compra</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Pilar 1 */}
            <div className="bg-white border border-zinc-200 p-8 rounded-3xl flex flex-col items-start hover:border-[#fe5000]/60 hover:shadow-xl transition-all duration-300 shadow-sm relative group">
              <div className="w-12 h-12 bg-[#fe5000]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#fe5000]/20 text-[#fe5000] group-hover:scale-110 transition-transform font-black text-lg">
                1
              </div>
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-6 h-6 text-[#fe5000]" />
                <h3 className="text-xl font-black text-zinc-900">Compramos por vos</h3>
              </div>
              <span className="text-xs font-bold text-[#fe5000] bg-[#fe5000]/10 px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                Gestión de Compra
              </span>
              <p className="text-zinc-600 leading-relaxed font-normal text-sm text-justify">
                ¿Buscás un celular nuevo, un televisor o una herramienta de trabajo? Vos nos decís qué modelo querés y nosotros ponemos el capital para comprarlo a tu nombre. Nos encargamos de buscarlo, pagarlo y llevártelo hasta la puerta de tu casa. Sin trámites pesados ni vueltas.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="bg-white border border-zinc-200 p-8 rounded-3xl flex flex-col items-start hover:border-[#fe5000]/60 hover:shadow-xl transition-all duration-300 shadow-sm relative group">
              <div className="w-12 h-12 bg-[#fe5000]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#fe5000]/20 text-[#fe5000] group-hover:scale-110 transition-transform font-black text-lg">
                2
              </div>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-6 h-6 text-[#fe5000]" />
                <h3 className="text-xl font-black text-zinc-900">Te damos la facilidad</h3>
              </div>
              <span className="text-xs font-bold text-[#fe5000] bg-[#fe5000]/10 px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                Financiación Propia
              </span>
              <p className="text-zinc-600 leading-relaxed font-normal text-sm text-justify">
                Olvidate de los límites de las tarjetas de crédito o de los requisitos imposibles de los bancos. Nos sentamos con vos, analizamos tu situación a sola firma y te armamos un plan de cuotas fijas en pesos. Tu palabra y tu compromiso son tu mejor crédito con nosotros.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="bg-white border border-zinc-200 p-8 rounded-3xl flex flex-col items-start hover:border-[#fe5000]/60 hover:shadow-xl transition-all duration-300 shadow-sm relative group">
              <div className="w-12 h-12 bg-[#fe5000]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#fe5000]/20 text-[#fe5000] group-hover:scale-110 transition-transform font-black text-lg">
                3
              </div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-6 h-6 text-[#fe5000]" />
                <h3 className="text-xl font-black text-zinc-900">Te respaldamos siempre</h3>
              </div>
              <span className="text-xs font-bold text-[#fe5000] bg-[#fe5000]/10 px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                Gestión de Soporte Técnico
              </span>
              <p className="text-zinc-600 leading-relaxed font-normal text-sm text-justify">
                Si el equipo que te gestionamos llega a tener una falla de fábrica, no vas a renegar solo. Nosotros no abrimos los equipos ni hacemos reparaciones técnicas, pero actuamos como tus representantes. Nos encargamos de contactar al fabricante, gestionar la garantía y mediar con el vendedor original para que tengas una solución rápida. Vos nos avisás, nosotros nos ocupamos del problema.
              </p>
            </div>

          </div>
        </div>

        {/* SECCIÓN DESTACADA: GARANTÍA DE GESTIÓN Y PROPÓSITO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          
          <div className="bg-gradient-to-br from-zinc-900 to-slate-900 border border-zinc-800 p-8 md:p-10 rounded-3xl text-white shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-[#fe5000]/20 border border-[#fe5000]/30 text-[#fe5000] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Respaldo Total
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white">Nuestra Garantía de Gestión</h3>
              <p className="text-zinc-300 text-sm leading-relaxed text-justify">
                No te dejamos solo. Si tu equipo presenta fallas de fábrica, nuestro servicio de Soporte Técnico Integral se encarga de mediar directamente con el fabricante o el vendedor original. Nosotros hacemos los reclamos y el seguimiento logístico para que vos no tengas que moverte.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-zinc-800 text-xs text-zinc-400 font-medium">
              <Truck className="w-4 h-4 text-[#fe5000]" /> Servicio logístico de traslado y retorno incluido a CABA.
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#fe5000] to-[#e04600] p-8 md:p-10 rounded-3xl text-white shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-white/20 border border-white/30 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <HeartHandshake className="w-3.5 h-3.5" /> Compromiso de Confianza
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white">¿En qué te ayudamos?</h3>
              <p className="text-white/90 text-sm leading-relaxed text-justify">
                En Cuenta Hogar hacemos que tener lo que necesitás sea fácil, seguro y en cuotas que podés pagar. No somos un banco ni una cadena de electrodomésticos; somos tus gestores de confianza.
              </p>
            </div>
            <div className="pt-4 border-t border-white/20 text-xs text-white/80 font-bold uppercase tracking-wider">
              ✓ Trato directo • Cuotas fijas en pesos • A sola firma
            </div>
          </div>

        </div>

        {/* SECCIÓN DEDICADA: TRASLADO DE COMPRAS CABA AL INTERIOR */}
        <div className="bg-[#181920] border border-zinc-800 rounded-3xl p-8 md:p-12 mb-20 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#fe5000]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#fe5000]/20 border border-[#fe5000]/30 text-[#fe5000] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                <Truck className="w-4 h-4" /> Servicio Logístico Exclusivo
              </div>
              
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                Traslado de Compras: <span className="text-[#fe5000]">De CABA a la Puerta de tu Casa en el Interior</span>
              </h2>
              
              <p className="text-zinc-300 text-sm md:text-base leading-relaxed text-justify">
                Si ya compraste tu tecnología o electrodomésticos por tu cuenta en Capital Federal y no requerís nuestra financiación, no tenés que preocuparte por el riesgo ni por cómo traerlo. En <strong className="text-white">Cuenta Hogar</strong> disponemos de nuestro Centro de Recepción en <strong className="text-[#fe5000]">Caracas 1101, CABA</strong>. Recibimos tu compra, la custodiamos en depósito y la trasladamos con máxima protección y seguimiento directo hasta la puerta de tu hogar en el interior.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs text-zinc-300">
                <div className="flex items-center gap-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-[#fe5000]"></span>
                  <span className="font-bold text-white">Recepción en Caracas 1101, CABA</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="font-bold text-white">Cuidado y Protección Integral</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="font-bold text-white">Remito Oficial R en Regla</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-center justify-center space-y-4 bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl text-center">
              <div className="w-14 h-14 bg-[#fe5000]/10 rounded-2xl flex items-center justify-center text-[#fe5000]">
                <Truck className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-white text-base">¿Tenés una compra lista en CABA?</h3>
              <p className="text-xs text-zinc-400">
                Conocé cómo funciona el circuito de recepción y cotizá el traslado directo de tu paquete.
              </p>
              <Link
                href="/flete"
                className="inline-flex items-center justify-center gap-2 bg-[#fe5000] hover:bg-orange-600 text-white font-black px-6 py-3 rounded-xl transition-all text-xs uppercase tracking-wider w-full shadow-lg"
              >
                🚚 Ver Servicio de Traslado de Compras
              </Link>
            </div>
          </div>
        </div>

        {/* COBERTURA GEOGRÁFICA */}
        <div className="bg-white border border-zinc-200 p-8 md:p-12 rounded-3xl text-zinc-900 shadow-sm relative overflow-hidden mb-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-[#fe5000]/10 text-[#fe5000] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-[#fe5000]/20">
                <MapPin className="w-3.5 h-3.5" /> Red de Presencia y Entregas Locales
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-zinc-900 leading-tight">
                Cerca tuyo en cada localidad
              </h3>
              <p className="text-zinc-600 text-sm leading-relaxed">
                Nuestra Red de Afiliados e Inspectores de Cobranza opera con presencia directa y atención personalizada en los siguientes puntos principales y sus zonas de influencia:
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
              {localidades.map((loc, idx) => (
                <div key={idx} className="bg-slate-50 border border-zinc-200 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold text-zinc-900 shadow-sm hover:border-[#fe5000] transition-colors">
                  <span className="w-2 h-2 rounded-full bg-[#fe5000]"></span>
                  {loc}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PREGUNTAS FRECUENTES (FAQ ACCORDION) */}
        <div className="max-w-4xl mx-auto space-y-4 mb-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-zinc-200 text-zinc-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <HelpCircle className="w-3.5 h-3.5" /> Preguntas Frecuentes
            </div>
            <h3 className="text-3xl font-black text-zinc-900">Resolvemos tus dudas</h3>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-bold text-zinc-900 flex justify-between items-center gap-4 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-base">{faq.q}</span>
                  {openFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-[#fe5000] flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-sm text-zinc-600 border-t border-zinc-100 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CALL TO ACTION FINAL */}
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-[#ff6b1a] via-[#fe5000] to-[#e04600] text-white p-10 md:p-14 rounded-3xl text-center shadow-xl space-y-6">
          <h3 className="text-3xl md:text-4xl font-black tracking-tight">
            ¿Listo para estrenar tu próximo equipo?
          </h3>
          <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto font-medium">
            Ingresá a nuestro catálogo o solicitá tu plan a medida en menos de 2 minutos.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
            <Link
              href="/productos"
              className="bg-white hover:bg-slate-100 text-zinc-900 font-black px-8 py-4 rounded-2xl shadow-lg hover:scale-105 transition-all text-sm uppercase tracking-wider w-full sm:w-auto"
            >
              🛒 Explorar Catálogo
            </Link>
            <Link
              href="/solicitar"
              className="bg-slate-900 hover:bg-slate-950 text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:scale-105 transition-all text-sm uppercase tracking-wider w-full sm:w-auto border border-white/20"
            >
              📝 Solicitar Crédito A Medida
            </Link>
          </div>
        </div>

      </section>

    
      <Footer />
    </div>
  );
}