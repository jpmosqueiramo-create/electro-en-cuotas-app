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
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2
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
    <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] font-sans selection:bg-[#173E3B] selection:text-white">
      
      <Header />

      {/* HERO INSTITUCIONAL */}
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-[#DED8CF]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* COPY PRINCIPAL */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFDFC] border border-[#DED8CF] text-[#173E3B] text-xs font-heading font-medium tracking-wide shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#B44E2A]" /> Sobre Cuenta Hogar
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-heading font-bold tracking-tight leading-[1.12] text-[#173E3B]">
                Acercamos Capital Federal<br />
                <span className="text-[#B44E2A]">
                  al interior.
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-[#68706E] font-sans font-normal leading-[1.6]">
                Cuenta Hogar nació para hacer más simple comprar, financiar y recibir productos desde Capital Federal viviendo en el interior.
              </p>

              <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 lg:p-8 rounded-xl space-y-4 shadow-xs text-[#1F2928] text-sm lg:text-[15px] font-sans leading-[1.6]">
                <p>
                  Contamos con <strong className="text-[#173E3B] font-semibold">centro logístico propio en CABA</strong>, <strong className="text-[#173E3B] font-semibold">transporte propio</strong> y <strong className="text-[#173E3B] font-semibold">financiación propia</strong>. Esto nos permite acompañar todo el proceso: desde entender qué necesita cada cliente y gestionar la compra, hasta recibir el producto, organizar el traslado y realizar la entrega en su domicilio.
                </p>
                <p>
                  Trabajamos junto a <strong className="text-[#173E3B] font-semibold">vendedores afiliados</strong> de nuestras localidades, construyendo relaciones basadas en la confianza, el conocimiento del cliente y la atención cercana.
                </p>
                <p>
                  Además, a través de <strong className="text-[#B44E2A] font-semibold">Envíos Low Cost</strong>, recibimos compras realizadas en Capital Federal y las trasladamos al interior aprovechando nuestros recorridos programados, tanto para particulares como para emprendedores y comerciantes.
                </p>
              </div>
            </div>

            {/* TARJETA FOTOGRÁFICA */}
            <div className="lg:col-span-5 relative group">
              <div className="relative rounded-xl overflow-hidden border border-[#DED8CF] bg-[#F7F3EC]">
                <img 
                  src="/nosotros-filosofia-hero.jpg" 
                  alt="Cuenta Hogar: Acercamos Capital Federal al interior" 
                  className="w-full h-[400px] object-cover" 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#173E3B]/90 via-[#173E3B]/20 to-transparent flex items-end p-5">
                  <div className="bg-[#FFFDFC] border border-[#DED8CF] text-[#1F2928] p-4 rounded-lg w-full flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-8 w-auto object-contain bg-[#173E3B] p-1 rounded-md" />
                      <div>
                        <p className="text-xs font-heading font-bold uppercase text-[#173E3B] tracking-wider">Infraestructura Propia</p>
                        <p className="text-[12px] text-[#68706E] font-sans">Logística, Transporte y Financiación Directa</p>
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
      <section className="py-24 lg:py-28 bg-[#F7F3EC] border-b border-[#DED8CF]">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFFDFC] border border-[#DED8CF] text-[#173E3B] text-xs font-heading font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#173E3B]" /> Capacidades Propias
            </span>
            <h2 className="text-3xl lg:text-[40px] font-heading font-bold text-[#173E3B] leading-tight">
              Tres pilares de infraestructura propia
            </h2>
            <p className="text-[#68706E] text-base lg:text-[17px] font-sans leading-[1.6]">
              Estructura real para garantizar un servicio previsible, cercano y seguro.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-xl flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-[#F7F3EC] rounded-lg flex items-center justify-center text-[#173E3B] border border-[#DED8CF]">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-heading font-bold text-[#173E3B]">Centro logístico propio en CABA</h3>
                <p className="text-[#68706E] text-xs font-sans leading-relaxed">
                  Recibimos, organizamos y almacenamos temporalmente las compras antes de cada recorrido.
                </p>
              </div>
              <div className="pt-4 border-t border-[#DED8CF] text-xs font-heading font-semibold text-[#173E3B]">
                📍 Caracas 1101, CABA
              </div>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-xl flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-[#F7F3EC] rounded-lg flex items-center justify-center text-[#B44E2A] border border-[#DED8CF]">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-heading font-bold text-[#173E3B]">Transporte propio</h3>
                <p className="text-[#68706E] text-xs font-sans leading-relaxed">
                  Controlamos directamente la carga, los tiempos y las entregas para depender menos de terceros.
                </p>
              </div>
              <div className="pt-4 border-t border-[#DED8CF] text-xs font-heading font-semibold text-[#B44E2A]">
                🚚 Recorridos programados
              </div>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-xl flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-[#F7F3EC] rounded-lg flex items-center justify-center text-[#173E3B] border border-[#DED8CF]">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-heading font-bold text-[#173E3B]">Financiación propia</h3>
                <p className="text-[#68706E] text-xs font-sans leading-relaxed">
                  Evaluamos cada operación de manera cercana y ofrecemos alternativas simples para nuestros clientes.
                </p>
              </div>
              <div className="pt-4 border-t border-[#DED8CF] text-xs font-heading font-semibold text-[#173E3B]">
                💳 A sola firma sin bancos
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* BLOQUE SOBRE LA RED LOCAL */}
      <section className="py-24 lg:py-28 bg-[#F7F3EC] border-b border-[#DED8CF]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 lg:p-10 rounded-xl space-y-5 text-left shadow-xs">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7F3EC] border border-[#DED8CF] text-[#173E3B] text-xs font-heading font-semibold uppercase tracking-wider">
              <UserCheck className="w-3.5 h-3.5 text-[#173E3B]" /> Red de Afiliados
            </div>
            
            <h2 className="text-3xl lg:text-[36px] font-heading font-bold text-[#173E3B] leading-tight">
              Cerca de nuestros clientes
            </h2>

            <p className="text-[#68706E] text-base font-sans leading-[1.6]">
              Cuenta Hogar trabaja con <strong className="text-[#1F2928] font-semibold">vendedores afiliados</strong> que conocen sus localidades y acompañan la relación con cada cliente. La incorporación de nuevos vendedores afiliados se realiza de manera selectiva, priorizando la confianza y las referencias.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs text-[#1F2928] font-sans border-t border-[#DED8CF]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2F7D5C] shrink-0" />
                <span>Trato directo de vecino a vecino.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2F7D5C] shrink-0" />
                <span>Conocimiento real del territorio.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2F7D5C] shrink-0" />
                <span>Selección cuidadosa por referencias.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COBERTURA ACTUAL (SECCIÓN BLANCA HARMONIOSA) */}
      <section className="py-24 lg:py-28 bg-[#FFFDFC] text-[#1F2928] border-b border-[#DED8CF]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F7F3EC] text-[#173E3B] border border-[#DED8CF] text-xs font-heading font-bold uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-[#173E3B]" /> Presencia Territorial
            </span>
            
            <h2 className="text-3xl lg:text-[40px] font-heading font-bold text-[#173E3B] leading-tight">
              Hoy estamos presentes en
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {localidades.map((ciudad, idx) => (
                <div key={idx} className="bg-[#F7F3EC] border border-[#DED8CF] rounded-xl p-3.5 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#173E3B]" />
                  <span className="font-heading font-bold text-[#173E3B] text-sm">{ciudad}</span>
                </div>
              ))}
            </div>

            <p className="text-[#68706E] text-base font-sans leading-[1.6] pt-4 border-t border-[#DED8CF] font-medium">
              Seguimos ampliando nuestras rutas de manera progresiva, utilizando <strong className="text-[#1F2928] font-bold">Envíos Low Cost</strong> como puerta de entrada a nuevas localidades.
            </p>
          </div>
          
          <div className="flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
              <img 
                src="/mapa_bsas.png" 
                alt="Mapa de Cobertura Provincia de Buenos Aires" 
                className="w-full h-full object-contain relative z-10 drop-shadow-xs" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES (FAQ ACCORDION) */}
      <section className="py-24 lg:py-28 max-w-3xl mx-auto px-6 space-y-4">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#FFFDFC] text-[#173E3B] border border-[#DED8CF] px-3.5 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-[#173E3B]" /> Preguntas Frecuentes
          </div>
          <h3 className="text-3xl font-heading font-bold text-[#173E3B]">Resolvemos tus dudas sobre Cuenta Hogar</h3>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-[#FFFDFC] border border-[#DED8CF] rounded-xl overflow-hidden shadow-xs">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-5 text-left font-heading font-bold text-[#173E3B] flex justify-between items-center gap-4 hover:bg-[#F7F3EC]/50 transition-colors"
              >
                <span className="text-base">{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-[#173E3B] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#68706E] shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs text-[#68706E] font-sans border-t border-[#DED8CF] pt-3 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CALL TO ACTION FINAL */}
      <section className="py-16 max-w-4xl mx-auto px-6">
        <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 lg:p-12 rounded-xl text-center space-y-6 shadow-xs">
          <h3 className="text-3xl font-heading font-bold text-[#173E3B] tracking-tight">
            ¿Querés contactarte con nosotros?
          </h3>
          <p className="text-[#68706E] text-base font-sans max-w-xl mx-auto">
            Ingresá a nuestra web o comunicate por WhatsApp con el vendedor afiliado de tu localidad.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
            <Link
              href="/#contacto"
              className="btn-primary text-xs uppercase tracking-wider w-full sm:w-auto"
            >
              📝 Contanos qué necesitás
            </Link>
            <Link
              href="/flete"
              className="btn-lowcost text-xs uppercase tracking-wider w-full sm:w-auto"
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
