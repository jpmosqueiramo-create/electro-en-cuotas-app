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
    <section className="py-24 bg-white text-zinc-900 border-y border-zinc-200">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/30 text-xs font-black uppercase tracking-wider mb-4">
            ⚡ Plan de Confianza
          </span>
          <h2 className="text-4xl md:text-5xl font-black mb-6 text-zinc-900 leading-tight">Nuestra Financiación</h2>
          <p className="text-lg text-zinc-600 mb-8 leading-relaxed">
            Entendemos el valor de tu palabra. Por eso, diseñamos un sistema de crédito que no depende de bancos, sino de la confianza mutua.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feat, i) => (
              <li key={i} className="flex items-center gap-3 font-bold text-zinc-800 bg-slate-50 border border-zinc-200 p-4 rounded-2xl">
                <CircleCheck className="text-[#fe5000] w-6 h-6 flex-shrink-0" />
                {feat}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[#181920] p-12 rounded-[40px] text-white shadow-2xl relative overflow-hidden border border-zinc-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#fe5000]/15 rounded-full -mr-16 -mt-16 blur-2xl" />
          <h3 className="text-2xl font-black mb-4 text-white">¿Por qué elegirnos?</h3>
          <p className="text-zinc-300 mb-8 leading-relaxed font-light">
            En los pueblos del interior, sabemos que el trato cercano es lo que importa. No sos un número de cliente, sos un vecino.
          </p>
          <div className="p-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-inner">
            <p className="italic font-light text-zinc-300">&quot;Hacemos posible que accedas a lo mejor, pagando como vos podés.&quot;</p>
          </div>
        </div>
      </div>
    </section>
  );
}
