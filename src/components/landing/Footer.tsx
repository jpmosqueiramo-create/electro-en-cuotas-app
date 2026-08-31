"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#16171d] border-t border-white/5 py-16 text-white/50">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center gap-2 mb-4 opacity-70">
            <div className="bg-[#1a1c24] text-[#fe5000] border border-[#fe5000]/30 font-black px-1.5 py-0.5 rounded text-sm">CH</div>
            <span className="text-lg font-bold tracking-tight text-white">
              CUENTA <span className="text-[#fe5000]">HOGAR</span>
            </span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} LOOP GESTIÓN INTEGRAL S.R.L.. Todos los derechos reservados.</p>
        </div>
        
        <div className="flex gap-8 text-sm flex-wrap justify-center">
          <Link href="/terms" className="hover:text-white transition-colors">Términos y Condiciones</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacidad</Link>
          <Link href="/arrepentimiento" className="inline-flex items-center gap-2 bg-[#fe5000] hover:bg-orange-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md hover:scale-105 transition-all uppercase tracking-wider border border-orange-400/30">Botón de Arrepentimiento</Link>
        </div>
      </div>
    </footer>
  );
}
