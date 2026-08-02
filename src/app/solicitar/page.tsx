"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ArrowLeft, Upload } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

function SolicitarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productoId = searchParams.get("id");

  const [productoData, setProductoData] = useState<any>(null);
  const [activeSolImage, setActiveSolImage] = useState<string>("");
  
  // Nombres de los campos requeridos
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [numeroDni, setNumeroDni] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [email, setEmail] = useState("");
  const [antiguedadLaboral, setAntiguedadLaboral] = useState("");
  const [nombreAfiliado, setNombreAfiliado] = useState("");
  const [referidoPor, setReferidoPor] = useState("");

  const [comprobante, setComprobante] = useState<File | null>(null);
  const [planElegido, setPlanElegido] = useState("12");

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
    if (!comprobante) {
      alert("Por favor adjunta una foto de tu comprobante de ingresos.");
      return;
    }

    const btn = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    const oldText = btn.innerText;
    btn.innerText = "Subiendo comprobante...";
    btn.disabled = true;

    try {
      // Subir el archivo de ingresos a Firebase Storage
      const storageRef = ref(storage, `comprobantes/cuenta_solicitudes/${Date.now()}_${comprobante.name}`);
      await uploadBytes(storageRef, comprobante);
      const comprobanteUrlReal = await getDownloadURL(storageRef);

      const planCuotas = planElegido === "8" ? (productoData?.cuota8 || 0) : (productoData?.cuota12 || 0);

      const datos = {
        productoId: productoId || "A definir",
        productoNombre: productoData ? productoData.nombre : "A definir",
        planElegido: planElegido,
        montoCuota: planCuotas,
        nombreCompleto, 
        numeroDni, 
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
      
      await addDoc(collection(db, "solicitudes_cuenta"), {
        tipo: "apertura_cuenta",
        ...datos,
        precioContado: productoData?.precioContado || 0,
        tasaInteresTna: productoData?.tasaInteresTna || 0,
        tasaMora: productoData?.tasaMora || 0,
        fecha: serverTimestamp(),
        estado: "Pendiente",
        comprobanteURL: comprobanteUrlReal 
      });

      alert("¡Solicitud registrada con éxito! Te derivaremos a WhatsApp para continuar el contacto.");
      const textMsg = `Hola, acabo de llenar el formulario de Apertura de Cuenta. Elegí el plan de ${planElegido} cuotas para el producto ${productoData?.nombre || 'A definir'}. Mi DNI es ${numeroDni}`;
      window.location.href = `https://wa.me/5491125659686?text=${encodeURIComponent(textMsg)}`;
    } catch (err: any) {
      console.error("Error al procesar solicitud:", err);
      alert("Error de conexión al subir comprobante. Chequea tu internet e intenta nuevamente.");
      btn.innerText = oldText;
      btn.disabled = false;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] rounded-3xl p-6 md:p-10 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
        <div className="flex justify-between items-start mb-8">
          <button onClick={()=>router.push("/")} className="text-zinc-400 hover:text-yellow-400 flex items-center gap-1 text-sm transition-colors font-bold">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white">CUENTA <span className="text-yellow-400">HOGAR</span></span>
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight">Apertura de Cuenta de Confianza</h1>
        <p className="text-zinc-400 mb-8">Completá este formulario para que analicemos tu perfil a sola firma y armemos tu plan.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN PRODUCTO */}
          {productoData && (
            <div className="bg-yellow-500/5 border border-zinc-850 p-6 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <div className="w-24 h-24 bg-zinc-900 rounded-xl p-1 flex items-center justify-center relative overflow-hidden">
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
                              ? 'border-yellow-500 bg-yellow-500/10' 
                              : 'border-zinc-800 hover:border-zinc-700'
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
                  <p className="text-xs text-yellow-400 font-black tracking-widest uppercase">Producto a gestionar</p>
                  <p className="font-bold text-white text-lg">{productoData.nombre}</p>
                </div>
              </div>
              
              <div className="border-t border-zinc-850 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2">ELEGIR PLAN DE CUOTAS</label>
                  <select 
                    value={planElegido} 
                    onChange={e => setPlanElegido(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors font-bold"
                  >
                    <option value="12">Financiación en 12 Cuotas</option>
                    <option value="8">Financiación en 8 Cuotas</option>
                  </select>
                </div>
                <div className="flex flex-col justify-center bg-zinc-950 p-4 rounded-xl border border-zinc-900">
                  <p className="text-xs text-zinc-500 font-bold uppercase">VALOR MENSUAL DE LA CUOTA</p>
                  <p className="text-2xl font-black text-yellow-400 mt-1">
                    ${planElegido === "12" ? productoData.cuota12 : productoData.cuota8} <span className="text-xs font-normal text-zinc-500">/ mes</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DATOS PERSONALES */}
          <div className="bg-zinc-950 border border-zinc-850 p-6 md:p-8 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="md:col-span-2">
                <label className="block text-sm text-zinc-400 mb-2 font-bold">Nombre y Apellido</label>
                <input required value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} type="text" placeholder="Ej: Juan Perez" className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold">DNI</label>
                <input required value={numeroDni} onChange={e=>setNumeroDni(e.target.value)} type="number" placeholder="Ej: 30123456" className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold">Fecha de Nacimiento</label>
                <input required value={fechaNacimiento} onChange={e=>setFechaNacimiento(e.target.value)} type="date" className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold">WhatsApp</label>
                <input required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} type="tel" placeholder="Ej: +54 9 11 1234-5678" className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold">Ocupación</label>
                <input required value={ocupacion} onChange={e=>setOcupacion(e.target.value)} type="text" placeholder="Ej: Empleado de comercio" className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold">Correo Electrónico (Obligatorio)</label>
                <input required value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Ej: juanperez@gmail.com" className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2 font-bold">Antigüedad Laboral (Fecha de Ingreso)</label>
                <input required value={antiguedadLaboral} onChange={e=>setAntiguedadLaboral(e.target.value)} type="date" className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-zinc-400 mb-2 font-bold">Localidad y Dirección Exacta</label>
                <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" placeholder="Ej: Av. San Martín 1500, Piso 2A, Junín" className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
              </div>

              
              <div className="md:col-span-2 border-t border-zinc-850 pt-6 mt-2">
                <h3 className="text-lg font-bold text-yellow-400 mb-4">Referencias y Recomendaciones</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2 font-bold">¿Qué Afiliado Independiente te está asesorando? <span className="text-xs text-zinc-500 font-normal">(Opcional)</span></label>
                    <input value={nombreAfiliado} onChange={e=>setNombreAfiliado(e.target.value)} type="text" placeholder="Nombre del Afiliado" className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
                    <p className="text-xs text-zinc-500 mt-2">Sirve para asignar la comisión correspondientemente.</p>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2 font-bold">¿Sos referido de algún cliente actual de Cuenta Hogar? Contanos quién es. <span className="text-xs text-zinc-500 font-normal">(Opcional)</span></label>
                    <input value={referidoPor} onChange={e=>setReferidoPor(e.target.value)} type="text" placeholder="En Cuenta Hogar valoramos la palabra de nuestros clientes. Si alguien ya tiene su plan y te recomendó, poné su nombre acá." className="w-full bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-yellow-500 transition-colors" />
                  </div>
                </div>
              </div>

              {/* ARCHIVO */}
              <div className="md:col-span-2 border border-dashed border-zinc-800 p-6 rounded-2xl bg-zinc-800/40 text-center hover:bg-zinc-900 transition-colors">
                <Upload className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                <label className="block text-sm text-white mb-2 font-bold cursor-pointer">
                  Subí una foto de tu comprobante de ingresos (Recibo de sueldo, Monotributo, etc.)
                  <input required type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setComprobante(e.target.files[0])}} className="hidden" />
                </label>
                <span className="text-xs text-zinc-400">{comprobante ? comprobante.name : "Ningún archivo seleccionado"}</span>
              </div>

            </div>
          </div>

          <button type="submit" className="w-full group flex items-center justify-center gap-2 bg-yellow-textured text-black font-black text-lg py-5 rounded-xl hover:-translate-y-1 active:scale-95 transition-all duration-300 shadow-md">
            Enviar Solicitud y Hablar con un Asesor <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SolicitarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">Cargando formulario...</div>}>
      <SolicitarForm />
    </Suspense>
  );
}
