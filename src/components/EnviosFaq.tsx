"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

const FAQS: FaqItem[] = [
  {
    question: "¿Qué compras o productos puedo enviar?",
    answer: "Podés enviar electrodomésticos (heladeras, lavarropas, cocinas, freezers), tecnología (televisores, notebooks, audio), muebles, colchones y bultos de mercadería general o insumos para tu comercio."
  },
  {
    question: "¿Dónde tiene que entregar la compra el proveedor o local de CABA?",
    answer: "Tu proveedor debe entregar el bulto en nuestro centro logístico de recepción ubicado en Caracas 1101, CABA, Capital Federal, coordinando previamente con nuestro equipo para emitir la orden de recepción."
  },
  {
    question: "¿Qué sucede si le compro a más de un local en Buenos Aires?",
    answer: "Ofrecemos el beneficio de CONSOLIDACIÓN SIN CARGO: podés comprar a distintos locales de CABA, nosotros recibimos y agrupamos todos tus bultos en nuestro depósito y pagás un único traslado por el volumen consolidado."
  },
  {
    question: "¿Cómo se calcula el costo del envío?",
    answer: "El costo se determina según la localidad de destino, el volumen/peso de los bultos y si requiere embalaje o manipulación especial. Utilizá nuestro simulador de cotización o escribinos por WhatsApp para un cálculo exacto."
  },
  {
    question: "¿Cómo sé cuándo llega el camión a mi domicilio?",
    answer: "Mantenemos una comunicación continua vía WhatsApp. Te informamos el día exacto de salida del camión desde CABA y coordinamos la franja horaria de entrega en la puerta de tu casa."
  },
  {
    question: "¿Cómo se abona el servicio de envío?",
    answer: "Podés abonar por transferencia bancaria (CBU/Alias), Mercado Pago o en efectivo al momento de la coordinación o entrega."
  }
];

export function EnviosFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div className="space-y-3">
      {FAQS.map((faq, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div
            key={idx}
            className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
              isOpen
                ? "bg-[#161922] border-[#173E3B] shadow-md"
                : "bg-[#161922]/60 border-[#222530] hover:border-[#374151]"
            }`}
          >
            <button
              onClick={() => toggleFaq(idx)}
              className="w-full p-5 text-left flex items-center justify-between gap-4 font-heading font-bold text-sm sm:text-base text-white cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <HelpCircle className={`w-5 h-5 shrink-0 ${isOpen ? "text-[#FFD21A]" : "text-[#9CA3AF]"}`} />
                <span>{faq.question}</span>
              </span>
              <span className="text-[#FFD21A] shrink-0">
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#D1D5DB] font-sans leading-relaxed border-t border-[#222530]/60 pl-13">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
