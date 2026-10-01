"use client";

import { useState } from "react";
import { Calculator, MapPin, Package, Truck, ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

type Destination = {
  id: string;
  name: string;
  estimatedBase: number;
  timeframe: string;
};

const DESTINATIONS: Destination[] = [
  { id: "lincoln", name: "Lincoln", estimatedBase: 12000, timeframe: "Recorrido semanal" },
  { id: "chivilcoy", name: "Chivilcoy", estimatedBase: 14000, timeframe: "Recorrido semanal" },
  { id: "lostoldos", name: "Los Toldos", estimatedBase: 13000, timeframe: "Recorrido semanal" },
  { id: "obrien", name: "O'Brien", estimatedBase: 13500, timeframe: "Recorrido semanal" },
  { id: "zavalia", name: "Zavalía", estimatedBase: 12500, timeframe: "Recorrido semanal" },
  { id: "bragado", name: "Bragado", estimatedBase: 13800, timeframe: "Recorrido programado" },
  { id: "pehuajo", name: "Pehuajó", estimatedBase: 15500, timeframe: "Recorrido programado" },
  { id: "nuevedejulio", name: "9 de Julio", estimatedBase: 14500, timeframe: "Recorrido programado" },
  { id: "otra", name: "Otra Localidad (Consultar)", estimatedBase: 15000, timeframe: "A coordinar" },
];

type Category = {
  id: string;
  name: string;
  multiplier: number;
  icon: string;
  desc: string;
};

const CATEGORIES: Category[] = [
  { id: "electro_grande", name: "Electrodoméstico Grande", multiplier: 1.6, icon: "🧺", desc: "Heladera, Lavarropas, Cocina, Freezer" },
  { id: "tech_tv", name: "Tecnología / TV", multiplier: 1.0, icon: "📺", desc: "Smart TV, Notebook, Consola, Audio" },
  { id: "muebles", name: "Muebles / Colchón", multiplier: 1.8, icon: "🛋️", desc: "Sommier, Sofá, Mesa, Sillas" },
  { id: "bulto_std", name: "Bulto Estándar / Caja", multiplier: 0.8, icon: "📦", desc: "Cajas de compras, ropa, repuestos" },
  { id: "comercio", name: "Carga Múltiple (Comercio)", multiplier: 2.2, icon: "🏭", desc: "Múltiples bultos consolidables" },
];

export function EnviosCalculator() {
  const [selectedDest, setSelectedDest] = useState<string>("lincoln");
  const [selectedCat, setSelectedCat] = useState<string>("bulto_std");
  const [bultos, setBultos] = useState<number>(1);
  const [observaciones, setObservaciones] = useState<string>("");

  const destObj = DESTINATIONS.find((d) => d.id === selectedDest) || DESTINATIONS[0];
  const catObj = CATEGORIES.find((c) => c.id === selectedCat) || CATEGORIES[3];

  const estimatedTotal = Math.round(destObj.estimatedBase * catObj.multiplier * (1 + (bultos - 1) * 0.4));

  const generateWhatsAppMessage = () => {
    const text = `Hola Cuenta Hogar, estuve cotizando en el simulador de Envíos Low Cost:

📍 *Destino:* ${destObj.name}
📦 *Categoría:* ${catObj.name} (${catObj.desc})
🔢 *Cantidad de Bultos:* ${bultos}
💰 *Estimado de Referencia:* ~$${estimatedTotal.toLocaleString("es-AR")}

${observaciones ? `📝 *Detalles Adicionales:* ${observaciones}
` : ""}
La compra será entregada por el proveedor en su local de CABA (Caracas 1101). ¿Me pueden confirmar la cotización exacta y cómo coordinar la recepción?`;

    return `https://wa.me/5491125659686?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="bg-[#111318] border-2 border-[#173E3B] rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SELECCIÓN DE PARÁMETROS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. SELECCION DE DESTINO */}
          <div className="space-y-3">
            <label className="block text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#FFD21A]" /> 1. Seleccioná tu Localidad de Destino
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {DESTINATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDest(d.id)}
                  className={`p-3 rounded-xl border text-left text-xs font-heading font-bold transition-all ${
                    selectedDest === d.id
                      ? "bg-[#173E3B] text-white border-[#FFD21A] shadow-md"
                      : "bg-[#161922] text-[#D1D5DB] border-[#222530] hover:border-[#374151] hover:text-white"
                  }`}
                >
                  <span className="block font-extrabold text-sm">{d.name}</span>
                  <span className="block text-[10px] text-[#9CA3AF] font-normal mt-0.5">{d.timeframe}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. SELECCIÓN DE CATEGORÍA DE CARGA */}
          <div className="space-y-3">
            <label className="block text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#FFD21A]" /> 2. Tipo de Producto o Carga
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(c.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                    selectedCat === c.id
                      ? "bg-[#173E3B] text-white border-[#FFD21A] shadow-md"
                      : "bg-[#161922] text-[#D1D5DB] border-[#222530] hover:border-[#374151] hover:text-white"
                  }`}
                >
                  <span className="text-2xl shrink-0">{c.icon}</span>
                  <div>
                    <span className="block font-heading font-bold text-xs">{c.name}</span>
                    <span className="block text-[10px] text-[#9CA3AF] font-sans mt-0.5 leading-tight">{c.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. CANTIDAD DE BULTOS */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#FFD21A]" /> 3. Cantidad de Bultos o Paquetes
              </label>
              <span className="text-xs font-mono font-bold text-[#FFD21A] bg-[#161922] px-3 py-1 rounded-md border border-[#222530]">
                {bultos} {bultos === 1 ? "bulto" : "bultos"}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBultos(n)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                    bultos === n
                      ? "bg-[#FFD21A] text-[#111318] border-[#FFD21A] font-extrabold shadow-md"
                      : "bg-[#161922] text-[#9CA3AF] border-[#222530] hover:bg-[#1A1D26] hover:text-white"
                  }`}
                >
                  {n === 5 ? "5+" : n}
                </button>
              ))}
            </div>
          </div>

          {/* 4. NOTAS O DETALLES OPCIONALES */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-[#9CA3AF] uppercase">
              Detalle o Producto Específico (Opcional):
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Smart TV 55 pulgadas comprada en Mercado Libre..."
              className="w-full bg-[#161922] border border-[#222530] rounded-xl p-3 text-xs text-white placeholder-[#6B7280] outline-none focus:border-[#FFD21A] transition"
            />
          </div>

        </div>

        {/* RESUMEN Y BOTÓN DIRECTO A WHATSAPP */}
        <div className="lg:col-span-5 bg-[#161922] border border-[#222530] rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden">
          
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#222530] pb-3">
              <span className="text-xs font-mono font-bold uppercase text-[#FFD21A] tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FFD21A]" /> Estimador de Envío
              </span>
              <span className="text-[10px] bg-[#173E3B] text-white px-2.5 py-0.5 rounded-full font-heading font-bold uppercase">
                Low Cost Directo
              </span>
            </div>

            <div className="space-y-3 text-xs text-[#D1D5DB]">
              <div className="flex justify-between py-1.5 border-b border-[#222530]">
                <span className="text-[#9CA3AF]">Destino:</span>
                <strong className="text-white font-heading">{destObj.name}</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#222530]">
                <span className="text-[#9CA3AF]">Tipo de Carga:</span>
                <strong className="text-white font-heading">{catObj.name}</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#222530]">
                <span className="text-[#9CA3AF]">Recepción CABA:</span>
                <strong className="text-[#FFD21A] font-mono">Caracas 1101</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#222530]">
                <span className="text-[#9CA3AF]">Consolidación:</span>
                <strong className="text-emerald-400 font-bold">Sin Cargo</strong>
              </div>
            </div>

            {/* PRECIO ESTIMADO */}
            <div className="bg-[#111318] border border-[#173E3B] p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-[#9CA3AF]">Costo Estimado Referencial</span>
              <div className="text-3xl font-heading font-extrabold text-[#FFD21A] font-mono">
                ~${estimatedTotal.toLocaleString("es-AR")}
              </div>
              <p className="text-[10px] text-[#9CA3AF] font-sans">
                *Sujeto a confirmación según dimensiones exactas y fragilidad.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={generateWhatsAppMessage()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-heading font-extrabold px-6 py-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#FFD21A]/20 active:scale-95"
            >
              <span>Confirmar Cotización por WhatsApp</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#9CA3AF]">
              <ShieldCheck className="w-4 h-4 text-[#2F7D5C]" />
              <span>Respuesta garantizada en horario comercial</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
