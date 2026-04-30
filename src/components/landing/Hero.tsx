"use client";
import { ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-32 bg-gradient-to-b from-[#002B5B] to-[#001C3D] text-white">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-accent-gold text-xs font-bold tracking-widest uppercase mb-8">
          <ShieldCheck className="w-4 h-4" /> Tu palabra vale, tu confianza suma
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-6">
          Cuenta Hogar:<br />
          <span className="text-accent-gold">
            Tu palabra vale, tu tecnología llega.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-blue-100/80 mb-10 max-w-3xl font-light leading-relaxed">
          Gestionamos la compra de lo que necesitás, te lo financiamos a sola firma y te lo llevamos a la puerta de tu casa. Sin bancos, con la seriedad de siempre.
        </p>
        
        <Link href="/abrir-cuenta" className="group flex items-center gap-2 bg-accent-gold text-[#002B5B] text-lg font-extrabold px-10 py-5 rounded-full hover:bg-white transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,215,0,0.2)]">
          Abrí tu Cuenta de Confianza <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
