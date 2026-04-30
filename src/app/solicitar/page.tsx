"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ArrowLeft, Upload } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

function SolicitarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productoId = searchParams.get("id");

  const [productoData, setProductoData] = useState<any>(null);
  
  // Nombres de los campos requeridos
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [numeroDni, setNumeroDni] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [nombreAfiliado, setNombreAfiliado] = useState("");
  const [referidoPor, setReferidoPor] = useState("");

  const [comprobante, setComprobante] = useState<File | null>(null);

  useEffect(() => {
    if (productoId) {
      const fetchProd = async () => {
        try {
          const d = await getDoc(doc(db, "productos", productoId));
          if (d.exists()) {
            setProductoData({ id: d.id, ...d.data() });
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

    // Aquí guardamos los datos preliminares sin IA ni validaciones algorítmicas, 
    // tal como se pide en la directiva para evaluación manual por humanos.
    const datos = {
      productoId: productoId || "A definir",
      productoNombre: productoData ? productoData.nombre : "A definir",
      nombreCompleto, 
      numeroDni, 
      fechaNacimiento,
      whatsapp, 
      direccion, 
      ocupacion,
      nombreAfiliado,
      referidoPor
    };
    
    if (typeof window !== "undefined") {
      localStorage.setItem("datosPreliminares", JSON.stringify(datos));
    }
    
    try {
      await addDoc(collection(db, "solicitudes_cuenta"), {
        tipo: "apertura_cuenta",
        ...datos,
        fecha: serverTimestamp(),
        estado: "Pendiente",
        comprobanteURL: "Pendiente envío WhatsApp" 
      });
    } catch (err) {
      console.error("Error al guardar solicitud:", err);
    }
    
    alert("¡Solicitud registrada con éxito! Te derivaremos a WhatsApp para enviarnos el comprobante de forma segura.");
    window.location.href = `https://wa.me/5491125659686?text=Hola,%20acabo%20de%20llenar%20el%20formulario%20de%20Apertura%20de%20Cuenta.%20Mi%20DNI%20es%20${numeroDni}`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 px-4 py-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-3xl bg-white border border-yellow-500/30 rounded-3xl p-6 md:p-10 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
        <div className="flex justify-between items-start mb-8">
          <button onClick={()=>router.push("/")} className="text-gray-600 hover:text-yellow-500 flex items-center gap-1 text-sm transition-colors font-bold">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-zinc-900">CUENTA <span className="text-yellow-500">HOGAR</span></span>
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-black text-zinc-900 mb-2 leading-tight">Apertura de Cuenta de Confianza</h1>
        <p className="text-gray-600 mb-8">Completá este formulario para que analicemos tu perfil a sola firma y armemos tu plan.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN PRODUCTO */}
          {productoData && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl p-1 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={productoData.imagenUrl} alt={productoData.nombre} className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-xs text-yellow-500 font-black tracking-widest uppercase">Producto a gestionar</p>
                <p className="font-bold text-zinc-900 text-lg">{productoData.nombre}</p>
              </div>
            </div>
          )}

          {/* DATOS PERSONALES */}
          <div className="bg-[#FAFAFA] border border-gray-200 p-6 md:p-8 rounded-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-2 font-bold">Nombre y Apellido</label>
                <input required value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} type="text" placeholder="Ej: Juan Perez" className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2 font-bold">DNI</label>
                <input required value={numeroDni} onChange={e=>setNumeroDni(e.target.value)} type="number" placeholder="Ej: 30123456" className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2 font-bold">Fecha de Nacimiento</label>
                <input required value={fechaNacimiento} onChange={e=>setFechaNacimiento(e.target.value)} type="date" className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2 font-bold">WhatsApp</label>
                <input required value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} type="tel" placeholder="Ej: +54 9 11 1234-5678" className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2 font-bold">Ocupación</label>
                <input required value={ocupacion} onChange={e=>setOcupacion(e.target.value)} type="text" placeholder="Ej: Empleado de comercio" className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-2 font-bold">Localidad y Dirección Exacta</label>
                <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" placeholder="Ej: Av. San Martín 1500, Piso 2A, Junín" className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
              </div>

              
              <div className="md:col-span-2 border-t border-gray-200 pt-6 mt-2">
                <h3 className="text-lg font-bold text-yellow-500 mb-4">Referencias y Recomendaciones</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2 font-bold">¿Qué Afiliado Independiente te está asesorando? <span className="text-xs text-gray-500 font-normal">(Opcional)</span></label>
                    <input value={nombreAfiliado} onChange={e=>setNombreAfiliado(e.target.value)} type="text" placeholder="Nombre del Afiliado" className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
                    <p className="text-xs text-gray-500 mt-2">Sirve para asignar la comisión correspondientemente.</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2 font-bold">¿Sos referido de algún cliente actual de Cuenta Hogar? Contanos quién es. <span className="text-xs text-gray-500 font-normal">(Opcional)</span></label>
                    <input value={referidoPor} onChange={e=>setReferidoPor(e.target.value)} type="text" placeholder="En Cuenta Hogar valoramos la palabra de nuestros clientes. Si alguien ya tiene su plan y te recomendó, poné su nombre acá." className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-zinc-900 outline-none focus:border-yellow-500 transition-colors" />
                  </div>
                </div>
              </div>

              {/* ARCHIVO */}
              <div className="md:col-span-2 border border-dashed border-gray-300 p-6 rounded-2xl bg-gray-50 text-center hover:bg-white transition-colors">
                <Upload className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                <label className="block text-sm text-zinc-900 mb-2 font-bold cursor-pointer">
                  Subí una foto de tu comprobante de ingresos (Recibo de sueldo, Monotributo, etc.)
                  <input required type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setComprobante(e.target.files[0])}} className="hidden" />
                </label>
                <span className="text-xs text-gray-600">{comprobante ? comprobante.name : "Ningún archivo seleccionado"}</span>
              </div>

            </div>
          </div>

          <button type="submit" className="w-full group flex items-center justify-center gap-2 bg-yellow-500 text-black font-black text-lg py-5 rounded-xl hover:bg-yellow-400 hover:-translate-y-1 hover:shadow-xl active:scale-95 transition-all duration-300 shadow-md">
            Enviar Solicitud y Hablar con un Asesor <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SolicitarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA] text-yellow-500 flex items-center justify-center">Cargando formulario...</div>}>
      <SolicitarForm />
    </Suspense>
  );
}
