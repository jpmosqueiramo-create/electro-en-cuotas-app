"use client";
import { Users, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AffiliatesCta() {
  return (
    <section className="py-24 bg-[#001F3F] text-white">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="max-w-xl">
          <div className="flex items-center gap-3 text-accent-gold mb-6 font-bold tracking-widest uppercase text-sm">
            <Users className="w-5 h-5" /> Sumate al Equipo
          </div>
          <h2 className="text-4xl font-black mb-6">Convertite en Asesor de Gestión</h2>
          <p className="text-lg text-blue-100/70 mb-0">
            Buscamos vecinos proactivos que quieran ayudar a otros a cumplir sus sueños. Sumate como Asesor Independiente y crezcamos juntos.
          </p>
        </div>
        <Link href="/afiliado" className="inline-flex items-center gap-3 bg-white text-[#001F3F] px-8 py-4 rounded-full font-black hover:bg-accent-gold transition-all">
          Quiero ser Asesor <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>
  );
}
