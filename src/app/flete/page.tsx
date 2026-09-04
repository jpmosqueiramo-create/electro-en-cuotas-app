import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, RotateCcw, Clock, Truck, Package, ShieldCheck, MapPin, FileCheck, CalendarClock, Scale, MessageCircle, Navigation } from "lucide-react";

export const metadata: Metadata = {
  title: "Comisionista Capital a Provincia y Traslado de Compras CABA | Cuenta Hogar",
  description: "Servicio de comisionista en Buenos Aires para el interior. Retiro de compras en Once, comisiones puerta a puerta, encomiendas y traslado seguro de mercadería.",
  keywords: [
    "comisionista capital a provincia",
    "comisionistas en buenos aires para el interior",
    "viajes y comisiones a capital federal",
    "servicio de comisiones puerta a puerta",
    "comprar en once desde el interior comisionista",
    "comprador personal en buenos aires",
    "quien hace mandatos de compra en caba",
    "encargar electrodomésticos a buenos aires",
    "enviar compras de buenos aires al interior",
    "transporte de compras personales caba",
    "comisionista para retirar mercadería en capital",
    "fletes y encomiendas desde capital federal"
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
  const whatsappUrl = "https://wa.me/5491125659686?text=Hola!%20%F0%9F%90%8B%20Quiero%20solicitar%20una%20cotizaci%C3%B3n%20para%20el%20*Traslado%20de%20mi%20Compra*%20desde%20CABA%20al%20interior.%0A%0A%F0%9F%9D%9B%20*Formulario%20de%20Solicitud%20de%20Cotizaci%C3%B3n:*%0A%E2%80%A2%20*Producto%20/%20Marca:*%20%0A%E2%80%A2%20*Comercio%20/%20Vendedor%20en%20CABA:*%20%0A%E2%80%A2%20*Bultos%20/%20Medidas%20aproximadas:*%20%0A%E2%80%A2%20*Localidad%20de%20Destino%20(Interior):*%20%0A%E2%80%A2%20*Nombre%20y%20Apellido:*%20%0A%0AQuedo%20a%20la%20espera%20de%20la%20cotizaci%C3%B3n.%20%C2%A1Muchas%20gracias!";

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 font-sans selection:bg-[#fe5000] selection:text-white">
      
      <Header />

      {/* HERO SECTION CON SHOWCASE VISUAL DE FLOTA */}
      <section className="pt-12 pb-16 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16">
          
          {/* Columna Izquierda: Copy + CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-[#fe5000]/10 border border-[#fe5000]/20 text-[#fe5000] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
              <Truck className="w-4 h-4" /> Cuidado y Traslado Directo de Compras desde CABA
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-zinc-900 leading-tight">
              Envíos Low Cost desde CABA al interior: <span className="text-[#fe5000]">Cuidamos y traemos tus compras de CABA a tu hogar.</span>
            </h1>
            
            <p className="text-base sm:text-lg text-zinc-600 font-normal leading-relaxed bg-white p-6 md:p-8 rounded-3xl border border-zinc-200 shadow-sm">
              Si ya compraste tu tecnología o electrodomésticos en Capital Federal, cuidamos tu inversión desde el primer instante. Somos tu puente logístico seguro: recibimos tu paquete en nuestro local de CABA y lo trasladamos con la máxima protección, cuidado garantizado y entrega directa en tu casa en el interior.
            </p>

            <div className="pt-2 flex flex-col items-start gap-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all text-sm uppercase tracking-wider w-full sm:w-auto"
              >
                <WhatsAppIcon className="w-5 h-5" />
                Cotizar el Envío Low Cost en WhatsApp
              </a>

              <div className="bg-emerald-50 border border-emerald-200/80 text-emerald-950 p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed shadow-sm w-full">
                <Clock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-950 text-sm mb-0.5">⏱️ Respuesta en las próximas horas</p>
                  <p className="text-emerald-800">
                    Al hacer clic se abrirá WhatsApp con el <strong>formulario predeterminado</strong> con la info requerida para cotizar correctamente. Nuestro equipo te responderá con el presupuesto exacto en las próximas horas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta Fotográfica de la Flota Oficial */}
          <div className="lg:col-span-5 relative group">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-zinc-200/80 bg-white">
              <img 
                src="/flota-cuenta-hogar.jpg" 
                alt="Flota Oficial de Logística Cuenta Hogar" 
                className="w-full h-[380px] object-cover group-hover:scale-105 transition-transform duration-700" 
              />
              
              {/* Overlay inferior con badge de legitimidad */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-6">
                <div className="bg-slate-900/90 backdrop-blur-md border border-white/20 text-white p-4 rounded-2xl w-full flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#fe5000] rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-white tracking-wide">Transporte propio Cuenta Hogar</p>
                      <p className="text-[11px] text-zinc-300 font-medium">Unidades acondicionadas para el cuidado de productos de alto valor</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    En Regla
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ¿CÓMO FUNCIONA? (4 COLUMNAS / TARJETAS) */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-zinc-900">¿Cómo funciona?</h2>
            <p className="text-zinc-500 text-sm font-medium mt-1">Un circuito simple y transparente en 4 pasos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Tarjeta 1 */}
            <div className="bg-white border border-zinc-200 p-8 rounded-3xl flex flex-col justify-between hover:border-[#fe5000]/60 hover:shadow-xl transition-all duration-300 shadow-sm group">
              <div>
                <div className="w-12 h-12 bg-[#fe5000]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#fe5000]/20 text-[#fe5000] font-black text-lg group-hover:scale-110 transition-transform">
                  1
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-[#fe5000]" />
                  <h3 className="text-lg font-black text-zinc-900">Comprás y enviás acá</h3>
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Realizás tu compra y pedís que la entreguen en nuestro local en CABA. La factura debe emitirse a tu nombre.
                </p>
              </div>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-white border border-zinc-200 p-8 rounded-3xl flex flex-col justify-between hover:border-[#fe5000]/60 hover:shadow-xl transition-all duration-300 shadow-sm group">
              <div>
                <div className="w-12 h-12 bg-[#fe5000]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#fe5000]/20 text-[#fe5000] font-black text-lg group-hover:scale-110 transition-transform">
                  2
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-[#fe5000]" />
                  <h3 className="text-lg font-black text-zinc-900">Recibimos tu paquete</h3>
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Acopiamos tu mercadería de forma segura en nuestro depósito.
                </p>
              </div>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-white border border-zinc-200 p-8 rounded-3xl flex flex-col justify-between hover:border-[#fe5000]/60 hover:shadow-xl transition-all duration-300 shadow-sm group">
              <div>
                <div className="w-12 h-12 bg-[#fe5000]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#fe5000]/20 text-[#fe5000] font-black text-lg group-hover:scale-110 transition-transform">
                  3
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-[#fe5000]" />
                  <h3 className="text-lg font-black text-zinc-900">Traslado Protegido y En Regla</h3>
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Viajamos 100% en regla emitiendo el Remito Oficial de Traslado (Tipo "R") a nombre de nuestra empresa.
                </p>
              </div>
            </div>

            {/* Tarjeta 4 */}
            <div className="bg-white border border-zinc-200 p-8 rounded-3xl flex flex-col justify-between hover:border-[#fe5000]/60 hover:shadow-xl transition-all duration-300 shadow-sm group">
              <div>
                <div className="w-12 h-12 bg-[#fe5000]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#fe5000]/20 text-[#fe5000] font-black text-lg group-hover:scale-110 transition-transform">
                  4
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-5 h-5 text-[#fe5000]" />
                  <h3 className="text-lg font-black text-zinc-900">Entrega en tu puerta</h3>
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed">
                  Bajamos la compra en tu casa, con el trato directo de siempre.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* REQUISITOS OPERATIVOS */}
        <div className="mb-20 bg-white border border-zinc-200 rounded-3xl p-8 md:p-12 shadow-sm">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-zinc-900">Requisitos Operativos</h2>
            <p className="text-zinc-500 text-sm font-medium mt-1">Condiciones obligatorias para garantizar el traslado legal y sin contratiempos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-slate-50 border border-zinc-200 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 bg-[#fe5000]/10 rounded-xl flex items-center justify-center text-[#fe5000] font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 text-base">Factura Original</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                El comprobante debe emitirse a tu DNI para respaldar la carga en la ruta ante controles policiales.
              </p>
            </div>

            <div className="bg-slate-50 border border-zinc-200 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 bg-[#fe5000]/10 rounded-xl flex items-center justify-center text-[#fe5000] font-bold">
                <CalendarClock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 text-base">Aviso de Entrega</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Debés notificarnos qué día el vendedor dejará la caja en nuestro local para esperarlo.
              </p>
            </div>

            <div className="bg-slate-50 border border-zinc-200 p-6 rounded-2xl space-y-3">
              <div className="w-10 h-10 bg-[#fe5000]/10 rounded-xl flex items-center justify-center text-[#fe5000] font-bold">
                <Scale className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-zinc-900 text-base">Topes de Carga</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Operamos debajo de los topes provinciales (4.500 kg o $9.529.691) para evitar demoras con el COT de ARBA.
              </p>
            </div>

          </div>
        </div>

        {/* SECCIÓN UBICACIÓN CON GOOGLE MAPS EMBEDDED IFRAME */}
        <div className="mb-20 bg-white border border-zinc-200 p-8 md:p-12 rounded-3xl shadow-sm space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#fe5000]/10 border border-[#fe5000]/20 text-[#fe5000] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
              <Navigation className="w-4 h-4" /> Centro de Recepción y Domicilio Legal
            </div>
            <h2 className="text-3xl font-black text-zinc-900">Ubicación en Capital Federal</h2>
            <p className="text-zinc-600 text-sm max-w-xl mx-auto">
              Nuestro local y punto de acopio está ubicado en <strong className="text-zinc-900 font-bold">Caracas 1101, CABA</strong>.
            </p>
          </div>

          <div className="w-full rounded-3xl overflow-hidden shadow-xl border border-zinc-200">
            <iframe
              title="Ubicación Centro de Recepción CABA - Caracas 1101"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.473539827663!2d-58.46820522346083!3d-34.61747805822394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcc9f3a61c572b%3A0x6b2e35a1408018e6!2sCaracas%201101%2C%20C1416AOS%20CABA!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
              width="100%"
              height="380"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-[380px] rounded-3xl"
            />
          </div>
        </div>

        {/* CIERRE Y CALL TO ACTION (CTA) */}
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-zinc-900 via-slate-900 to-zinc-950 border border-zinc-800 text-white p-10 md:p-14 rounded-3xl text-center shadow-2xl space-y-8 relative overflow-hidden">
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-[#fe5000]/20 border border-[#fe5000]/30 text-[#fe5000] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <MapPin className="w-4 h-4" /> Centro de Recepción Oficial
            </div>
            <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              Dirección de Recepción: <span className="text-[#fe5000]">Caracas 1101, CABA.</span>
            </h3>
            <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto">
              Coordiná la entrega de tus paquetes directamente con nuestro equipo administrativo vía WhatsApp.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all text-sm uppercase tracking-wider w-full sm:w-auto"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Avisar de un envío / Cotizar Envío Low Cost
            </a>
            <p className="text-xs text-zinc-300 font-medium">
              ⚡ Te responderemos con el presupuesto de traslado en las próximas horas vía WhatsApp.
            </p>
          </div>

        </div>

      </section>

      <Footer />

    </div>
  );
}
