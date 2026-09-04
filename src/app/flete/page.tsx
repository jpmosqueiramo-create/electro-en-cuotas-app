import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Truck, MapPin, CalendarClock, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Cotizar Envíos Low Cost CABA al Interior | Cuenta Hogar",
  description: "Cotizá por WhatsApp el envío de tus compras realizadas en CABA hacia el interior. Recepción en CABA (Caracas 1101) coordinada previamente y traslado seguro.",
  keywords: [
    "Cotizar Envíos Low Cost CABA",
    "envios particulares caba al interior",
    "traslado de compras buenos aires",
    "cuenta hogar envios",
    "recepcion mercaderia caba"
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

      {/* SECCIÓN DE COTIZACIÓN - ENVÍOS LOW COST PARTICULARES */}
      <section className="pt-12 pb-20 max-w-5xl mx-auto px-6">
        
        {/* ENCABEZADO Y PRESENTACIÓN */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 bg-[#FFFDFC] border border-[#DED8CF] text-[#B44E2A] px-4 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider shadow-xs">
            <Truck className="w-3.5 h-3.5" /> Envíos Low Cost
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-[#173E3B] leading-tight">
            ¿Querés saber cuánto cuesta traer tu compra?
          </h1>
          
          <p className="text-base sm:text-lg text-[#68706E] font-sans leading-relaxed">
            Contanos qué compraste y a qué localidad tenemos que llevarlo. Te cotizamos el envío por WhatsApp.
          </p>
        </div>

        {/* 4 PASOS DE FUNCIONAMIENTO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-5 rounded-2xl shadow-xs">
            <div className="w-8 h-8 bg-[#F7F3EC] text-[#B44E2A] font-heading font-bold text-sm rounded-lg flex items-center justify-center mb-3 border border-[#DED8CF]">
              1
            </div>
            <h3 className="font-heading font-bold text-[#173E3B] text-sm mb-1">Comprás tu producto</h3>
            <p className="text-xs text-[#68706E] font-sans leading-relaxed">
              Adquirís el producto que necesitás en el vendedor o comercio de CABA que elijas.
            </p>
          </div>

          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-5 rounded-2xl shadow-xs">
            <div className="w-8 h-8 bg-[#F7F3EC] text-[#B44E2A] font-heading font-bold text-sm rounded-lg flex items-center justify-center mb-3 border border-[#DED8CF]">
              2
            </div>
            <h3 className="font-heading font-bold text-[#173E3B] text-sm mb-1">Entrega en CABA</h3>
            <p className="text-xs text-[#68706E] font-sans leading-relaxed">
              El vendedor o proveedor entrega la mercadería en nuestro centro de recepción en CABA.
            </p>
          </div>

          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-5 rounded-2xl shadow-xs">
            <div className="w-8 h-8 bg-[#F7F3EC] text-[#B44E2A] font-heading font-bold text-sm rounded-lg flex items-center justify-center mb-3 border border-[#DED8CF]">
              3
            </div>
            <h3 className="font-heading font-bold text-[#173E3B] text-sm mb-1">Coordinación previa</h3>
            <p className="text-xs text-[#68706E] font-sans leading-relaxed">
              La recepción de la mercadería en CABA debe coordinarse previamente.
            </p>
          </div>

          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-5 rounded-2xl shadow-xs">
            <div className="w-8 h-8 bg-[#F7F3EC] text-[#B44E2A] font-heading font-bold text-sm rounded-lg flex items-center justify-center mb-3 border border-[#DED8CF]">
              4
            </div>
            <h3 className="font-heading font-bold text-[#173E3B] text-sm mb-1">Traslado al interior</h3>
            <p className="text-xs text-[#68706E] font-sans leading-relaxed">
              Trasladamos la mercadería con transporte propio directo a tu localidad.
            </p>
          </div>
        </div>

        {/* BLOQUE DE RECEPCIÓN DE MERCADERÍA EN CABA */}
        <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl p-6 sm:p-10 shadow-sm max-w-3xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DED8CF] pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-[#B44E2A] uppercase tracking-wider">
                <MapPin className="w-4 h-4" /> Centro de Recepción CABA
              </div>
              <h2 className="text-2xl font-heading font-bold text-[#173E3B]">
                Recepción de mercadería en CABA
              </h2>
            </div>

            <div className="bg-[#F7F3EC] border border-[#DED8CF] px-4 py-2.5 rounded-xl flex items-center gap-2.5 shrink-0">
              <CalendarClock className="w-4 h-4 text-[#173E3B]" />
              <div>
                <p className="text-[10px] uppercase font-bold text-[#68706E] tracking-wider">Horario de recepción</p>
                <p className="text-sm font-heading font-bold text-[#173E3B]">A COORDINAR</p>
              </div>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#1F2928] font-sans leading-relaxed">
            Tu compra debe ser entregada por el vendedor o proveedor en nuestro centro de recepción en CABA.
          </p>

          <div className="bg-[#F7F3EC] border border-[#DED8CF] p-4 rounded-xl flex items-start gap-3 text-xs text-[#68706E]">
            <MapPin className="w-4 h-4 text-[#173E3B] shrink-0 mt-0.5" />
            <div>
              <p className="font-heading font-bold text-[#173E3B] text-xs">Dirección de Recepción:</p>
              <p className="text-[#1F2928] font-medium text-sm">Caracas 1101, CABA, Argentina</p>
            </div>
          </div>

          {/* BOTÓN PRINCIPAL Y ACLARACIÓN */}
          <div className="pt-2 flex flex-col items-center gap-4 text-center">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-lowcost text-sm uppercase tracking-wider w-full sm:w-auto py-4 px-8 justify-center shadow-md"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Cotizar por WhatsApp
            </a>

            <div className="flex items-center gap-2 text-xs text-[#B44E2A] font-bold bg-[#B44E2A]/10 border border-[#B44E2A]/20 px-4 py-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Importante: no enviar mercadería sin coordinar previamente con Cuenta Hogar.</span>
            </div>
          </div>

        </div>

      </section>

      <Footer />

    </div>
  );
}
