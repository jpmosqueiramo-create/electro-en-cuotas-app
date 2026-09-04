"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  Building2, 
  Truck, 
  CreditCard, 
  MapPin, 
  UserCheck, 
  Sparkles, 
  ArrowRight, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  PackageCheck,
  ShieldCheck
} from "lucide-react";
import { useState } from "react";

export default function NosotrosPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const localidades = [
    "Lincoln",
    "Zavalía",
    "Los Toldos",
    "Chivilcoy",
    "O'Brien"
  ];

  const faqs = [
    {
      q: "¿Cuenta Hogar es una financiera o una tienda online?",
      a: "Cuenta Hogar no es únicamente una tienda ni una financiera tradicional. Somos un puente directo entre Capital Federal y el interior que combina centro logístico propio en CABA, transporte propio, financiación propia y atención cercana a través de vendedores afiliados de cada localidad."
    },
    {
      q: "¿En qué consiste el servicio de Envíos Low Cost?",
      a: "Si ya realizaste tus compras de mercadería o equipos en Capital Federal por tu cuenta, podés enviarlas a nuestro centro logístico en CABA (Caracas 1101). Las recibimos, organizamos y trasladamos en nuestros recorridos programados directo a tu domicilio o negocio en el interior."
    },
    {
      q: "¿Cómo funciona la compra y financiación con mandato de compra?",
      a: "Nos contás qué producto necesitás. Buscamos las mejores alternativas en CABA, te enviamos la propuesta por WhatsApp y, una vez aceptada a sola firma, gestionamos la compra, la trasladamos con nuestro transporte propio y la pagás en cuotas."
    },
    {
      q: "¿Cómo se comunican con los clientes en cada localidad?",
      a: "Trabajamos junto a vendedores afiliados de cada localidad, construyendo relaciones cercanas y basadas en la confianza y la recomendación directa."
    },
    {
      q: "¿Qué sucede si el producto necesita servicio técnico?",
      a: "Ofrecemos acompañamiento logístico para ayudar a gestionar el traslado del equipo hacia el service oficial en Capital Federal. El acompañamiento técnico consiste en ayudar a gestionar el traslado al service oficial y no reemplaza la garantía correspondiente del producto."
    }
  ];

  return (
    <div className="min-h-screen bg-[#121316] text-zinc-100 font-sans selection:bg-[#fe5000] selection:text-white">
      
      <Header />

      {/* HERO INSTITUCIONAL PRINCIPAL */}
      <section className="relative overflow-hidden pt-16 pb-20 border-b border-zinc-800/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#fe5000]/15 via-[#121316] to-[#121316] -z-10" />
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Columna Izquierda: Copy Principal */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fe5000]/10 border border-[#fe5000]/30 text-[#fe5000] shadow-[0_0_15px_rgba(254,80,0,0.15)] text-xs font-bold tracking-widest uppercase">
                <Sparkles className="w-4 h-4" /> Sobre Cuenta Hogar
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white leading-tight">
                Acercamos Capital Federal<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-[#fe5000] to-amber-500">
                  al interior.
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-zinc-300 font-medium leading-relaxed">
                Cuenta Hogar nació para hacer más simple comprar, financiar y recibir productos desde Capital Federal viviendo en el interior.
              </p>

              <div className="bg-[#181920] border border-zinc-800 p-6 md:p-8 rounded-3xl space-y-4 shadow-xl text-zinc-300 text-sm md:text-base leading-relaxed">
                <p>
                  Contamos con <strong className="text-white font-bold">centro logístico propio en CABA</strong>, <strong className="text-white font-bold">transporte propio</strong> y <strong className="text-white font-bold">financiación propia</strong>. Esto nos permite acompañar todo el proceso: desde entender qué necesita cada cliente y gestionar la compra, hasta recibir el producto, organizar el traslado y realizar la entrega en su domicilio.
                </p>
                <p>
                  Trabajamos junto a <strong className="text-amber-400 font-bold">vendedores afiliados</strong> de nuestras localidades, construyendo relaciones basadas en la confianza, el conocimiento del cliente y la atención cercana.
                </p>
                <p>
                  Además, a través de <strong className="text-emerald-400 font-bold">Envíos Low Cost</strong>, recibimos compras realizadas en Capital Federal y las trasladamos al interior aprovechando nuestros recorridos programados, tanto para particulares como para emprendedores y comerciantes.
                </p>
              </div>
            </div>

            {/* Columna Derecha: Tarjeta Fotográfica de la Estructura */}
            <div className="lg:col-span-5 relative group">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-950">
                <img 
                  src="/nosotros-filosofia-hero.jpg" 
                  alt="Cuenta Hogar: Acercamos Capital Federal al interior" 
                  className="w-full h-[420px] object-cover group-hover:scale-105 transition-transform duration-700" 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end p-6">
                  <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 text-white p-5 rounded-2xl w-full flex items-center justify-between shadow-2xl">
                    <div className="flex items-center gap-3">
                      <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-9 w-auto object-contain" />
                      <div>
                        <p className="text-xs font-black uppercase text-white tracking-wider">Infraestructura Propia</p>
                        <p className="text-[11px] text-zinc-300 font-medium">Logística, Transporte y Financiación Directa</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* BLOQUE VISUAL CON LOS TRES DIFERENCIALES CLAVE */}
      <section className="py-20 bg-[#16171d] border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/30 text-xs font-black uppercase tracking-wider">
              ⭐ Capacidades Propias
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-white">
              Tres pilares de infraestructura propia
            </h2>
            <p className="text-zinc-400 text-base md:text-lg">
              Estructura real para garantizar un servicio previsible, cercano y seguro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Diferencial 1 */}
            <div className="bg-[#181920] border border-zinc-800 p-8 rounded-3xl shadow-xl flex flex-col justify-between hover:border-[#fe5000]/50 transition group">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-[#fe5000]/10 rounded-2xl flex items-center justify-center text-[#fe5000] border border-[#fe5000]/20 group-hover:scale-110 transition-transform">
                  <Building2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white">Centro logístico propio en CABA</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Recibimos, organizamos y almacenamos temporalmente las compras antes de cada recorrido.
                </p>
              </div>
              <div className="pt-6 border-t border-zinc-800/80 text-xs font-bold text-zinc-400">
                📍 Caracas 1101, CABA
              </div>
            </div>

            {/* Diferencial 2 */}
            <div className="bg-[#181920] border border-zinc-800 p-8 rounded-3xl shadow-xl flex flex-col justify-between hover:border-emerald-500/50 transition group">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Truck className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white">Transporte propio</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Controlamos directamente la carga, los tiempos y las entregas para depender menos de terceros.
                </p>
              </div>
              <div className="pt-6 border-t border-zinc-800/80 text-xs font-bold text-emerald-400">
                🚚 Recorridos programados
              </div>
            </div>

            {/* Diferencial 3 */}
            <div className="bg-[#181920] border border-zinc-800 p-8 rounded-3xl shadow-xl flex flex-col justify-between hover:border-amber-500/50 transition group">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-white">Financiación propia</h3>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Evaluamos cada operación de manera cercana y ofrecemos alternativas simples para nuestros clientes.
                </p>
              </div>
              <div className="pt-6 border-t border-zinc-800/80 text-xs font-bold text-amber-400">
                💳 A sola firma sin bancos
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* BLOQUE SOBRE LA RED LOCAL */}
      <section className="py-20 bg-[#121316] border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-r from-zinc-900 via-slate-900 to-zinc-900 border border-zinc-800 p-8 md:p-12 rounded-3xl shadow-2xl space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fe5000]/15 text-[#fe5000] border border-[#fe5000]/30 text-xs font-black uppercase tracking-wider">
              <UserCheck className="w-4 h-4" /> Red de Afiliados
            </div>
            
            <h2 className="text-3xl md:text-4xl font-black text-white">
              Cerca de nuestros clientes
            </h2>

            <p className="text-zinc-300 text-base md:text-lg leading-relaxed">
              Cuenta Hogar trabaja con <strong className="text-white font-bold">vendedores afiliados</strong> que conocen sus localidades y acompañan la relación con cada cliente. La incorporación de nuevos vendedores afiliados se realiza de manera selectiva, priorizando la confianza y las referencias.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs text-zinc-300 border-t border-zinc-800/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#fe5000] shrink-0" />
                <span>Trato directo de vecino a vecino.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#fe5000] shrink-0" />
                <span>Conocimiento real del territorio.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#fe5000] shrink-0" />
                <span>Selección cuidadosa por referencias.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COBERTURA ACTUAL (SECCIÓN BLANCA HARMONIOSA) */}
      <section className="py-24 bg-white text-zinc-900 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/30 text-xs font-black uppercase tracking-wider">
              📍 Presencia Territorial
            </span>
            
            <h2 className="text-3xl md:text-5xl font-black text-zinc-900 leading-tight">
              Hoy estamos presentes en
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {localidades.map((ciudad, idx) => (
                <div key={idx} className="bg-slate-50 border border-zinc-200 rounded-2xl p-4 flex items-center gap-3 hover:border-[#fe5000] hover:bg-orange-50/50 hover:shadow-md transition-all duration-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#fe5000] shadow-[0_0_8px_#fe5000] animate-pulse" />
                  <span className="font-bold text-zinc-900 text-sm md:text-base">{ciudad}</span>
                </div>
              ))}
            </div>

            <p className="text-zinc-600 text-base md:text-lg leading-relaxed pt-4 border-t border-zinc-200 font-medium">
              Seguimos ampliando nuestras rutas de manera progresiva, utilizando <strong className="text-zinc-900 font-bold">Envíos Low Cost</strong> como puerta de entrada a nuevas localidades.
            </p>
          </div>
          
          <div className="flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center group">
              <div className="absolute inset-0 bg-[#fe5000]/10 blur-3xl rounded-full group-hover:bg-[#fe5000]/20 transition-colors duration-500" />
              <img 
                src="/mapa_bsas.png" 
                alt="Mapa de Cobertura Provincia de Buenos Aires" 
                className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_20px_rgba(254,80,0,0.3)] hover:scale-105 transition-transform duration-500 ease-out" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES (FAQ ACCORDION) */}
      <section className="py-20 max-w-4xl mx-auto px-6 space-y-4">
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center gap-2 bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-[#fe5000]" /> Preguntas Frecuentes
          </div>
          <h3 className="text-3xl font-black text-white">Resolvemos tus dudas sobre Cuenta Hogar</h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-[#181920] border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-5 text-left font-bold text-white flex justify-between items-center gap-4 hover:bg-zinc-800/60 transition-colors"
              >
                <span className="text-base md:text-lg">{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-5 h-5 text-[#fe5000] shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-sm text-zinc-300 border-t border-zinc-800 pt-3 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION FINAL */}
      <section className="py-16 max-w-5xl mx-auto px-6">
        <div className="bg-gradient-to-r from-[#ff5e14] via-[#fe5000] to-[#e04600] text-white p-10 md:p-14 rounded-3xl text-center shadow-2xl space-y-6">
          <h3 className="text-3xl md:text-4xl font-black tracking-tight">
            ¿Querés contactarte con nosotros?
          </h3>
          <p className="text-white/90 text-base md:text-lg max-w-2xl mx-auto font-medium">
            Ingresá a nuestra web o comunicate por WhatsApp con el vendedor afiliado de tu localidad.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
            <Link
              href="/#contacto"
              className="bg-white hover:bg-slate-100 text-zinc-900 font-black px-8 py-4 rounded-2xl shadow-lg hover:scale-105 transition-all text-sm uppercase tracking-wider w-full sm:w-auto"
            >
              📝 Contanos qué necesitás
            </Link>
            <Link
              href="/flete"
              className="bg-slate-950 hover:bg-slate-900 text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:scale-105 transition-all text-sm uppercase tracking-wider w-full sm:w-auto border border-white/20"
            >
              🚚 Cotizar Envíos Low Cost
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
