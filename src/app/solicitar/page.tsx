"use client";
import { CuentaHogarLogo } from '@/components/CuentaHogarLogo';

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { fetchPublicCatalogReference } from "@/lib/publicCatalogClient";
import { selectPublishedPlan, publicCatalogSelection } from "@/lib/publicCatalogContract";
import { createPublicSolicitudSender } from "@/lib/publicSolicitudClient";
import type { CatalogReferencePublic } from "@/lib/catalogReference";

function SolicitarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productoId = searchParams.get("id");
  const sender=useRef<ReturnType<typeof createPublicSolicitudSender>|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const [submitError,setSubmitError]=useState("");

  const [productoData, setProductoData] = useState<CatalogReferencePublic | null>(null);
  const [activeSolImage, setActiveSolImage] = useState<string>("");
  
  // Nombres de los campos requeridos
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [necesidad, setNecesidad] = useState("");

  const cuotasParam = searchParams.get("cuotas");
  const [planElegido, setPlanElegido] = useState("");
  const [referenceState, setReferenceState] = useState("loading");
  const [referenceError, setReferenceError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
    if (controller.signal.aborted) return;
    setProductoData(null); setPlanElegido(""); setReferenceError("");
    if (!productoId) { setReferenceState("empty"); return; }
    setReferenceState("loading");
    return fetchPublicCatalogReference(productoId, controller.signal).then(reference => {
      if (controller.signal.aborted) return;
      setProductoData(reference); setReferenceState(reference ? "ready" : "not_found");
      setActiveSolImage(reference?.imagenUrls[0] ?? "");
      if (reference) setPlanElegido(selectPublishedPlan(reference, cuotasParam));
    }).catch(error => { if (!controller.signal.aborted) { setReferenceState("error"); setReferenceError(error.message); } });
    });
    return () => controller.abort();
  }, [productoId, cuotasParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productoId && (!productoData || referenceState !== "ready" || (planElegido && !productoData.planesPublicados.some(plan => String(plan.cuotas) === planElegido)))) return alert("Elegí un plan publicado disponible.");
    if(submitting)return;
    setSubmitting(true);setSubmitError("");
    try {
      sender.current ??= createPublicSolicitudSender('catalog');
      const selection=productoData&&planElegido?publicCatalogSelection(productoData,planElegido):null;
      await sender.current({tipo:'consulta_v2',productoNombre:productoData?.nombre||necesidad,...(productoData?{productoId:productoData.referenciaId}:{}),
        ...(selection||{}),nombreCompleto,whatsapp,localidad});
      const mensaje=`Hola, registré una consulta de gestión de compra. Soy ${nombreCompleto} de ${localidad}. Necesito: ${productoData?.nombre||necesidad}. ${selection?`Plan preferido: ${planElegido} cuotas; cuota estimada: ${selection.montoCuota}. La preferencia no constituye aceptación contractual.`:''}`;
      window.location.href=`https://wa.me/5491125659686?text=${encodeURIComponent(mensaje)}`;
    }catch(error){setSubmitError(error instanceof Error?error.message:'No pudimos confirmar el registro. Reintentá.');}
    finally{setSubmitting(false);}
  };

  return (
    <div className="min-h-screen bg-[#111318] text-white px-4 py-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-3xl bg-[#161922] border border-[#222530] shadow-xl rounded-3xl p-6 sm:p-10">
        <div className="flex justify-between items-start mb-8">
          <button onClick={()=>router.push("/")} className="text-[#9CA3AF] hover:text-[#FFD21A] flex items-center gap-1 text-sm transition-colors font-bold">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center gap-2">
            <CuentaHogarLogo className="h-14 md:h-16 w-auto object-contain" />
          </div>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-[#FFD21A] mb-2 leading-tight font-heading">Consultar una compra</h1>
        <p className="text-[#9CA3AF] mb-8 font-normal">Decinos qué necesitás. Los datos y documentos se piden después de aceptar un presupuesto.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {referenceState === "loading" && <p role="status">Cargando referencia…</p>}
          {referenceState === "error" && <p role="alert">{referenceError}</p>}
          {referenceState === "not_found" && <p role="alert">Esta referencia ya no está disponible.</p>}
          {/* SECCIÓN PRODUCTO */}
          {productoData && (
            <div className="bg-[#111318] border border-[#222530] p-6 rounded-2xl space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className="w-24 h-24 bg-[#161922] border border-[#222530] rounded-xl p-1 flex items-center justify-center relative overflow-hidden shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={activeSolImage || productoData.imagenUrls[0]}
                      alt={productoData.nombre} 
                      className="max-w-full max-h-full object-contain" 
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/logo-cuenta-hogar-oficial.png"; }} 
                    />
                  </div>
                  {/* Pequeñas miniaturas si hay más de 1 imagen */}
                  {productoData.imagenUrls && productoData.imagenUrls.length > 1 && (
                    <div className="flex gap-1 justify-center max-w-[96px] overflow-x-auto py-1">
                      {productoData.imagenUrls.map((url: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveSolImage(url)}
                          className={`w-4 h-4 rounded border transition-all ${
                            (activeSolImage || productoData.imagenUrls[0]) === url
                              ? 'border-[#173E3B] bg-[#FFD21A]/10' 
                              : 'border-[#222530] hover:border-[#173E3B]'
                          }`}
                        >
                          <span className="sr-only">Imagen {idx + 1}</span>
                          <span className="block w-full h-full bg-cover bg-center rounded-[2px]" style={{ backgroundImage: `url(${url})` }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xs text-[#FFD21A] font-bold tracking-widest uppercase">Producto a gestionar</p>
                  <p className="font-bold text-white text-lg font-heading">{productoData.nombre}</p>
                </div>
              </div>
              
              <div className="border-t border-[#222530] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Plan estimado (opcional)</label>
                  <select aria-label="Plan publicado"
                    value={planElegido} 
                    onChange={e => setPlanElegido(e.target.value)}
                    className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-bold text-base shadow-sm"
                  >
                    <option value="">Sin preferencia por ahora</option>
                    {productoData.planesPublicados.map(plan => <option key={plan.cuotas} value={String(plan.cuotas)}>{plan.cuotas} cuotas estimadas (${plan.cuotaEstimada.toLocaleString("es-AR")} / mes)</option>)}
                  </select>
                </div>
                <div className="flex flex-col justify-center bg-[#161922] p-4 rounded-xl border border-[#222530] shadow-sm">
                  <p className="text-xs text-[#9CA3AF] font-bold uppercase tracking-wider">Valor Mensual de la Cuota</p>
                  <p className="text-2xl font-bold text-[#FFD21A] mt-1 font-heading">
                    {productoData.planesPublicados.find(plan => String(plan.cuotas) === planElegido)?.cuotaEstimada.toLocaleString("es-AR", { style: "currency", currency: "ARS" }) ?? "Elegí un plan"} <span className="text-xs font-normal text-[#9CA3AF]">/ mes</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!productoId && <label className="sm:col-span-2">Producto o necesidad<input required maxLength={200} value={necesidad} onChange={e=>setNecesidad(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[#222530] bg-[#111318] p-3" /></label>}
            <label className="sm:col-span-2">Nombre y apellido<input required autoComplete="name" maxLength={150} value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[#222530] bg-[#111318] p-3" /></label>
            <label>WhatsApp<input required autoComplete="tel" type="tel" maxLength={50} value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[#222530] bg-[#111318] p-3" /></label>
            <label>Localidad<input required autoComplete="address-level2" maxLength={150} value={localidad} onChange={e=>setLocalidad(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[#222530] bg-[#111318] p-3" /></label>
          </div>

          {submitError && <p role="alert" className="text-sm text-white">{submitError}</p>}
          <button disabled={submitting || (!!productoId && referenceState !== "ready")} type="submit" className="w-full group flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#123230] text-[#111318] hover:text-white font-bold text-base sm:text-lg py-4.5 sm:py-5 rounded-2xl hover:scale-[1.01] active:scale-95 transition-all duration-300 shadow-md shadow-[#173E3B]/20">
            {submitting?"Registrando solicitud…":"Enviar consulta y hablar con un asesor"} <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SolicitarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111318] text-white flex items-center justify-center font-sans">Cargando formulario...</div>}>
      <SolicitarForm />
    </Suspense>
  );
}