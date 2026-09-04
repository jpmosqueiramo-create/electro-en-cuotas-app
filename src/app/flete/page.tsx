import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Clock, Truck, Package, ShieldCheck, MapPin, FileCheck, CalendarClock, Scale, Navigation } from "lucide-react";

export const metadata: Metadata = {
  title: "Envíos Low Cost CABA al Interior | Cuenta Hogar",
  description: "Servicio de Envíos Low Cost desde Buenos Aires para el interior. Recepción en CABA (Caracas 1101), consolidación de bultos y traslado seguro directo a domicilio.",
  keywords: [
    "Envíos Low Cost CABA",
    "transporte propio buenos aires",
    "comprar en once envio al interior",
    "traslado de compras caba",
    "consolidacion sin cargo caba",
    "fletes y encomiendas buenos aires"
  ]
};

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.419c-1.776 0-3.517-.476-5.044-1.377l-.362-.215-3.744.982.999-3.648-.236-.375c-.991-1.574-1.513-3.612-1.513-5.696 0-5.836 4.75-10.587 10.587-10.587 2.828 0 5.486 1.1 7.485 3.101 1.999 2 3.098 4.658 3.097 7.487 0 5.837-4.75 10.588-10.587 10.588m0-20.709c-6.726 0-12.2 5.474-12.2 12.2 0 2.147.56 4.246 1.624 6.091l-1.724 6.295 6.442-1.69c1.782.971 3.792 1.485 5.858 1.485 6.726 0 12.2-5.474 12.2-12.2 0-3.26-1.27-6.324-3.578-8.631-2.308-2.307-5.37-3.576-8.622-3.576" />
    </svg>
  );
}

export default function FletePage() {
  const whatsappUrl = "https://wa.me/5491125659686?text=Hola!%20Quiero%20solicitar%20una%20cotizaci%C3%B3n%20para%20un%20*Env%C3%ADo%20Low%20Cost*%20desde%20CABA%20al%20interior.";

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] font-sans selection:bg-[#173E3B] selection:text-white">
      
      <Header />

      {/* HERO SECTION */}
      <section className="pt-16 pb-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16">
          
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-[#FFFDFC] border border-[#DED8CF] text-[#B44E2A] px-3.5 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider shadow-xs">
              <Truck className="w-3.5 h-3.5" /> Cuidado y Traslado Directo desde CABA
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-heading font-bold tracking-tight text-[#173E3B] leading-[1.12]">
              Envíos Low Cost: <span className="text-[#B44E2A]">Cuidamos y traemos tus compras de CABA a tu hogar.</span>
            </h1>
            
            <p className="text-base lg:text-[17px] text-[#68706E] font-sans leading-[1.6] bg-[#FFFDFC] p-6 lg:p-8 rounded-xl border border-[#DED8CF] shadow-xs">
              Si ya compraste tu tecnología, electrodomésticos o mercadería en Capital Federal, cuidamos tu inversión desde el primer instante. Somos tu puente logístico seguro: recibimos tu paquete en nuestro local de CABA (<strong className="text-[#1F2928] font-semibold">Caracas 1101</strong>) y lo trasladamos con transporte propio directo a tu domicilio en el interior.
            </p>

            <div className="pt-2 flex flex-col items-start gap-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lowcost text-xs uppercase tracking-wider w-full sm:w-auto"
              >
                <WhatsAppIcon className="w-4 h-4" />
                Cotizar Envío Low Cost en WhatsApp
              </a>

              <div className="bg-[#FFFDFC] border border-[#DED8CF] text-[#1F2928] p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed shadow-xs w-full">
                <Clock className="w-4 h-4 text-[#B44E2A] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-heading font-bold text-[#173E3B] text-xs mb-0.5">⏱️ Respuesta en las próximas horas</p>
                  <p className="text-[#68706E]">
                    Al hacer clic se abrirá WhatsApp con la info requerida para cotizar correctamente. Nuestro equipo te responderá con el presupuesto exacto en las próximas horas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative group">
            <div className="relative rounded-xl overflow-hidden border border-[#DED8CF] bg-[#F7F3EC]">
              <img 
                src="/flota-cuenta-hogar.jpg" 
                alt="Transporte propio Logística Cuenta Hogar" 
                className="w-full h-[380px] object-cover" 
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#173E3B]/90 via-transparent to-transparent flex items-end p-5">
                <div className="bg-[#FFFDFC] border border-[#DED8CF] text-[#1F2928] p-4 rounded-xl w-full flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#B44E2A] rounded-lg flex items-center justify-center text-white shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-heading font-bold uppercase text-[#173E3B] tracking-wider">Transporte propio Cuenta Hogar</p>
                      <p className="text-[12px] text-[#68706E] font-sans">Unidades acondicionadas y recorridos programados</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ¿CÓMO FUNCIONA? */}
        <div className="mb-20">
          <div className="text-center mb-10 max-w-2xl mx-auto space-y-2">
            <h2 className="text-3xl font-heading font-bold text-[#173E3B]">¿Cómo funciona?</h2>
            <p className="text-[#68706E] text-sm font-sans">Un circuito simple y transparente en 4 pasos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-xl flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-10 h-10 bg-[#F7F3EC] rounded-lg flex items-center justify-center mb-4 border border-[#DED8CF] text-[#B44E2A] font-heading font-bold text-base">
                  1
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-[#B44E2A]" />
                  <h3 className="text-base font-heading font-bold text-[#173E3B]">Comprás y enviás acá</h3>
                </div>
                <p className="text-[#68706E] text-xs font-sans leading-relaxed">
                  Realizás tu compra y pedís que la entreguen en nuestro local en CABA (<strong className="text-[#1F2928] font-medium">Caracas 1101</strong>). La factura debe estar a tu nombre.
                </p>
              </div>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-xl flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-10 h-10 bg-[#F7F3EC] rounded-lg flex items-center justify-center mb-4 border border-[#DED8CF] text-[#B44E2A] font-heading font-bold text-base">
                  2
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-[#B44E2A]" />
                  <h3 className="text-base font-heading font-bold text-[#173E3B]">Recibimos tu paquete</h3>
                </div>
                <p className="text-[#68706E] text-xs font-sans leading-relaxed">
                  Acopiamos tu mercadería de forma segura en nuestro depósito antes del recorrido.
                </p>
              </div>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-xl flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-10 h-10 bg-[#F7F3EC] rounded-lg flex items-center justify-center mb-4 border border-[#DED8CF] text-[#B44E2A] font-heading font-bold text-base">
                  3
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#B44E2A]" />
                  <h3 className="text-base font-heading font-bold text-[#173E3B]">Traslado Protegido</h3>
                </div>
                <p className="text-[#68706E] text-xs font-sans leading-relaxed">
                  Viajamos 100% en regla emitiendo el Remito Oficial de Traslado a nombre de nuestra empresa.
                </p>
              </div>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-xl flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-10 h-10 bg-[#F7F3EC] rounded-lg flex items-center justify-center mb-4 border border-[#DED8CF] text-[#B44E2A] font-heading font-bold text-base">
                  4
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-[#B44E2A]" />
                  <h3 className="text-base font-heading font-bold text-[#173E3B]">Entrega en tu puerta</h3>
                </div>
                <p className="text-[#68706E] text-xs font-sans leading-relaxed">
                  Bajamos la compra en tu casa o comercio, con el trato directo de siempre.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* REQUISITOS OPERATIVOS */}
        <div className="mb-20 bg-[#FFFDFC] border border-[#DED8CF] rounded-xl p-8 lg:p-10 shadow-xs">
          <div className="text-center mb-8 max-w-2xl mx-auto space-y-1.5">
            <h2 className="text-2xl font-heading font-bold text-[#173E3B]">Requisitos Operativos</h2>
            <p className="text-[#68706E] text-xs font-sans">Condiciones obligatorias para garantizar el traslado legal y sin contratiempos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-[#F7F3EC] border border-[#DED8CF] p-5 rounded-lg space-y-2">
              <div className="w-8 h-8 bg-[#FFFDFC] rounded-md flex items-center justify-center text-[#B44E2A] font-bold border border-[#DED8CF]">
                <FileCheck className="w-4 h-4" />
              </div>
              <h4 className="font-heading font-bold text-[#173E3B] text-sm">Factura Original</h4>
              <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                El comprobante debe emitirse a tu DNI para respaldar la carga en la ruta ante controles.
              </p>
            </div>

            <div className="bg-[#F7F3EC] border border-[#DED8CF] p-5 rounded-lg space-y-2">
              <div className="w-8 h-8 bg-[#FFFDFC] rounded-md flex items-center justify-center text-[#B44E2A] font-bold border border-[#DED8CF]">
                <CalendarClock className="w-4 h-4" />
              </div>
              <h4 className="font-heading font-bold text-[#173E3B] text-sm">Aviso de Entrega</h4>
              <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                Debés notificarnos qué día el vendedor dejará la caja en nuestro local para esperarlo.
              </p>
            </div>

            <div className="bg-[#F7F3EC] border border-[#DED8CF] p-5 rounded-lg space-y-2">
              <div className="w-8 h-8 bg-[#FFFDFC] rounded-md flex items-center justify-center text-[#B44E2A] font-bold border border-[#DED8CF]">
                <Scale className="w-4 h-4" />
              </div>
              <h4 className="font-heading font-bold text-[#173E3B] text-sm">Topes de Carga</h4>
              <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                Operamos debajo de los topes provinciales para evitar demoras administrativas.
              </p>
            </div>

          </div>
        </div>

        {/* UBICACIÓN CABA */}
        <div className="mb-20 bg-[#FFFDFC] border border-[#DED8CF] p-8 lg:p-10 rounded-xl shadow-xs space-y-6">
          <div className="text-center space-y-1.5 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-[#F7F3EC] border border-[#DED8CF] text-[#B44E2A] px-3.5 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider">
              <Navigation className="w-3.5 h-3.5" /> Centro de Recepción y Domicilio Legal
            </div>
            <h2 className="text-2xl font-heading font-bold text-[#173E3B]">Ubicación en Capital Federal</h2>
            <p className="text-[#68706E] text-xs font-sans">
              Nuestro local y punto de acopio está ubicado en <strong className="text-[#1F2928] font-semibold">Caracas 1101, CABA</strong>.
            </p>
          </div>

          <div className="w-full rounded-xl overflow-hidden border border-[#DED8CF]">
            <iframe
              title="Ubicación Centro de Recepción CABA - Caracas 1101"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.473539827663!2d-58.46820522346083!3d-34.61747805822394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcc9f3a61c572b%3A0x6b2e35a1408018e6!2sCaracas%201101%2C%20C1416AOS%20CABA!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
              width="100%"
              height="300"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-[300px] rounded-xl"
            />
          </div>
        </div>

        {/* CTA FINAL */}
        <div className="max-w-4xl mx-auto bg-[#FFFDFC] border border-[#DED8CF] text-[#1F2928] p-8 lg:p-12 rounded-xl text-center shadow-xs space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl lg:text-3xl font-heading font-bold text-[#173E3B]">
              Dirección de Recepción: <span className="text-[#B44E2A]">Caracas 1101, CABA.</span>
            </h3>
            <p className="text-[#68706E] text-sm font-sans max-w-xl mx-auto">
              Coordiná la entrega de tus paquetes directamente con nuestro equipo administrativo vía WhatsApp.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-lowcost text-xs uppercase tracking-wider w-full sm:w-auto"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Avisar de un envío / Cotizar Envío Low Cost
            </a>
            <p className="text-xs text-[#68706E] font-sans">
              ⏱️ Te responderemos con el presupuesto de traslado en las próximas horas vía WhatsApp.
            </p>
          </div>
        </div>

      </section>

      <Footer />

    </div>
  );
}
