"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#173E3B] border-t border-[#235854] py-16 text-[#FFFDFC]">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="bg-[#FFFDFC] text-[#173E3B] font-black px-2 py-0.5 rounded text-sm shadow-xs">CH</div>
            <span className="text-xl font-heading font-extrabold tracking-tight text-white">
              CUENTA <span className="text-[#E7B86A]">HOGAR</span>
            </span>
          </div>
          <p className="text-xs text-[#FFFDFC] font-sans">© {new Date().getFullYear()} LOOP GESTIÓN INTEGRAL S.R.L. Todos los derechos reservados.</p>
        </div>
        
        <div className="flex gap-6 text-xs font-semibold flex-wrap justify-center items-center">
          <Link href="/terms" className="text-[#FFFDFC] hover:text-[#E7B86A] transition-colors">Términos y Condiciones</Link>
          <Link href="/privacy" className="text-[#FFFDFC] hover:text-[#E7B86A] transition-colors">Privacidad</Link>
          <Link href="/arrepentimiento" className="inline-flex items-center gap-2 bg-[#B44E2A] hover:bg-[#984021] text-white font-heading font-bold text-xs px-4 py-2.5 rounded-xl shadow-md hover:scale-105 transition-all uppercase tracking-wider">Botón de Arrepentimiento</Link>
        </div>
      </div>
    </footer>
  );
}
