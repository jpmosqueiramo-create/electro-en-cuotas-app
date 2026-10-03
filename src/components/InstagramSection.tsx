"use client";

import { ArrowRight, Sparkles } from "lucide-react";

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function InstagramSection() {
  return (
    <section className="py-16 bg-[#0E1015] border-t border-[#222530] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-[#161922] border border-[#2A2E3D] rounded-3xl p-8 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD21A]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 max-w-xl text-center md:text-left relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] text-xs font-mono font-bold uppercase tracking-wider">
              <InstagramIcon className="w-3.5 h-3.5" />
              <span>SEGUINOS EN INSTAGRAM</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Conocé el día a día de Cuenta Hogar.
            </h3>

            <p className="text-sm text-[#9CA3AF] leading-relaxed">
              Novedades, entregas, productos y recorridos. Sumate a nuestra comunidad oficial.
            </p>

            <div className="inline-block text-xs font-mono font-bold text-[#FFD21A] bg-[#111318] px-3.5 py-1.5 rounded-lg border border-[#FFD21A]/20">
              @CUENTA_HOGAR
            </div>
          </div>

          <div className="shrink-0 relative z-10">
            <a
              href="https://www.instagram.com/cuenta_hogar/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visitar Instagram de Cuenta Hogar"
              className="inline-flex items-center gap-2.5 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-extrabold text-xs uppercase tracking-wider px-7 py-4 rounded-xl transition-all shadow-lg shadow-[#FFD21A]/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <InstagramIcon className="w-4 h-4" />
              <span>VER INSTAGRAM</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
