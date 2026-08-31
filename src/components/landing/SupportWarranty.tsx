"use client";
import { LifeBuoy } from "lucide-react";

export default function SupportWarranty() {
  return (
    <section className="py-24 bg-slate-50 text-zinc-900 border-y border-zinc-200">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex p-4 bg-[#fe5000]/10 rounded-2xl mb-6 text-[#fe5000] border border-[#fe5000]/20 shadow-sm">
          <LifeBuoy className="w-10 h-10" />
        </div>
        <h2 className="text-4xl md:text-5xl font-black mb-6 text-zinc-900">Soporte y Garantía Integral</h2>
        <p className="text-xl text-zinc-600 leading-relaxed mb-8 font-light">
          Cuenta Hogar actúa como gestor directo ante el fabricante. Si el equipo falla, <span className="font-bold text-[#fe5000]">no renegás solo</span>; nosotros mediamos con el service oficial por vos hasta que tengas una solución.
        </p>
        <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-md">
          <p className="text-xs uppercase tracking-widest font-black text-[#fe5000] mb-2">Nuestro Compromiso</p>
          <p className="text-lg font-bold text-zinc-800">&quot;Acompañarte desde que abrís la caja hasta mucho tiempo después.&quot;</p>
        </div>
      </div>
    </section>
  );
}
