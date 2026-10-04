"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  Building2, 
  Truck, 
  MapPin, 
  UserCheck, 
  Sparkles, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { useState } from "react";

export default function NosotrosPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "¿Cuenta Hogar vende productos?",
      a: "No. Cuenta Hogar brinda un servicio de gestión de compra mediante mandato. Nos contás qué necesitás, buscamos alternativas y te presentamos una propuesta con un plan de cuotas fijas. Si decidís avanzar, gestionamos la adquisición y coordinamos la logística hasta tu domicilio."
    },
    {
      q: "¿Tengo que saber exactamente qué producto quiero?",
      a: "No. Podés contarnos simplemente qué necesitás y te ayudamos a buscar alternativas. Si ya viste una marca, modelo, publicación o presupuesto, también podés enviárnoslo como referencia."
    },
    {
      q: "¿Puedo pedir un producto que no aparece en la web?",
      a: "Sí. Las opciones que mostramos son ejemplos orientativos. Podés consultarnos por otro producto aunque no aparezca publicado y evaluamos alternativas disponibles para tu solicitud."
    },
    {
      q: "¿Pedir una propuesta me obliga a avanzar?",
      a: "No. Primero conocés la propuesta y las condiciones del plan de cuotas. Si decidís avanzar, recién entonces formalizamos la gestión mediante mandato."
    },
    {
      q: "¿Evalúan cada solicitud antes de aprobarla?",
      a: "Sí. Antes de avanzar realizamos una evaluación de la solicitud y de las referencias disponibles. Cada operación se analiza individualmente."
    },
    {
      q: "¿Qué diferencia hay entre Servicio de Compra y Envíos Low Cost?",
      a: "Servicio de Compra es para quien todavía necesita resolver una compra y quiere que Cuenta Hogar gestione la operación completa, incluyendo el plan de cuotas y la entrega.\n\nEnvíos Low Cost es para quien compra por su cuenta en CABA y necesita recibir esa mercadería en el interior.\n\nEnvíos Low Cost estará disponible desde el 25 de noviembre de 2026."
    }
  ];

  return (
    <div className="min-h-screen bg-[#111318] text-white font-sans selection:bg-[#FFD21A] selection:text-black">
      
      <Header />

      {/* HERO INSTITUCIONAL */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-[#222530] bg-[#111318]">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#FFD21A]/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* COPY PRINCIPAL */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] text-xs font-mono font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5" /> SOBRE CUENTA HOGAR
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight leading-[1.08] text-white">
                Acercamos Capital Federal<br />
                <span className="text-[#FFD21A] block mt-1">
                  al interior.
                </span>
              </h1>
              
              <p className="text-base sm:text-lg text-[#D1D5DB] font-normal leading-relaxed">
                Cuenta Hogar nació para simplificar la gestión de compras por mandato, el traslado y la recepción de productos desde CABA hasta tu domicilio en el interior.
              </p>

              <div className="bg-[#161922] border border-[#2A2E3D] p-6 lg:p-8 rounded-2xl space-y-4 shadow-xl text-sm leading-relaxed text-[#9CA3AF]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-[#2A2E3D]">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase block">SERVICIO DE COMPRA</span>
                    <p className="text-xs text-white font-medium">Para quienes todavía necesitan resolver una compra en Capital.</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase block">ENVÍOS LOW COST</span>
                    <p className="text-xs text-white font-medium">Para quienes realizan sus propias compras en CABA y necesitan recibirlas en el interior (disponible desde 25/11/2026).</p>
                  </div>
                </div>
                <p>
                  Contamos con <strong className="text-white">centro de recepción y logística en CABA (Caracas 1101)</strong>, depósito y <strong className="text-white">unidad de transporte propia (Ford Transit techo elevado)</strong>. Esto nos permite acompañar todo el proceso: desde entender qué necesitás y gestionar la compra, hasta recibir el producto, organizar el traslado y realizar la entrega en puerta.
                </p>
                <p>
                  Trabajamos de la mano con <strong className="text-[#FFD21A]">vendedores afiliados</strong> en cada localidad de cobertura, asegurando un trato transparente, cercano y personalizado.
                </p>
              </div>
            </div>

            {/* FOTOGRAFÍA INSTITUCIONAL DE LA OPERACIÓN REAL */}
            <div className="lg:col-span-5 relative group">
              <div className="relative rounded-2xl overflow-hidden border border-[#2D323E] bg-[#090A0D] shadow-2xl">
                <img 
                  src="/flota-cuenta-hogar.jpg" 
                  alt="Unidad de transporte propia Ford Transit techo elevado Cuenta Hogar" 
                  className="w-full h-[380px] sm:h-[440px] object-cover" 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-transparent flex items-end p-5">
                  <div className="bg-[#161922]/95 border border-[#2A2E3D] text-white p-4 rounded-xl w-full backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <div className="p-1 bg-[#111318] border border-[#FFD21A]/40 rounded-lg shrink-0">
                        <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar" className="h-7 w-auto object-contain" />
                      </div>
                      <div>
                        <p className="text-xs font-mono font-bold uppercase text-[#FFD21A]">Infraestructura Propia</p>
                        <p className="text-[11px] text-[#9CA3AF]">Centro en CABA · Ford Transit Techo Elevado · Entrega en Domicilio</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* TRES PILARES DE INFRAESTRUCTURA */}
      <section className="py-20 lg:py-24 bg-[#0E1015] border-b border-[#222530]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-block bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
              CAPACIDADES OPERATIVAS REALES
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white">
              Infraestructura propia para brindarte previsibilidad
            </h2>
            <p className="text-sm text-[#9CA3AF]">
              Operaciones concretas y equipamiento dedicado para resolver tu necesidad de punta a punta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#161922] border border-[#2A2E3D] p-8 rounded-2xl space-y-4 shadow-xl">
              <div className="w-12 h-12 bg-[#111318] text-[#FFD21A] rounded-xl flex items-center justify-center font-bold border border-[#FFD21A]/30">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Centro de Recepción en CABA</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Ubicado estratégicamente en Caracas 1101. Recibimos, identificamos y custodiamos la mercadería previa a su salida hacia el interior.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#2A2E3D] p-8 rounded-2xl space-y-4 shadow-xl">
              <div className="w-12 h-12 bg-[#111318] text-[#FFD21A] rounded-xl flex items-center justify-center font-bold border border-[#FFD21A]/30">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Transporte Propio</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Operación logística organizada. Unidad de transporte propia (Ford Transit techo elevado) para traslados seguros en nuestros recorridos programados.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#2A2E3D] p-8 rounded-2xl space-y-4 shadow-xl">
              <div className="w-12 h-12 bg-[#111318] text-[#FFD21A] rounded-xl flex items-center justify-center font-bold border border-[#FFD21A]/30">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">Red de Vendedores Afiliados</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Atención directa en cada localidad por parte de vendedores afiliados que conocen a los vecinos y sus necesidades.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* SECCIÓN PREGUNTAS FRECUENTES */}
      <section className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
          
          <div className="text-center space-y-3">
            <span className="inline-block bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
              PREGUNTAS FRECUENTES
            </span>
            <h2 className="text-3xl font-extrabold text-white">
              Respuestas claras a tus dudas
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-[#161922] border border-[#2A2E3D] rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-6 text-left font-bold text-white flex justify-between items-center gap-4 hover:bg-[#1A1D26] transition-colors"
                >
                  <span className="text-sm sm:text-base">{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-5 h-5 text-[#FFD21A] shrink-0" /> : <ChevronDown className="w-5 h-5 text-[#9CA3AF] shrink-0" />}
                </button>

                {openFaq === idx && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-[#9CA3AF] leading-relaxed border-t border-[#222530] pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ENLACES A FAQ ESPECÍFICAS DE SERVICIOS */}
          <div className="pt-8 border-t border-[#222530] text-center space-y-4">
            <p className="text-sm font-bold text-white">
              ¿Tenés dudas específicas sobre un servicio?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/servicio-de-compra#preguntas-frecuentes" 
                className="inline-flex items-center gap-2 bg-[#161922] hover:bg-[#222530] text-[#FFD21A] border border-[#FFD21A]/40 text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-sm"
              >
                <span>VER PREGUNTAS DEL SERVICIO DE COMPRA</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link 
                href="/envios#preguntas-frecuentes" 
                className="inline-flex items-center gap-2 bg-[#161922] hover:bg-[#222530] text-[#FFD21A] border border-[#FFD21A]/40 text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-sm"
              >
                <span>VER PREGUNTAS DE ENVÍOS LOW COST</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* CTA FINAL */}
          <div className="pt-8 text-center">
            <Link 
              href="/#contacto" 
              className="inline-flex items-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition-all shadow-lg shadow-[#FFD21A]/20"
            >
              <span>Solicitar Cotización de Compra</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      <Footer />

    </div>
  );
}
