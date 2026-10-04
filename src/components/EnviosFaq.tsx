"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

const FAQS: FaqItem[] = [
  {
    question: "¿Cuándo comienza Envíos Low Cost?",
    answer: "El servicio estará disponible desde el 25 de noviembre de 2026."
  },
  {
    question: "¿Con qué frecuencia realizan los recorridos?",
    answer: "Inicialmente tendremos un recorrido semanal. A medida que aumente la demanda podremos incrementar la frecuencia de los viajes."
  },
  {
    question: "¿Cómo se calcula el traslado?",
    answer: "El traslado se cotiza por bulto, según sus características y el recorrido correspondiente."
  },
  {
    question: "¿Qué beneficio tienen los clientes recurrentes, comercios y emprendedores?",
    answer: "Para clientes recurrentes, comercios y emprendedores, la recepción, consolidación y custodia temporal de la mercadería pueden realizarse sin cargo, sujeto a los cupos generales de capacidad. El traslado al interior se cobra por bulto."
  },
  {
    question: "¿Cuánto tiempo puede quedar la mercadería en custodia?",
    answer: "La custodia bonificada para clientes recurrentes contempla hasta una semana."
  },
  {
    question: "¿Cómo se registra el estado de la mercadería?",
    answer: "Registramos el estado del producto al momento de recibirlo en Cuenta Hogar y nuevamente al momento de entregarlo en destino."
  },
  {
    question: "¿La mercadería puede tener un seguro especial?",
    answer: "Sí. Cuando por el valor o las características de la mercadería sea necesario contratar una cobertura especial, se coordina y cotiza por separado."
  },
  {
    question: "¿Cómo se paga Envíos Low Cost?",
    answer: "Podés pagar mediante transferencia o efectivo. Para clientes recurrentes también puede utilizarse cuenta corriente."
  },
  {
    question: "¿Qué mercadería no transportan?",
    answer: "No transportamos alimentos ni productos que requieran autorizaciones especiales para su transporte."
  },
  {
    question: "¿Qué pasa si no estoy en mi domicilio cuando llega la entrega?",
    answer: "Podemos entregar la mercadería a una persona autorizada o en otro domicilio, siempre que la autorización haya sido informada previamente por escrito."
  },
  {
    question: "¿Suben la mercadería a departamentos o pisos?",
    answer: "La entrega estándar de Cuenta Hogar es en la puerta del domicilio. Podemos colaborar razonablemente con el ingreso del producto, pero no realizamos subida por escaleras."
  },
  {
    question: "¿Instalan electrodomésticos o arman muebles?",
    answer: "No. Cuenta Hogar realiza la entrega, pero no presta servicios de instalación de electrodomésticos ni armado de muebles. El servicio Low Cost está diseñado para mantener costos bajos y las entregas se realizan con una sola persona."
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
