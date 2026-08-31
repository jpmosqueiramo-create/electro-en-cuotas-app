"use client";
import { ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-32 bg-gradient-to-b from-[#16171d] via-[#121316] to-[#121316] text-white">
      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fe5000]/10 border border-[#fe5000]/30 text-[#fe5000] shadow-[0_0_15px_rgba(254,80,0,0.2)] text-xs font-bold tracking-widest uppercase mb-8">
          <ShieldCheck className="w-4 h-4" /> Tu palabra vale, tu confianza suma
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-6 text-white">
          Cuenta Hogar:<br />
          <span className="text-[#fe5000]">
            Tu palabra vale, tu tecnología llega.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-blue-100/80 mb-10 max-w-3xl font-light leading-relaxed">
          Gestionamos la compra de lo que necesitás, te lo financiamos a sola firma y te lo llevamos a la puerta de tu casa. Sin bancos, con la seriedad de siempre.
        </p>
        
        <Link href="/abrir-cuenta" className="group flex items-center gap-2 bg-[#fe5000] text-white text-lg font-extrabold px-10 py-5 rounded-full hover:bg-zinc-900 transition-all hover:scale-105 shadow-[0_0_30px_rgba(254,80,0,0.4)]">
          Abrí tu Cuenta de Confianza <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
