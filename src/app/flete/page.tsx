import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Truck, MapPin, CalendarClock, AlertCircle, CheckCircle2, Navigation, Route } from "lucide-react";

export const metadata: Metadata = {
  title: "Envíos Low Cost CABA al Interior | Cuenta Hogar",
  description: "Recibimos tu compra en CABA (Caracas 1101) y la llevamos a tu domicilio en el interior con nuestros recorridos programados y transporte propio.",
  keywords: [
    "Envíos Low Cost CABA",
    "transporte propio buenos aires al interior",
    "comprar en caba envio al interior",
    "traslado de compras buenos aires",
    "recepcion mercaderia caba caracas 1101"
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
  const whatsappText = `Hola, quiero cotizar un Envío Low Cost de Cuenta Hogar.

Localidad de destino: 
¿Qué producto o mercadería compraste?: 
Cantidad de bultos: 
Medidas aproximadas de los bultos (si las sabés): 
Peso aproximado (si lo sabés): 
Valor aproximado de la mercadería: 

La compra será enviada al local de Cuenta Hogar en CABA, coordinando previamente la recepción.

Si podés, adjuntá una foto o link del producto.`;

  const whatsappUrl = `https://wa.me/5491125659686?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] font-sans selection:bg-[#173E3B] selection:text-white">
      
      <Header />

      {/* 1. HERO ALTO CONTRASTE (BLOQUE VERDE PETRÓLEO #173E3B) */}
      <section className="relative bg-[#173E3B] text-[#FFFDFC] pt-14 pb-20 lg:pt-20 lg:pb-28 overflow-hidden border-b border-[#173E3B]">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* IZQUIERDA: MENSAJE HERO */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* TAG LOGÍSTICO */}
              <div className="inline-flex items-center gap-3 bg-[#FFFDFC]/10 border border-[#FFFDFC]/20 text-[#E7B86A] px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-[#E7B86A]"></span>
                ENVÍOS LOW COST · CABA <span className="text-[#FFFDFC]">●────────→ ●</span> INTERIOR
              </div>

              {/* H1 PROTAGONISTA */}
              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-heading font-extrabold tracking-tight leading-[1.08] text-[#FFFDFC]">
                Comprar en Capital es fácil.<br />
                <span className="text-[#E7B86A]">Traerlo al interior es otra historia.</span>
              </h1>

              {/* BAJADA */}
              <p className="text-base sm:text-lg text-[#F7F3EC]/90 font-sans font-normal leading-relaxed max-w-2xl">
                Recibimos tu compra en nuestro centro logístico de CABA y la llevamos hasta tu domicilio aprovechando nuestros recorridos programados.
              </p>

              {/* CTA CONTRASTADO */}
              <div className="pt-3 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#B44E2A] hover:bg-[#984021] text-white font-heading font-bold px-8 py-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-black/20"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  Cotizar mi envío
                </a>
              </div>

              {/* REFUERZO SOBRIO (SIN TARJETAS) */}
              <div className="pt-6 border-t border-[#FFFDFC]/15 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-heading font-medium text-[#F7F3EC]/80">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E7B86A]"></span>
                  <span>Recepción en CABA</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E7B86A]"></span>
                  <span>Transporte propio</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E7B86A]"></span>
                  <span>Entrega a domicilio</span>
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
                  <div className="bg-[#173E3B]/90 backdrop-blur-md border border-[#FFFDFC]/20 text-[#FFFDFC] p-4 rounded-xl w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#B44E2A] rounded-lg flex items-center justify-center text-white shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-heading font-bold uppercase text-[#E7B86A] tracking-wider">
                          Operación Logística Real
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

      {/* 2. PUNTO DE DOLOR (FONDO CREMA #F7F3EC) */}
      <section className="py-20 lg:py-24 bg-[#F7F3EC] border-b border-[#DED8CF]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#B44E2A]">
              <AlertCircle className="w-4 h-4" /> La realidad de comprar desde el interior
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-heading font-extrabold text-[#173E3B] leading-tight">
              Compraste. Ahora viene la parte complicada.
            </h2>
          </div>

          {/* LISTA DE PROBLEMAS REALES DEL CLIENTE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl space-y-2 shadow-xs border-l-4 border-l-[#B44E2A]">
              <h3 className="font-heading font-bold text-[#173E3B] text-base">Coordinación distante e incierta</h3>
              <p className="text-sm text-[#68706E] font-sans leading-relaxed">
                Coordinar quién recibe o retira la compra en Buenos Aires desde cientos de kilómetros de distancia.
              </p>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl space-y-2 shadow-xs border-l-4 border-l-[#B44E2A]">
              <h3 className="font-heading font-bold text-[#173E3B] text-base">Depender de comisionistas</h3>
              <p className="text-sm text-[#68706E] font-sans leading-relaxed">
                Estar sujeto a los días contados que pasa el comisionista y a sus caprichos de disponibilidad.
              </p>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl space-y-2 shadow-xs border-l-4 border-l-[#B44E2A]">
              <h3 className="font-heading font-bold text-[#173E3B] text-base">Horarios sin confirmar</h3>
              <p className="text-sm text-[#68706E] font-sans leading-relaxed">
                Organizar horarios imposibles sin saber a qué hora exacta llega o si podés estar para recibirlo.
              </p>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl space-y-2 shadow-xs border-l-4 border-l-[#B44E2A]">
              <h3 className="font-heading font-bold text-[#173E3B] text-base">Desgaste operativo</h3>
              <p className="text-sm text-[#68706E] font-sans leading-relaxed">
                Depender de distintas personas desconectadas para comprar, recepcionar y transportar la compra.
              </p>
            </div>
          </div>

          {/* TEXTO DE CIERRE CENTRALIZADO */}
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl text-center space-y-3 max-w-3xl mx-auto shadow-sm">
            <p className="text-base sm:text-lg font-heading font-bold text-[#173E3B] leading-relaxed">
              Cuenta Hogar centraliza esa coordinación: tu proveedor entrega la compra en nuestro local de CABA y nosotros organizamos el traslado.
            </p>
            <p className="text-xs text-[#68706E] font-sans">
              Recepción centralizada en CABA (Caracas 1101) previa coordinación administrativa.
            </p>
          </div>

        </div>
      </section>

      {/* 3. RECORRIDO VISUAL "Así viaja tu compra" (PROCESO LINEAL EN SUPERFICIE #FFFDFC) */}
      <section className="py-20 lg:py-28 bg-[#FFFDFC] border-b border-[#DED8CF]">
        <div className="max-w-6xl mx-auto px-6 space-y-16">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#173E3B]">
              <Route className="w-4 h-4 text-[#B44E2A]" /> Trazabilidad Directa CABA ➔ Interior
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#173E3B]">
              Así viaja tu compra
            </h2>
            <p className="text-[#68706E] text-sm font-sans">
              Un recorrido visual transparente desde el local en Capital hasta tu casa.
            </p>
          </div>

          {/* LÍNEA VISUAL DE RECORRIDO EN 6 PASOS */}
          <div className="relative">
            {/* LÍNEA CONECTORA EN DESKTOP */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-[#DED8CF] -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 relative z-10">
              
              <div className="bg-[#F7F3EC] border border-[#DED8CF] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-[#173E3B] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#173E3B] text-white font-heading font-bold text-sm flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-heading font-bold text-[#173E3B] text-sm mb-1">Comprás en Capital</h4>
                  <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                    Adquirís el producto en la tienda de CABA que elijas.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#B44E2A] font-bold">CABA ●────</div>
              </div>

              <div className="bg-[#F7F3EC] border border-[#DED8CF] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-[#173E3B] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#173E3B] text-white font-heading font-bold text-sm flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-heading font-bold text-[#173E3B] text-sm mb-1">Coordinás recepción</h4>
                  <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                    Avisás a Cuenta Hogar el día de llegada del bulto.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#B44E2A] font-bold">───────</div>
              </div>

              <div className="bg-[#F7F3EC] border border-[#DED8CF] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-[#173E3B] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#173E3B] text-white font-heading font-bold text-sm flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-heading font-bold text-[#173E3B] text-sm mb-1">Proveedor entrega</h4>
                  <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                    Entregan la carga en nuestro local de Caracas 1101.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#B44E2A] font-bold">───────</div>
              </div>

              <div className="bg-[#F7F3EC] border border-[#DED8CF] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-[#173E3B] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#173E3B] text-white font-heading font-bold text-sm flex items-center justify-center shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-heading font-bold text-[#173E3B] text-sm mb-1">Organizamos bulto</h4>
                  <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                    Recibimos, verificamos y acopiamos en depósito.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#B44E2A] font-bold">───────</div>
              </div>

              <div className="bg-[#F7F3EC] border border-[#DED8CF] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-[#173E3B] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#173E3B] text-white font-heading font-bold text-sm flex items-center justify-center shrink-0">
                  5
                </div>
                <div>
                  <h4 className="font-heading font-bold text-[#173E3B] text-sm mb-1">Recorrido activo</h4>
                  <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                    Lo sumamos al recorrido programado en ruta.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#B44E2A] font-bold">───────</div>
              </div>

              <div className="bg-[#F7F3EC] border border-[#DED8CF] p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-[#173E3B] transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#B44E2A] text-white font-heading font-bold text-sm flex items-center justify-center shrink-0">
                  6
                </div>
                <div>
                  <h4 className="font-heading font-bold text-[#173E3B] text-sm mb-1">Entrega a domicilio</h4>
                  <p className="text-xs text-[#68706E] font-sans leading-relaxed">
                    Te lo bajamos en la puerta de tu casa.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-[#B44E2A] font-bold">───► INTERIOR</div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 7. RECEPCIÓN EN CABA (DESTACADO OPERATIVO EN CREMA #F7F3EC) */}
      <section className="py-20 lg:py-24 bg-[#F7F3EC] border-b border-[#DED8CF]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-[#FFFDFC] border-2 border-[#173E3B] rounded-3xl p-8 sm:p-12 shadow-md space-y-8">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[#DED8CF] pb-6">
              <div className="space-y-1">
                <span className="text-xs font-heading font-bold text-[#B44E2A] uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Punto Logístico Central
                </span>
                <h2 className="text-3xl font-heading font-extrabold text-[#173E3B]">
                  Tu punto de recepción en Capital
                </h2>
              </div>

              <div className="bg-[#F7F3EC] border border-[#DED8CF] px-5 py-3 rounded-2xl flex items-center gap-3 shrink-0">
                <CalendarClock className="w-5 h-5 text-[#173E3B]" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-[#68706E] tracking-wider">Horario de recepción</p>
                  <p className="text-base font-heading font-bold text-[#173E3B]">A COORDINAR</p>
                </div>
              </div>
            </div>

            <p className="text-base sm:text-lg text-[#1F2928] font-sans leading-relaxed">
              Tu compra debe ser entregada por el vendedor o proveedor en nuestro centro de recepción de CABA.
            </p>

            {/* DIRECCIÓN DESTACADA */}
            <div className="bg-[#F7F3EC] border border-[#DED8CF] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#173E3B] text-white rounded-xl flex items-center justify-center shrink-0 font-bold">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs uppercase font-bold text-[#68706E] tracking-wider">Dirección de Recepción CABA:</p>
                  <p className="text-lg font-heading font-bold text-[#173E3B]">Caracas 1101, CABA, Argentina</p>
                </div>
              </div>
            </div>

            {/* MAPA EMBEDDED */}
            <div className="w-full rounded-2xl overflow-hidden border border-[#DED8CF]">
              <iframe
                title="Ubicación Centro de Recepción CABA - Caracas 1101"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.473539827663!2d-58.46820522346083!3d-34.61747805822394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcc9f3a61c572b%3A0x6b2e35a1408018e6!2sCaracas%201101%2C%20C1416AOS%20CABA!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
                width="100%"
                height="280"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-[280px] rounded-2xl"
              />
            </div>

            {/* ACLARACIÓN OBLIGATORIA */}
            <div className="flex items-center gap-3 text-xs sm:text-sm text-[#B44E2A] font-bold bg-[#B44E2A]/10 border border-[#B44E2A]/20 p-4 rounded-xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>Importante: no enviar mercadería sin coordinar previamente con Cuenta Hogar.</span>
            </div>

          </div>
        </div>
      </section>

      {/* 8. TRANSPORTE PROPIO ("De nuestro local a tu domicilio.") */}
      <section className="py-20 lg:py-28 bg-[#FFFDFC] border-b border-[#DED8CF]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* IZQUIERDA: CONTENIDO */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#B44E2A]">
                <Truck className="w-4 h-4" /> Capacidad Operativa Directa
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-heading font-extrabold text-[#173E3B] leading-tight">
                De nuestro local a tu domicilio.
              </h2>

              <p className="text-base sm:text-lg text-[#68706E] font-sans leading-relaxed">
                Organizamos nuestros propios recorridos para tener mayor control sobre la carga, los tiempos y las entregas.
              </p>

              {/* DIFERENCIALES CLAVE */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#173E3B] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-heading font-bold text-[#173E3B] text-sm">Transporte propio</h4>
                    <p className="text-xs text-[#68706E] font-sans">Unidades adaptadas para tecnología, electrodomésticos y carga general.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#173E3B] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-heading font-bold text-[#173E3B] text-sm">Recorridos organizados</h4>
                    <p className="text-xs text-[#68706E] font-sans">Cronogramas de ruta estructurados para dar certeza de llegada.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#173E3B] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-heading font-bold text-[#173E3B] text-sm">Entrega en domicilio</h4>
                    <p className="text-xs text-[#68706E] font-sans">Llegamos directo a la puerta de tu casa en el interior.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#173E3B] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-heading font-bold text-[#173E3B] text-sm">Menor dependencia de terceros</h4>
                    <p className="text-xs text-[#68706E] font-sans">Sin intermediarios ni desvíos informales durante el trayecto.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* DERECHA: FOTOGRAFÍA GRANDE DE LA TRANSIT */}
            <div className="lg:col-span-6">
              <div className="relative rounded-3xl overflow-hidden border border-[#DED8CF] shadow-xl group">
                <img 
                  src="/flota-cuenta-hogar.jpg" 
                  alt="Transporte propio Ford Transit Cuenta Hogar" 
                  className="w-full h-[400px] sm:h-[480px] object-cover group-hover:scale-102 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#173E3B]/80 via-transparent to-transparent flex items-end p-6">
                  <p className="text-xs font-heading font-bold text-[#FFFDFC] uppercase tracking-wider">
                    Unidades de transporte propio en ruta CABA ➔ Interior
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 9. COBERTURA ("¿Hasta dónde llegamos?") */}
      <section className="py-20 lg:py-24 bg-[#F7F3EC] border-b border-[#DED8CF]">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-12">
          
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#173E3B]">
              <MapPin className="w-4 h-4 text-[#B44E2A]" /> Rutas y Localidades Activas
            </div>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#173E3B]">
              ¿Hasta dónde llegamos?
            </h2>
            <p className="text-[#68706E] text-sm font-sans">
              Localidades actuales con recorridos programados:
            </p>
          </div>

          {/* TARJETAS DE LOCALIDADES */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {["Lincoln", "Zavalía", "Los Toldos", "Chivilcoy", "O'Brien"].map((loc) => (
              <div key={loc} className="bg-[#FFFDFC] border border-[#DED8CF] p-5 rounded-2xl text-center space-y-1 shadow-xs hover:border-[#173E3B] transition-colors">
                <MapPin className="w-5 h-5 text-[#B44E2A] mx-auto mb-1" />
                <p className="font-heading font-bold text-[#173E3B] text-base">{loc}</p>
                <p className="text-[10px] text-[#68706E] font-mono">Recorrido activo</p>
              </div>
            ))}
          </div>

          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-4 rounded-xl inline-block text-xs font-heading font-semibold text-[#68706E]">
            🌱 Estamos ampliando progresivamente nuestras rutas.
          </div>

        </div>
      </section>

      {/* 10. SECCIÓN DE COTIZACIÓN FINAL (WHATSAPP BLOQUE TERRACOTA/PETRÓLEO) */}
      <section className="py-20 lg:py-28 bg-[#173E3B] text-[#FFFDFC]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-[#FFFDFC]/10 border border-[#FFFDFC]/20 text-[#E7B86A] px-4 py-1.5 rounded-full text-xs font-heading font-bold uppercase tracking-widest">
              <Truck className="w-4 h-4" /> Presupuesto por WhatsApp
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-heading font-extrabold tracking-tight leading-tight text-[#FFFDFC]">
              ¿Querés saber cuánto cuesta traer tu compra?
            </h2>
            
            <p className="text-base sm:text-lg text-[#F7F3EC]/90 font-sans max-w-xl mx-auto leading-relaxed">
              Contanos qué compraste y a qué localidad tenemos que llevarlo. Te cotizamos el envío por WhatsApp.
            </p>
          </div>

          <div className="pt-4 flex flex-col items-center gap-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 bg-[#B44E2A] hover:bg-[#984021] text-white font-heading font-bold px-10 py-5 rounded-2xl text-sm uppercase tracking-wider transition-all shadow-xl shadow-black/30 hover:scale-[1.02] active:scale-95"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Cotizar por WhatsApp
            </a>

            <p className="text-xs text-[#F7F3EC]/70 font-sans">
              ⏱️ Te responderemos con la cotización estimada en las próximas horas.
            </p>
          </div>

        </div>
      </section>

      <Footer />

    </div>
  );
}
