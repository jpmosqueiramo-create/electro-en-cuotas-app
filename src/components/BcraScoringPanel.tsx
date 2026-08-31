"use client";

import React from "react";
import { ShieldCheck, ExternalLink, Search } from "lucide-react";

interface Props {
  cuit?: string;
}

export function BcraScoringPanel({ cuit }: Props) {
  const cuitClean = (cuit || "").replace(/\D/g, "");

  return (
    <div className="bg-[#121316] border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-md">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <h5 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-400" /> Scoring Central BCRA / Nosis
        </h5>
        <span className="text-[10px] text-zinc-500 font-mono">Ley 25.326</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href={`https://www.bcra.gob.ar/BCRAyVos/Central_de_deudores.asp`}
          target="_blank"
          rel="noreferrer"
          className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 transition flex items-center gap-1.5 shadow-sm"
        >
          <Search className="w-3.5 h-3.5" /> Central de Deudores BCRA ({cuitClean || "Consulta"}) <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
