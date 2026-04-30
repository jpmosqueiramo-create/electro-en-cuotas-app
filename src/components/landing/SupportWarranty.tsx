"use client";
import { LifeBuoy } from "lucide-react";

export default function SupportWarranty() {
  return (
    <section className="py-24 bg-white text-[#002B5B]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex p-4 bg-blue-50 rounded-2xl mb-6 text-[#002B5B]">
          <LifeBuoy className="w-10 h-10" />
        </div>
        <h2 className="text-4xl font-black mb-6">Soporte y Garantía Integral</h2>
        <p className="text-xl text-gray-600 leading-relaxed mb-8">
          Cuenta Hogar actúa como gestor directo ante el fabricante. Si el equipo falla, <span className="font-bold text-[#003366]">no renegás solo</span>; nosotros mediamos con el service oficial por vos hasta que tengas una solución.
        </p>
        <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100">
          <p className="text-sm uppercase tracking-widest font-black text-blue-900/50 mb-2">Nuestro Compromiso</p>
          <p className="text-lg font-medium">"Acompañarte desde que abrís la caja hasta mucho tiempo después."</p>
        </div>
      </div>
    </section>
  );
}
