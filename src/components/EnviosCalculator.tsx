"use client";

import { useEffect, useState } from "react";
import { 
  Calculator, 
  MapPin, 
  Package, 
  Truck, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw,
  Building2,
  Tv,
  Layers,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { 
  getShippingPublishedConfig, 
  evaluateRateQuote, 
  PublicShippingConfig, 
  PublicShippingDestination, 
  PublicShippingLoadType 
} from "@/lib/shippingManager";

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.419c-1.776 0-3.517-.476-5.044-1.377l-.362-.215-3.744.982.999-3.648-.236-.375c-.991-1.574-1.513-3.612-1.513-5.696 0-5.836 4.75-10.587 10.587-10.587 2.828 0 5.486 1.1 7.485 3.101 1.999 2 3.098 4.658 3.097 7.487 0 5.837-4.75 10.588-10.587 10.588m0-20.709c-6.726 0-12.2 5.474-12.2 12.2 0 2.147.56 4.246 1.624 6.091l-1.724 6.295 6.442-1.69c1.782.971 3.792 1.485 5.858 1.485 6.726 0 12.2-5.474 12.2-12.2 0-3.26-1.27-6.324-3.578-8.631-2.308-2.307-5.37-3.576-8.622-3.576" />
    </svg>
  );
}

function getLoadIcon(id: string, name: string) {
  const lower = (id + " " + name).toLowerCase();
  if (lower.includes("electro") || lower.includes("heladera") || lower.includes("lavarropas")) {
    return <Building2 className="w-5 h-5 text-[#111318]" />;
  }
  if (lower.includes("tv") || lower.includes("tecnologia") || lower.includes("tele")) {
    return <Tv className="w-5 h-5 text-[#111318]" />;
  }
  if (lower.includes("mueble") || lower.includes("sommier") || lower.includes("colch")) {
    return <Layers className="w-5 h-5 text-[#111318]" />;
  }
  return <Package className="w-5 h-5 text-[#111318]" />;
}

export function EnviosCalculator() {
  const [config, setConfig] = useState<PublicShippingConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initial selection is empty until user chooses
  const [selectedDest, setSelectedDest] = useState<string>("");
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [bultos, setBultos] = useState<number>(1);
  const [observaciones, setObservaciones] = useState<string>("");

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      const data = await getShippingPublishedConfig();
      setConfig(data);
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

  const currentDest = activeDestinations.find((d) => d.id === selectedDest);
  const currentLoad = activeLoadTypes.find((l) => l.id === selectedCat);

  const isCalculatorActive = config?.settings?.calculatorActive !== false;
  const isSelectionComplete = Boolean(selectedDest && selectedCat);

  const evaluation = (config && isCalculatorActive && isSelectionComplete)
    ? evaluateRateQuote(config, selectedDest, selectedCat, bultos)
    : { price: 0, manualQuote: true, reason: !config ? "No hay configuración disponible" : "Selección incompleta" };

  const generateWhatsAppMessage = () => {
    const destName = currentDest ? currentDest.name : "A consultar";
    const catName = currentLoad ? currentLoad.name : "Carga general";
    const catDesc = currentLoad ? currentLoad.desc : "";

    let priceText = "";
    if (config && isSelectionComplete && !evaluation.manualQuote && evaluation.price > 0) {
      priceText = `💰 *Estimado de Referencia:* AR$ ${evaluation.price.toLocaleString("es-AR")}`;
    } else {
      priceText = `💰 *Cotización:* Requiere Cotización Personalizada`;
    }

    const text = `Hola Cuenta Hogar, estuve cotizando en la calculadora de Envíos Low Cost:

📍 *Destino:* ${destName}
📦 *Tipo de Carga:* ${catName}${catDesc ? ` (${catDesc})` : ""}
🔢 *Cantidad de Bultos:* ${bultos === 5 ? "5+" : bultos}
${priceText}

${observaciones ? `📝 *Detalle Adicional:* ${observaciones}
` : ""}La compra será entregada por el proveedor en su local de CABA (Caracas 1101). Servicio disponible desde el 25 de noviembre de 2026. ¿Me pueden brindar información sobre el envío a mi localidad?`;

    return `https://wa.me/5491125659686?text=${encodeURIComponent(text)}`;
  };

  if (loading) {
    return (
      <div className="bg-[#FFFFFF] border border-[#DCE1E6] rounded-3xl p-8 sm:p-12 shadow-sm text-center space-y-4 max-w-4xl mx-auto">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#111318]" />
        <p className="text-sm font-semibold text-[#111318]">Cargando tarifas de Envíos Low Cost...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-[#FFFFFF] border border-[#DCE1E6] rounded-3xl p-8 sm:p-10 shadow-sm text-center space-y-4 max-w-2xl mx-auto">
        <AlertCircle className="w-10 h-10 text-[#56616E] mx-auto" />
        <h3 className="text-lg font-bold text-[#111318]">No pudimos cargar las tarifas en este momento</h3>
        <p className="text-xs sm:text-sm text-[#56616E]">
          Podés consultarnos directamente por WhatsApp y te ayudamos con la cotización de tu envío.
        </p>
        <div className="pt-2">
          <a
            href={generateWhatsAppMessage()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#E8B900] text-[#111318] font-extrabold px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm"
          >
            <WhatsAppIcon className="w-4.5 h-4.5 text-[#111318]" />
            <span>CONSULTAR POR WHATSAPP</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#DCE1E6] rounded-3xl p-5 sm:p-8 lg:p-10 shadow-sm space-y-8 text-left">
      
      {/* INDICADOR VISUAL DE PASOS */}
      <div className="flex items-center justify-center gap-2 text-xs font-mono font-semibold text-[#56616E] bg-[#F4F6F8] border border-[#DCE1E6] py-2 px-4 rounded-xl max-w-md mx-auto">
        <span className={selectedDest ? "text-[#111318] font-bold" : ""}>1. Destino</span>
        <span className="text-[#DCE1E6]">→</span>
        <span className={selectedCat ? "text-[#111318] font-bold" : ""}>2. Tipo de carga</span>
        <span className="text-[#DCE1E6]">→</span>
        <span className={isSelectionComplete ? "text-[#111318] font-bold" : ""}>3. Estimación</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO Y CONTROLES (60-62%) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* PASO 1. SELECCIÓN DE LOCALIDAD */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-extrabold text-[#111318]">
                1. ¿A qué localidad querés enviarlo?
              </h3>
              <p className="text-xs text-[#56616E]">
                Elegí el destino del recorrido.
              </p>
            </div>

            {activeDestinations.length === 0 ? (
              <p className="text-xs text-[#56616E] italic">No hay localidades disponibles en este momento.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeDestinations.map((d) => {
                  const isSelected = selectedDest === d.id;
                  const isOtra = d.name.toLowerCase().includes("otra");

                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDest(d.id)}
                      className={`p-3.5 rounded-2xl border text-left min-h-[74px] transition-all flex flex-col justify-between relative cursor-pointer ${
                        isSelected
                          ? "bg-[#FFFDF5] border-2 border-[#FFD21A] text-[#111318] shadow-sm"
                          : "bg-[#FFFFFF] border-[#DCE1E6] hover:border-[#FFD21A] text-[#111318]"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-xs sm:text-sm leading-snug">
                          {isOtra ? "Otra localidad" : d.name}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#111318] shrink-0 ml-1" />
                        )}
                      </div>
                      <span className="text-[11px] text-[#56616E] font-medium mt-1">
                        {isOtra ? "Consultar cobertura" : (d.timeframe || "Recorrido previsto")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PASO 2. SELECCIÓN DE TIPO DE CARGA */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-base font-extrabold text-[#111318]">
                2. ¿Qué necesitás traer?
              </h3>
              <p className="text-xs text-[#56616E]">
                Elegí la opción que más se parezca a tu compra.
              </p>
            </div>

            {activeLoadTypes.length === 0 ? (
              <p className="text-xs text-[#56616E] italic">No hay tipos de carga disponibles en este momento.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeLoadTypes.map((c) => {
                  const isSelected = selectedCat === c.id;
                  const icon = getLoadIcon(c.id, c.name);

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCat(c.id)}
                      className={`p-4 rounded-2xl border text-left min-h-[76px] transition-all flex items-start gap-3.5 relative cursor-pointer ${
                        isSelected
                          ? "bg-[#FFFDF5] border-2 border-[#FFD21A] text-[#111318] shadow-sm"
                          : "bg-[#FFFFFF] border-[#DCE1E6] hover:border-[#FFD21A] text-[#111318]"
                      }`}
                    >
                      <div className="p-2 bg-[#F4F6F8] rounded-xl shrink-0 mt-0.5">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0 pr-5">
                        <span className="block font-bold text-xs sm:text-sm text-[#111318] leading-tight">
                          {c.name}
                        </span>
                        {c.desc && (
                          <span className="block text-[11px] text-[#56616E] mt-1 leading-snug">
                            {c.desc}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#111318] shrink-0 absolute top-4 right-4" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* PASO 3. CANTIDAD DE BULTOS (OCIONAL SEGÚN SELECCIÓN) */}
          <div className="space-y-3 pt-2 border-t border-[#DCE1E6]">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-mono font-bold text-[#111318] uppercase tracking-wider">
                ¿Cuántos bultos son?
              </h3>
              <span className="text-xs font-mono font-bold text-[#111318] bg-[#F4F6F8] px-3 py-1 rounded-md border border-[#DCE1E6]">
                {bultos === 5 ? "5+" : bultos} {bultos === 1 ? "bulto" : "bultos"}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBultos(n)}
                  className={`flex-1 min-h-[44px] py-2.5 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                    bultos === n
                      ? "bg-[#FFD21A] text-[#111318] border-[#FFD21A] font-extrabold shadow-xs"
                      : "bg-[#FFFFFF] text-[#56616E] border-[#DCE1E6] hover:border-[#FFD21A] hover:text-[#111318]"
                  }`}
                >
                  {n === 5 ? "5+" : n}
                </button>
              ))}
            </div>
          </div>

          {/* DETALLES ADICIONALES OPCIONALES */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-bold text-[#56616E] uppercase">
              Detalle o producto específico (opcional):
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Smart TV 55 pulgadas comprada en Mercado Libre..."
              className="w-full bg-[#F4F6F8] border border-[#DCE1E6] rounded-xl p-3 text-xs text-[#111318] placeholder-[#56616E] outline-none focus:border-[#FFD21A] transition font-medium"
            />
          </div>

        </div>

        {/* COLUMNA DERECHA: RESUMEN Y RESULTADO DE ESTIMACIÓN (38-40%) */}
        <div className="lg:col-span-5 bg-[#F4F6F8] border border-[#DCE1E6] rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xs text-left">
          
          <div className="space-y-5">
            <div className="border-b border-[#DCE1E6] pb-3 space-y-1">
              <h3 className="text-base font-extrabold text-[#111318]">
                Resumen de tu envío
              </h3>
              <p className="text-xs text-[#56616E]">
                Revisá los datos antes de continuar.
              </p>
            </div>

            {/* SI TODAVÍA NO SELECCIONÓ AMBOS PARÁMETROS */}
            {!isSelectionComplete ? (
              <div className="py-8 text-center space-y-3 bg-[#FFFFFF] border border-[#DCE1E6] rounded-xl p-6">
                <HelpCircle className="w-8 h-8 text-[#56616E] mx-auto opacity-50" />
                <p className="text-xs sm:text-sm font-semibold text-[#111318] leading-relaxed">
                  Elegí una localidad y un tipo de carga para ver la estimación.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* DETALLE DE FILAS EN LENGUAJE CLARO */}
                <div className="space-y-2.5 text-xs text-[#111318]">
                  <div className="flex justify-between py-2 border-b border-[#DCE1E6]">
                    <span className="text-[#56616E]">Destino:</span>
                    <strong className="font-extrabold">{currentDest ? currentDest.name : "-"}</strong>
                  </div>

                  <div className="flex justify-between py-2 border-b border-[#DCE1E6]">
                    <span className="text-[#56616E]">Tipo de carga:</span>
                    <strong className="font-extrabold">{currentLoad ? currentLoad.name : "-"}</strong>
                  </div>

                  <div className="flex justify-between py-2 border-b border-[#DCE1E6]">
                    <span className="text-[#56616E]">Cantidad:</span>
                    <strong className="font-mono font-bold">{bultos === 5 ? "5+" : bultos} bulto(s)</strong>
                  </div>

                  <div className="flex justify-between py-2 border-b border-[#DCE1E6]">
                    <span className="text-[#56616E]">Punto de recepción en CABA:</span>
                    <strong className="font-mono font-bold text-[#111318]">Caracas 1101</strong>
                  </div>
                </div>

                {/* RESULTADO DE ESTIMACIÓN O COTIZACIÓN PERSONALIZADA */}
                {evaluation.manualQuote || evaluation.price <= 0 ? (
                  <div className="bg-[#FFFFFF] border border-[#FFD21A]/80 p-5 rounded-xl text-center space-y-2 shadow-xs">
                    <span className="text-[10px] font-mono font-bold text-[#56616E] uppercase tracking-wider block">
                      COTIZACIÓN ESPECIAL
                    </span>
                    <p className="text-sm sm:text-base font-extrabold text-[#111318]">
                      Necesitamos cotizar este envío personalmente
                    </p>
                    <p className="text-xs text-[#56616E] leading-relaxed">
                      Hay envíos que necesitan una revisión rápida para darte un valor correcto.
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#FFFFFF] border border-[#DCE1E6] p-5 rounded-xl text-center space-y-1.5 shadow-xs">
                    <span className="text-[10px] font-mono font-bold text-[#56616E] uppercase tracking-wider block">
                      VALOR ESTIMADO
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-[#111318] font-mono">
                      AR$ ${evaluation.price.toLocaleString("es-AR")}
                    </div>
                    <p className="text-[11px] text-[#56616E] leading-tight">
                      Valor estimado para los datos seleccionados. La cotización final se confirma al revisar las características del bulto.
                    </p>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* CTA WHATSAPP & MICROCOPY DE CIERRE */}
          <div className="space-y-3 pt-2">
            <a
              href={generateWhatsAppMessage()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2.5 bg-[#FFD21A] hover:bg-[#E8B900] text-[#111318] font-extrabold px-6 h-[52px] sm:h-[56px] rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <WhatsAppIcon className="w-5 h-5 text-[#111318]" />
              <span>CONTINUAR POR WHATSAPP</span>
            </a>

            <p className="text-[11px] text-[#56616E] text-center font-medium">
              Continuá por WhatsApp para confirmar los detalles del envío.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
