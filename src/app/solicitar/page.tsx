"use client";

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
  const [numeroDni, setNumeroDni] = useState("");
  const [cuil, setCuil] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [email, setEmail] = useState("");
  const [antiguedadLaboral, setAntiguedadLaboral] = useState("1 a 3 años");
  const [nombreAfiliado, setNombreAfiliado] = useState("");
  const [referidoPor, setReferidoPor] = useState("");

  const cuotasParam = searchParams.get("cuotas");
  const [planElegido, setPlanElegido] = useState("");
  const [referenceState, setReferenceState] = useState("loading");
  const [referenceError, setReferenceError] = useState("");

  const handleCuilChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 11);
    let formatted = clean;
    if (clean.length > 2) {
      formatted = `${clean.slice(0, 2)}-${clean.slice(2)}`;
    }
    if (clean.length > 10) {
      formatted = `${clean.slice(0, 2)}-${clean.slice(2, 10)}-${clean.slice(10)}`;
    }
    setCuil(formatted);
  };

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
    if (productoId && (!productoData || referenceState !== "ready" || !productoData.planesPublicados.some(plan => String(plan.cuotas) === planElegido))) return alert("Elegí un plan publicado disponible.");
// DNI Photo Upload disabled by requirement

    const cuilRegex = /^\d{2}-\d{8}-\d{1}$/;
    if (!cuilRegex.test(cuil)) {
      alert("Por favor ingresa un CUIL válido en formato XX-XXXXXXXX-X (con guiones).");
      return;
    }

    if(submitting)return;
    setSubmitting(true);setSubmitError("");
    try {
      sender.current ??= createPublicSolicitudSender('catalog');
      const selection=productoData?publicCatalogSelection(productoData,planElegido):null;
      await sender.current({tipo:'apertura_cuenta',productoNombre:selection?.productoNombre||'A definir',
        ...(selection||{}),nombreCompleto,numeroDni,cuil,fechaNacimiento,whatsapp,direccion,localidad,
        codigoPostal,ocupacion,email,antiguedadLaboral,nombreAfiliado,referidoPor});
      const mensaje=`Hola, registré una solicitud de gestión de compra. Soy ${nombreCompleto}. Referencia: ${productoData?.nombre||'A definir'}. Plan preferido: ${planElegido} cuotas; cuota estimada: ${selection?.montoCuota??'a definir'}. Mi DNI es ${numeroDni}. La preferencia no constituye aceptación contractual.`;
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
            <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-14 md:h-16 w-auto object-contain" />
          </div>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-[#FFD21A] mb-2 leading-tight font-heading">Apertura de Cuenta de Confianza</h1>
        <p className="text-[#9CA3AF] mb-8 font-normal">Completá este formulario para que analicemos tu perfil a sola firma y armemos tu plan a medida.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {referenceState === "loading" && <p role="status">Cargando referencia…</p>}
          {referenceState === "error" && <p role="alert">{referenceError}</p>}
          {referenceState === "not_found" && <p role="alert">Esta referencia ya no está disponible.</p>}
          {referenceState === "empty" && <p>Referencia de compra: A definir.</p>}
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
                  <label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Elegir Plan de Cuotas</label>
                  <select aria-label="Plan publicado" required
                    value={planElegido} 
                    onChange={e => setPlanElegido(e.target.value)}
                    className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-bold text-base shadow-sm"
                  >
                    <option value="">Elegí un plan publicado</option>
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

          {/* DATOS PERSONALES */}
          <div className="bg-[#111318]/60 border border-[#222530] p-6 sm:p-8 rounded-2xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="md:col-span-2">
                <label className="block text-sm text-white mb-1.5 font-bold">Nombre y Apellido</label>
                <input required value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} type="text" placeholder="Ej: Juan Perez" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-white mb-1.5 font-bold">DNI</label>
                <input required value={numeroDni} onChange={e=>setNumeroDni(e.target.value)} type="number" placeholder="Ej: 30123456" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-white mb-1.5 font-bold">CUIL (formato con guiones)</label>
                <input required value={cuil} onChange={e=>handleCuilChange(e.target.value)} type="text" placeholder="Ej: 20-30123456-7" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-mono font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-white mb-1.5 font-bold">Fecha de Nacimiento</label>
                <input required value={fechaNacimiento} onChange={e=>setFechaNacimiento(e.target.value)} type="date" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-white mb-1.5 font-bold">WhatsApp</label>
                <input required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} type="tel" placeholder="Ej: +54 9 11 1234-5678" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-white mb-1.5 font-bold">Ocupación</label>
                <input required value={ocupacion} onChange={e=>setOcupacion(e.target.value)} type="text" placeholder="Ej: Empleado de comercio" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-white mb-1.5 font-bold">Correo Electrónico (Obligatorio)</label>
                <input required value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Ej: juanperez@gmail.com" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-white mb-1.5 font-bold">Antigüedad Laboral (Fecha de Ingreso)</label>
                <input required value={antiguedadLaboral} onChange={e=>setAntiguedadLaboral(e.target.value)} type="date" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-white mb-1.5 font-bold">Domicilio (Calle y N°)</label>
                <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" placeholder="Ej: Av. San Martín 1500, Piso 2A" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-white mb-1.5 font-bold">Localidad</label>
                <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" placeholder="Ej: Junín" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-white mb-1.5 font-bold">Código Postal</label>
                <input required value={codigoPostal} onChange={e=>setCodigoPostal(e.target.value)} type="text" placeholder="Ej: 6000" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              
              <div className="md:col-span-2 border-t border-[#222530] pt-6 mt-2">
                <h3 className="text-lg font-bold text-[#FFD21A] mb-4 font-heading">Referencias y Recomendaciones</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-white mb-1.5 font-bold">¿Qué Afiliado Independiente te está asesorando? <span className="text-xs text-[#9CA3AF] font-normal">(Opcional)</span></label>
                    <input value={nombreAfiliado} onChange={e=>setNombreAfiliado(e.target.value)} type="text" placeholder="Nombre del Afiliado" className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
                    <p className="text-xs text-[#9CA3AF] mt-2">Sirve para asignar la comisión correspondientemente.</p>
                  </div>
                  <div>
                    <label className="block text-sm text-white mb-1.5 font-bold">¿Sos referido de algún cliente actual de Cuenta Hogar? Contanos quién es. <span className="text-xs text-[#9CA3AF] font-normal">(Opcional)</span></label>
                    <input value={referidoPor} onChange={e=>setReferidoPor(e.target.value)} type="text" placeholder="En Cuenta Hogar valoramos la palabra de nuestros clientes. Si alguien ya tiene su plan y te recomendó, poné su nombre acá." className="w-full bg-[#161922] border border-[#222530] p-3.5 rounded-xl text-white placeholder-[#9CA3AF] outline-none focus:border-[#FFD21A] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
                  </div>
                </div>
              </div>

              {/* AVISO SOLICITUD A SOLA FIRMA SIN DNI REQUERIDO */}
              <div className="md:col-span-2 bg-[#FFD21A]/10 border border-[#173E3B]/20 p-5 rounded-2xl text-[#FFD21A] text-xs flex flex-col gap-1.5 shadow-sm">
                <span className="font-bold text-sm text-[#FFD21A] uppercase tracking-wider flex items-center gap-1.5 font-heading">
                  ✨ Solicitud 100% a Sola Firma
                </span>
                <p className="text-[#9CA3AF] leading-relaxed font-normal">
                  No es necesario adjuntar fotos de tu DNI. Evaluaremos tu solicitud directamente con tu DNI y datos declarados.
                </p>
              </div>

            </div>
          </div>

          {submitError && <p role="alert" className="text-sm text-white">{submitError}</p>}
          <button disabled={submitting || (!!productoId && (referenceState !== "ready" || !planElegido))} type="submit" className="w-full group flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#123230] text-white font-bold text-base sm:text-lg py-4.5 sm:py-5 rounded-2xl hover:scale-[1.01] active:scale-95 transition-all duration-300 shadow-md shadow-[#173E3B]/20">
            {submitting?"Registrando solicitud…":"Enviar Solicitud y Hablar con un Asesor"} <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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