"use client";

import React from "react";

export default function PublicLocationMarquee() {
  const localidades = ["O’BRIEN", "LINCOLN", "CHIVILCOY", "LOS TOLDOS", "ZAVALÍA"];

  // Render a block of locations with middle dots
  const renderLocationBlock = (keyPrefix: string) => (
    <div className="flex items-center gap-4 px-2 shrink-0">
      {localidades.map((loc, idx) => (
        <React.Fragment key={`${keyPrefix}-${idx}`}>
          <span className="font-heading font-bold uppercase tracking-wider text-[11px] sm:text-xs text-[#111318] whitespace-nowrap">
            {loc}
          </span>
          <span className="text-[#111318] font-bold text-xs select-none">·</span>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="w-full bg-[#FFD21A] overflow-hidden select-none border-b border-[#E5B800] h-[28px] sm:h-[32px] flex items-center relative z-40">
      <div className="animate-marquee-continuous flex items-center">
        {/* Render repeated blocks in first half and second half for seamless -50% translateX loop */}
        <div className="flex items-center">
          {renderLocationBlock("b1-1")}
          {renderLocationBlock("b1-2")}
          {renderLocationBlock("b1-3")}
          {renderLocationBlock("b1-4")}
        </div>
        <div className="flex items-center" aria-hidden="true">
          {renderLocationBlock("b2-1")}
          {renderLocationBlock("b2-2")}
          {renderLocationBlock("b2-3")}
          {renderLocationBlock("b2-4")}
        </div>
      </div>
    </div>
  );
}
