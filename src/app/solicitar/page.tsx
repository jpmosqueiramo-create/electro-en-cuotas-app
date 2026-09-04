"use client";

import { registrarProductoBorradorSiNoExiste } from "@/lib/catalogManager";
import { calcularTablaTodosLosPlanes } from "@/lib/financialEngine";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ArrowLeft, Upload } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/components/AuthProvider";

function SolicitarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productoId = searchParams.get("id");
  const { user } = useAuth();

  const [productoData, setProductoData] = useState<any>(null);
  const [activeSolImage, setActiveSolImage] = useState<string>("");
  
  // Nombres de los campos requeridos
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [numeroDni, setNumeroDni] = useState("");
  const [cuil, setCuil] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [email, setEmail] = useState("");
  const [antiguedadLaboral, setAntiguedadLaboral] = useState("");
  const [nombreAfiliado, setNombreAfiliado] = useState("");
  const [referidoPor, setReferidoPor] = useState("");

  const [dniFrente, setDniFrente] = useState<File | null>(null);
  const [dniDorso, setDniDorso] = useState<File | null>(null);
  const cuotasParam = searchParams.get("cuotas") || "12";
  const [planElegido, setPlanElegido] = useState("12");

  useEffect(() => {
    if (cuotasParam) setPlanElegido(cuotasParam);
  }, [cuotasParam]);

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
    if (productoId) {
      const fetchProd = async () => {
        try {
          const d = await getDoc(doc(db, "productos", productoId));
          if (d.exists()) {
            const data = { id: d.id, ...d.data() } as any;
            setProductoData(data);
            setActiveSolImage(data.imagenUrl || "");
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchProd();
    }
  }, [productoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
// DNI Photo Upload disabled by requirement

    const cuilRegex = /^\d{2}-\d{8}-\d{1}$/;
    if (!cuilRegex.test(cuil)) {
      alert("Por favor ingresa un CUIL válido en formato XX-XXXXXXXX-X (con guiones).");
      return;
    }

    const btn = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    const oldText = btn.innerText;
    btn.innerText = "Registrando solicitud...";
    btn.disabled = true;

    try {
      let dniFrenteUrlReal = "No requerido en solicitud inicial";
      let dniDorsoUrlReal = "No requerido en solicitud inicial";

      const planesProducto = productoData ? calcularTablaTodosLosPlanes(Number(productoData.costoProducto || productoData.precioContado) || 0, productoData.factoresPlanes, productoData.planesActivos).filter(pl => pl.activo && pl.cuotaMensual > 0) : [];
      const planSelObj = planesProducto.find(pl => String(pl.cuotas) === planElegido);
      const planCuotas = planSelObj ? planSelObj.cuotaMensual : (planElegido === "8" ? (productoData?.cuota8 || 0) : (productoData?.cuota12 || 0));

      const datos = {
        productoId: productoId || "A definir",
        productoNombre: productoData ? productoData.nombre : "A definir",
        planElegido: planElegido,
        montoCuota: planCuotas,
        nombreCompleto, 
        numeroDni, 
        cuil,
        fechaNacimiento,
        whatsapp, 
        direccion, 
        ocupacion,
        nombreAfiliado,
        referidoPor,
        email,
        antiguedadLaboral
      };
      
      if (typeof window !== "undefined") {
        localStorage.setItem("datosPreliminares", JSON.stringify(datos));
      }
      
      if (productoData?.nombre) { await registrarProductoBorradorSiNoExiste(productoData.nombre, productoData.precioContado || 0, productoData.imagenUrl || "").catch(() => {}); }
      
      // 1. Guardar en solicitudes_cuenta (Colección de recepción de solicitudes de apertura)
      try {
        await addDoc(collection(db, "solicitudes_cuenta"), {
          tipo: "apertura_cuenta",
          ...datos,
          precioContado: productoData?.precioContado || 0,
          tasaInteresTna: productoData?.tasaInteresTna || 0,
          tasaMora: productoData?.tasaMora || 0,
          fecha: serverTimestamp(),
        fechaIso: new Date().toISOString(),
          estado: "Pendiente",
          comprobanteURL: dniFrenteUrlReal,
          dniFrenteURL: dniFrenteUrlReal,
          dniDorsoURL: dniDorsoUrlReal
        });
      } catch (errDb) {
        console.warn("Aviso Firestore solicitudes_cuenta:", errDb);
      }

      // Crear alerta para el panel de administración
      try {
        await addDoc(collection(db, "alertas_admin"), {
          tipo: "APERTURA_CUENTA",
          clienteEmail: email || whatsapp || nombreCompleto,
          mensaje: `📋 Solicitud de Apertura de Cuenta: ${nombreCompleto} (DNI: ${numeroDni}, Tel: ${whatsapp}, Loc: ${direccion}) - Producto: ${productoData?.nombre || "A definir"}`,
          fechaCreacion: serverTimestamp(),
          leida: false
        });
      } catch (errAlt) {
        console.warn("Aviso Firestore alertas_admin:", errAlt);
      }

      // Enviar notificación por correo electrónico al administrador
      try {
        await fetch("/api/notificar-presupuesto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: nombreCompleto,
            dni: numeroDni,
            whatsapp: whatsapp,
            localidad: direccion,
            necesidad: productoData?.nombre || "Apertura de Cuenta",
            referente: nombreAfiliado || referidoPor,
            tipo: "apertura_cuenta"
          })
        });
      } catch (e) {
        console.error("Error al enviar email de solicitud:", e);
      }

      const textMsg = `Hola, acabo de llenar el formulario de Apertura de Cuenta. Elegí el plan de ${planElegido} cuotas para el producto ${productoData?.nombre || 'A definir'}. Mi DNI es ${numeroDni}`;
      window.location.href = `https://wa.me/5491125659686?text=${encodeURIComponent(textMsg)}`;
    } catch (err: any) {
      console.error("Error al procesar solicitud:", err);
      const textMsg = `Hola, acabo de llenar el formulario de Apertura de Cuenta. Elegí el plan de ${planElegido} cuotas para el producto ${productoData?.nombre || 'A definir'}. Mi DNI es ${numeroDni}`;
      window.location.href = `https://wa.me/5491125659686?text=${encodeURIComponent(textMsg)}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] px-4 py-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-3xl bg-[#FFFDFC] border border-[#DED8CF] shadow-xl rounded-3xl p-6 sm:p-10">
        <div className="flex justify-between items-start mb-8">
          <button onClick={()=>router.push("/")} className="text-[#68706E] hover:text-[#173E3B] flex items-center gap-1 text-sm transition-colors font-bold">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-14 md:h-16 w-auto object-contain" />
          </div>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-bold text-[#173E3B] mb-2 leading-tight font-heading">Apertura de Cuenta de Confianza</h1>
        <p className="text-[#68706E] mb-8 font-normal">Completá este formulario para que analicemos tu perfil a sola firma y armemos tu plan a medida.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN PRODUCTO */}
          {productoData && (
            <div className="bg-[#F7F3EC] border border-[#DED8CF] p-6 rounded-2xl space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className="w-24 h-24 bg-[#FFFDFC] border border-[#DED8CF] rounded-xl p-1 flex items-center justify-center relative overflow-hidden shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={activeSolImage || productoData.imagenUrl} 
                      alt={productoData.nombre} 
                      className="max-w-full max-h-full object-contain" 
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
                            (activeSolImage || productoData.imagenUrl) === url 
                              ? 'border-[#173E3B] bg-[#173E3B]/10' 
                              : 'border-[#DED8CF] hover:border-[#173E3B]'
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
                  <p className="text-xs text-[#173E3B] font-bold tracking-widest uppercase">Producto a gestionar</p>
                  <p className="font-bold text-[#1F2928] text-lg font-heading">{productoData.nombre}</p>
                </div>
              </div>
              
              <div className="border-t border-[#DED8CF] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#68706E] uppercase tracking-wider mb-2">Elegir Plan de Cuotas</label>
                  <select 
                    value={planElegido} 
                    onChange={e => setPlanElegido(e.target.value)}
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-bold text-base shadow-sm"
                  >
                    {(() => {
                      const list = calcularTablaTodosLosPlanes(Number(productoData.costoProducto || productoData.precioContado) || 0, productoData.factoresPlanes, productoData.planesActivos).filter(pl => pl.activo && pl.cuotaMensual > 0);
                      if (list.length === 0) {
                        return (
                          <>
                            <option value="12">Financiación en 12 Cuotas</option>
                            <option value="8">Financiación en 8 Cuotas</option>
                          </>
                        );
                      }
                      return list.map(pl => (
                        <option key={pl.cuotas} value={String(pl.cuotas)}>
                          Financiación en {pl.cuotas} {pl.cuotas === 1 ? "Cuota" : "Cuotas"} (${pl.cuotaMensual.toLocaleString("es-AR")} / mes)
                        </option>
                      ));
                    })()}
                  </select>
                </div>
                <div className="flex flex-col justify-center bg-[#FFFDFC] p-4 rounded-xl border border-[#DED8CF] shadow-sm">
                  <p className="text-xs text-[#68706E] font-bold uppercase tracking-wider">Valor Mensual de la Cuota</p>
                  <p className="text-2xl font-bold text-[#173E3B] mt-1 font-heading">
                    ${(() => {
                      const list = calcularTablaTodosLosPlanes(Number(productoData.costoProducto || productoData.precioContado) || 0, productoData.factoresPlanes, productoData.planesActivos).filter(pl => pl.activo && pl.cuotaMensual > 0);
                      const found = list.find(pl => String(pl.cuotas) === planElegido);
                      const val = found ? found.cuotaMensual : (planElegido === "8" ? productoData.cuota8 : productoData.cuota12);
                      return (val || 0).toLocaleString("es-AR");
                    })()} <span className="text-xs font-normal text-[#68706E]">/ mes</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DATOS PERSONALES */}
          <div className="bg-[#F7F3EC]/60 border border-[#DED8CF] p-6 sm:p-8 rounded-2xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="md:col-span-2">
                <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">Nombre y Apellido</label>
                <input required value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} type="text" placeholder="Ej: Juan Perez" className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">DNI</label>
                <input required value={numeroDni} onChange={e=>setNumeroDni(e.target.value)} type="number" placeholder="Ej: 30123456" className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">CUIL (formato con guiones)</label>
                <input required value={cuil} onChange={e=>handleCuilChange(e.target.value)} type="text" placeholder="Ej: 20-30123456-7" className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-mono font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">Fecha de Nacimiento</label>
                <input required value={fechaNacimiento} onChange={e=>setFechaNacimiento(e.target.value)} type="date" className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">WhatsApp</label>
                <input required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} type="tel" placeholder="Ej: +54 9 11 1234-5678" className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">Ocupación</label>
                <input required value={ocupacion} onChange={e=>setOcupacion(e.target.value)} type="text" placeholder="Ej: Empleado de comercio" className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">Correo Electrónico (Obligatorio)</label>
                <input required value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Ej: juanperez@gmail.com" className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div>
                <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">Antigüedad Laboral (Fecha de Ingreso)</label>
                <input required value={antiguedadLaboral} onChange={e=>setAntiguedadLaboral(e.target.value)} type="date" className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">Localidad y Dirección Exacta</label>
                <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" placeholder="Ej: Av. San Martín 1500, Piso 2A, Junín" className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
              </div>

              
              <div className="md:col-span-2 border-t border-[#DED8CF] pt-6 mt-2">
                <h3 className="text-lg font-bold text-[#173E3B] mb-4 font-heading">Referencias y Recomendaciones</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">¿Qué Afiliado Independiente te está asesorando? <span className="text-xs text-[#68706E] font-normal">(Opcional)</span></label>
                    <input value={nombreAfiliado} onChange={e=>setNombreAfiliado(e.target.value)} type="text" placeholder="Nombre del Afiliado" className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
                    <p className="text-xs text-[#68706E] mt-2">Sirve para asignar la comisión correspondientemente.</p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#1F2928] mb-1.5 font-bold">¿Sos referido de algún cliente actual de Cuenta Hogar? Contanos quién es. <span className="text-xs text-[#68706E] font-normal">(Opcional)</span></label>
                    <input value={referidoPor} onChange={e=>setReferidoPor(e.target.value)} type="text" placeholder="En Cuenta Hogar valoramos la palabra de nuestros clientes. Si alguien ya tiene su plan y te recomendó, poné su nombre acá." className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-2 focus:ring-[#173E3B]/20 transition-all font-medium text-base shadow-sm" />
                  </div>
                </div>
              </div>

              {/* AVISO SOLICITUD A SOLA FIRMA SIN DNI REQUERIDO */}
              <div className="md:col-span-2 bg-[#173E3B]/10 border border-[#173E3B]/20 p-5 rounded-2xl text-[#173E3B] text-xs flex flex-col gap-1.5 shadow-sm">
                <span className="font-bold text-sm text-[#173E3B] uppercase tracking-wider flex items-center gap-1.5 font-heading">
                  ✨ Solicitud 100% a Sola Firma
                </span>
                <p className="text-[#68706E] leading-relaxed font-normal">
                  No es necesario adjuntar fotos de tu DNI. Evaluaremos tu solicitud directamente con tu DNI y datos declarados.
                </p>
              </div>

            </div>
          </div>

          <button type="submit" className="w-full group flex items-center justify-center gap-2 bg-[#173E3B] hover:bg-[#123230] text-white font-bold text-base sm:text-lg py-4.5 sm:py-5 rounded-2xl hover:scale-[1.01] active:scale-95 transition-all duration-300 shadow-md shadow-[#173E3B]/20">
            Enviar Solicitud y Hablar con un Asesor <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SolicitarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] flex items-center justify-center font-sans">Cargando formulario...</div>}>
      <SolicitarForm />
    </Suspense>
  );
}