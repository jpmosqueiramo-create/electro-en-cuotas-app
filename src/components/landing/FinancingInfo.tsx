"use client";
import { CircleCheck } from "lucide-react";

export default function FinancingInfo() {
  const features = [
    "Cuotas fijas en pesos",
    "Trato directo y personal",
    "Sin requisitos bancarios",
    "Crédito a sola firma"
  ];

  return (
    <section className="py-24 bg-[#f8faff] text-[#002B5B]">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-4xl font-black mb-6">Nuestra Financiación</h2>
          <p className="text-lg text-gray-600 mb-8">
            Entendemos el valor de tu palabra. Por eso, diseñamos un sistema de crédito que no depende de bancos, sino de la confianza mutua.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feat, i) => (
              <li key={i} className="flex items-center gap-3 font-bold text-[#002B5B]">
                <CircleCheck className="text-accent-gold w-6 h-6 flex-shrink-0" />
                {feat}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[#002B5B] p-12 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-gold/10 rounded-full -mr-16 -mt-16" />
          <h3 className="text-2xl font-bold mb-4">¿Por qué elegirnos?</h3>
          <p className="text-blue-100/70 mb-8">
            En los pueblos del interior, sabemos que el trato cercano es lo que importa. No sos un número de cliente, sos un vecino.
          </p>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
            <p className="italic font-light">"Hacemos posible que accedas a lo mejor, pagando como vos podés."</p>
          </div>
        </div>
      </div>
    </section>
  );
}
