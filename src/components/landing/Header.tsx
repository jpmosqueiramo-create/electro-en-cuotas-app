"use client";
import Link from "next/link";
import { LogIn } from "lucide-react";

export default function Header() {
  return (
    <nav className="sticky top-0 z-50 bg-[#16171d]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#fe5000] text-white shadow-[0_0_15px_rgba(254,80,0,0.5)] font-black p-2 rounded-lg text-xl tracking-tighter">CH</div>
          <span className="text-2xl font-black tracking-tight text-white">
            CUENTA <span className="text-[#fe5000]">HOGAR</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="flex items-center gap-2 text-sm font-bold bg-[#1a1c24] border border-[#fe5000]/30 text-white px-5 py-2.5 rounded-full hover:bg-zinc-900 hover:text-[#fe5000] transition-all">
            <LogIn className="w-4 h-4" />
            <span>Portal de Clientes</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
