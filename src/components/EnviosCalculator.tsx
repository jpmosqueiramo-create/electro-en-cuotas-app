"use client";

import { useEffect, useState } from "react";
import { Calculator, MapPin, Package, Truck, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, RefreshCw } from "lucide-react";
import { 
  getShippingPublishedConfig, 
  evaluateRateQuote, 
  PublicShippingConfig, 
  PublicShippingDestination, 
  PublicShippingLoadType 
} from "@/lib/shippingManager";

export function EnviosCalculator() {
  const [config, setConfig] = useState<PublicShippingConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedDest, setSelectedDest] = useState<string>("");
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [bultos, setBultos] = useState<number>(1);
  const [observaciones, setObservaciones] = useState<string>("");

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      const data = await getShippingPublishedConfig();
      setConfig(data);
      if (data && data.destinations) {
        const activeDests = data.destinations
          .filter((d) => d.active !== false && d.visible !== false)
          .sort((a, b) => a.order - b.order);
        if (activeDests.length > 0) {
          setSelectedDest(activeDests[0].id);
        }
      }
      if (data && data.loadTypes) {
        const activeLoads = data.loadTypes
          .filter((l) => l.active !== false && l.visible !== false)
          .sort((a, b) => a.order - b.order);
        if (activeLoads.length > 0) {
          setSelectedCat(activeLoads[0].id);
        }
      }
      setLoading(false);
    }

    loadConfig();
  }, []);

  const activeDestinations: PublicShippingDestination[] = (config?.destinations || [])
    .filter((d) => d.active !== false && d.visible !== false)
    .sort((a, b) => a.order - b.order);

  const activeLoadTypes: PublicShippingLoadType[] = (config?.loadTypes || [])
    .filter((l) => l.active !== false && l.visible !== false)
    .sort((a, b) => a.order - b.order);

  const currentDest = activeDestinations.find((d) => d.id === selectedDest) || activeDestinations[0];
  const currentLoad = activeLoadTypes.find((l) => l.id === selectedCat) || activeLoadTypes[0];

  const maxAutoBultos = config?.settings?.maxAutoBultos || 4;
  const isCalculatorActive = config?.settings?.calculatorActive !== false;

  const evaluation = config && isCalculatorActive
    ? evaluateRateQuote(config, selectedDest, selectedCat, bultos)
    : { price: 0, manualQuote: true, reason: !config ? "No hay configuración disponible" : "Calculadora desactivada" };

  const generateWhatsAppMessage = () => {
    const destName = currentDest ? currentDest.name : "A consultar";
    const catName = currentLoad ? currentLoad.name : "Carga general";
    const catDesc = currentLoad ? currentLoad.desc : "";

    let priceText = "";
    if (config && !evaluation.manualQuote && evaluation.price > 0) {
      priceText = `💰 *Estimado de Referencia:* ~$${evaluation.price.toLocaleString("es-AR")}`;
    } else {
      priceText = `💰 *Cotización:* Requiere Cotización Personalizada`;
    }

    const text = `Hola Cuenta Hogar, estuve cotizando en el simulador de Envíos Low Cost:

📍 *Destino:* ${destName}
📦 *Categoría:* ${catName}${catDesc ? ` (${catDesc})` : ""}
🔢 *Cantidad de Bultos:* ${bultos === 5 ? "5+" : bultos}
${priceText}

${observaciones ? `📝 *Detalles Adicionales:* ${observaciones}
` : ""}La compra será entregada por el proveedor en su local de CABA (Caracas 1101). ¿Me pueden confirmar la cotización exacta y cómo coordinar la recepción?`;

    return `https://wa.me/5491125659686?text=${encodeURIComponent(text)}`;
  };

  if (loading) {
    return (
      <div className="bg-[#111318] border-2 border-[#173E3B] rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#FFD21A]" />
        <p className="text-sm font-heading font-bold text-[#FFD21A]">Cargando tarifas de Envíos Low Cost...</p>
      </div>
    );
  }

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
            {activeDestinations.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] italic">No hay localidades disponibles en este momento.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {activeDestinations.map((d) => (
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
            )}
          </div>

          {/* 2. SELECCIÓN DE CATEGORÍA DE CARGA */}
          <div className="space-y-3">
            <label className="block text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#FFD21A]" /> 2. Tipo de Producto o Carga
            </label>
            {activeLoadTypes.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] italic">No hay categorías de carga disponibles en este momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeLoadTypes.map((c) => (
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
            )}
          </div>

          {/* 3. CANTIDAD DE BULTOS */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#FFD21A]" /> 3. Cantidad de Bultos o Paquetes
              </label>
              <span className="text-xs font-mono font-bold text-[#FFD21A] bg-[#161922] px-3 py-1 rounded-md border border-[#222530]">
                {bultos === 5 ? "5+" : bultos} {bultos === 1 ? "bulto" : "bultos"}
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
              className="w-full bg-[#161922] border border-[#222530] rounded-xl p-3 text-xs text-[#FFFDFC] placeholder-[#6B7280] outline-none focus:border-[#FFD21A] transition"
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
                <strong className="text-white font-heading">{currentDest ? currentDest.name : "Por definir"}</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-[#222530]">
                <span className="text-[#9CA3AF]">Tipo de Carga:</span>
                <strong className="text-white font-heading">{currentLoad ? currentLoad.name : "Por definir"}</strong>
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

            {/* PRECIO ESTIMADO O COTIZACIÓN PERSONALIZADA */}
            <div className="bg-[#111318] border border-[#173E3B] p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-[#9CA3AF]">Costo Estimado Referencial</span>
              
              {!config || !isCalculatorActive || evaluation.manualQuote ? (
                <div className="py-1 space-y-1">
                  <div className="text-base sm:text-lg font-heading font-bold text-[#FFD21A]">
                    Cotización personalizada
                  </div>
                  <p className="text-[10px] text-[#9CA3AF] font-sans leading-tight">
                    {!config 
                      ? "No podemos calcular un valor automático en este momento. Consultanos por WhatsApp y te cotizamos el envío."
                      : "Necesitamos revisar las características de este envío para darte el valor correcto."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-heading font-extrabold text-[#FFD21A] font-mono">
                    ~$${evaluation.price.toLocaleString("es-AR")}
                  </div>
                  <p className="text-[10px] text-[#9CA3AF] font-sans">
                    *Sujeto a confirmación según dimensiones exactas y fragilidad.
                  </p>
                </>
              )}
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
