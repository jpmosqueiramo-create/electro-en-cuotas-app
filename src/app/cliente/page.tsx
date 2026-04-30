"use client";

import { useAuth } from "@/components/AuthProvider";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, getDocs, query, where, Timestamp, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Solicitud = {
  id: string;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "REQUIERE_INFO";
  mensajeAdmin?: string;
  fechaCreacion: any;
  productoDeseado: string;
};

export default function ClientePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarFormDatos, setMostrarFormDatos] = useState(false);

  // Formulario - Datos Personales
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [numeroDni, setNumeroDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  
  // Archivos
  const [producto, setProducto] = useState("");
  const [productoId, setProductoId] = useState("");
  const [planElegido, setPlanElegido] = useState("");
  const [montoCuota, setMontoCuota] = useState(0);
  const [dniFrente, setDniFrente] = useState<File | null>(null);
  const [dniDorso, setDniDorso] = useState<File | null>(null);
  const [reciboSueldo, setReciboSueldo] = useState<File | null>(null);
  const [servicio, setServicio] = useState<File | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const mem = localStorage.getItem("datosPreliminares");
        if (mem) {
          const data = JSON.parse(mem);
          if(data.productoNombre && !producto) setProducto(data.productoNombre);
          if(data.productoId) setProductoId(data.productoId);
          if(data.planElegido) setPlanElegido(data.planElegido);
          if(data.montoCuota) setMontoCuota(data.montoCuota);
          if(data.producto && !producto) setProducto(data.producto);
          if(data.nombreCompleto && !nombreCompleto) setNombreCompleto(data.nombreCompleto);
          if(data.numeroDni && !numeroDni) setNumeroDni(data.numeroDni);
          if(data.telefono && !telefono) setTelefono(data.telefono);
          if(data.direccion && !direccion) setDireccion(data.direccion);
          if(data.localidad && !localidad) setLocalidad(data.localidad);
          // Auto-abrir el formulario porque viene del Catálogo
          setMostrarFormulario(true);
        }
      }
    } catch(e) {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const fetchSolicitudes = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "solicitudes"), where("clienteId", "==", user.uid));
      const snap = await getDocs(q);
      const results: Solicitud[] = [];
      snap.forEach(doc => results.push({ id: doc.id, ...doc.data() } as Solicitud));
      setSolicitudes(results);
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoDatos(false);
    }
  };

  useEffect(() => {
    if (user) fetchSolicitudes();
  }, [user]);

  const handleReenviarCorreo = async () => {
    if (!user) return;
    try {
      const auth = getAuth();
      if(auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setCorreoEnviado(true);
      }
    } catch (error: any) {
      if(error.code === 'auth/too-many-requests') {
        alert("Ya enviamos un correo recientemente. Por favor espera unos minutos y revisa la carpeta SPAM.");
      } else {
        alert("Error al intentar enviar el correo. Intenta de nuevo.");
      }
    }
  };

  const handleSubirArchivo = async (archivo: File, tipo: string) => {
    if (!user) return "";
    const storageRef = ref(storage, `comprobantes/\${user.uid}/\${Date.now()}_\${tipo}_\${archivo.name}`);
    await uploadBytes(storageRef, archivo);
    return await getDownloadURL(storageRef);
  };

  
  const abrirFormDatos = () => {
    if (solicitudes.length > 0 && (solicitudes[0] as any).datosPersonales) {
      const d = (solicitudes[0] as any).datosPersonales;
      if (d.telefono) setTelefono(d.telefono);
      if (d.direccion) setDireccion(d.direccion);
      if (d.localidad) setLocalidad(d.localidad);
      if (d.nombreCompleto) setNombreCompleto(d.nombreCompleto);
    }
    setMostrarFormDatos(true);
  };

  const handleActualizarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubiendo(true);
    try {
      for (const sol of solicitudes) {
        const d = (sol as any).datosPersonales || {};
        const nuevosDatos = { ...d, telefono, direccion, localidad };
        await updateDoc(doc(db, "solicitudes", sol.id), { datosPersonales: nuevosDatos });
      }
      
      await addDoc(collection(db, "alertas_admin"), {
        tipo: "MODIFICACION_DATOS",
        clienteEmail: user.email,
        mensaje: `El cliente ${nombreCompleto || user.email} actualizó sus datos: Tel ${telefono}, Dir ${direccion}, Loc ${localidad}`,
        fechaCreacion: Timestamp.now(),
        leida: false
      });

      alert("¡Tus datos han sido actualizados exitosamente!");
      setMostrarFormDatos(false);
      await fetchSolicitudes();
    } catch(err) {
      console.error(err);
      alert("Hubo un error al actualizar tus datos.");
    } finally {
      setSubiendo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dniFrente || !dniDorso || !reciboSueldo || !servicio) {
      return alert("Por favor selecciona todos los documentos obligatorios.");
    }
    setSubiendo(true);

    try {
      const [urlFrente, urlDorso, urlSueldo, urlServicio] = await Promise.all([
        handleSubirArchivo(dniFrente, "dniFrente"),
        handleSubirArchivo(dniDorso, "dniDorso"),
        handleSubirArchivo(reciboSueldo, "sueldo"),
        handleSubirArchivo(servicio, "servicio")
      ]);

      await addDoc(collection(db, "solicitudes"), {
        clienteId: user.uid,
        clienteEmail: user.email,
        datosPersonales: { nombreCompleto, numeroDni, telefono, direccion, localidad },
        productoDeseado: producto,
        productoId: productoId || "sin-id",
        planElegido: planElegido || "no-indicado",
        montoCuota: montoCuota || 0,
        documentos: {
          dniFrente: urlFrente,
          dniDorso: urlDorso,
          reciboSueldo: urlSueldo,
          servicio: urlServicio
        },
        estado: "PENDIENTE",
        mensajeAdmin: "",
        fechaCreacion: Timestamp.now()
      });

      localStorage.removeItem("datosPreliminares");
      alert("¡Tu solicitud de crédito ha sido enviada con éxito! La revisaremos pronto.");
      setProducto(""); setNombreCompleto(""); setNumeroDni(""); setTelefono(""); setDireccion(""); setLocalidad("");
      setDniFrente(null); setDniDorso(null); setReciboSueldo(null); setServicio(null);
      setMostrarFormulario(false);
      await fetchSolicitudes();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al enviar la solicitud.");
    } finally {
      setSubiendo(false);
    }
  };

  if (loading || cargandoDatos) {
    return <div className="min-h-screen bg-[#FAFAFA] text-yellow-500 p-8 text-center mt-20">Cargando tu perfil...</div>;
  }

  if (!user) return null;

  // VERIFICACIÓN ESTRICTA DE CORREO: Bloquear UI si no verificó el mail (excepto admin jpmosqueira)
  if (!user.emailVerified && user.email !== "jpmosqueiramo@gmail.com") {
    return (
      <div className="min-h-screen bg-[#FAFAFA] text-yellow-500 p-8 flex flex-col items-center justify-center">
        <div className="bg-[#FAFAFA] border border-yellow-500/30 p-10 rounded-lg text-center max-w-lg shadow-[0_0_20px_rgba(234,179,8,0.2)]">
          <div className="text-6xl mb-6">📬</div>
          <h1 className="text-3xl font-black text-zinc-900 mb-4">Verifica tu correo electrónico</h1>
          <p className="text-yellow-200/80 mb-6">
            Por estrictos motivos de seguridad y análisis de crédito, antes de poder cargar tus recibos debes comprobar que <strong>{user.email}</strong> es válido haciéndole clic al enlace que te acabamos de enviar a tu casilla.
          </p>
          <p className="text-red-400 font-bold mb-8 italic">
            Importante: Si no lo encuentras en Recibidos, revisa atentamente la carpeta de Correo no deseado (SPAM) o Promociones.
          </p>
          
          <button 
            disabled={correoEnviado}
            onClick={handleReenviarCorreo}
            className="w-full bg-yellow-500 text-black py-4 rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {correoEnviado ? "✅ Correo Reenviado. Revisa tu buzón." : "No me llegó, reenviar correo de validación"}
          </button>

          <button onClick={() => window.location.reload()} className="w-full bg-transparent border border-yellow-500/50 text-yellow-500 py-3 mt-4 rounded-lg font-bold hover:bg-yellow-500/10 transition-colors">
            Ya lo validé, recargar página
          </button>
          
          <button onClick={() => getAuth().signOut()} className="w-full bg-transparent border-none text-red-500/80 hover:text-red-400 py-3 mt-2 text-sm font-bold transition-colors">
            ⬅️ Me equivoqué de correo (Cambiar de cuenta)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-yellow-500 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-yellow-500/30 pb-4">
          <div>
            <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Cuenta Hogar Logo" className="h-10 w-auto object-contain" /> <h1 className="text-2xl font-bold text-yellow-400 mt-2">Portal de Créditos</h1>
            <p className="text-gray-500 text-sm mt-1">{user.email}</p>
          </div>
          <div className="flex gap-3">
            <a href="/" className="text-sm border border-yellow-500/50 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded transition-colors hidden sm:block">
              Volver al Catálogo
            </a>
            <button onClick={() => { import("firebase/auth").then(({getAuth, signOut}) => signOut(getAuth())); router.push("/login"); }} className="text-sm border border-red-500/50 text-red-500 hover:bg-red-900/50 px-4 py-2 rounded transition-colors font-bold">
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Centro de Asistencia */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <button 
            onClick={abrirFormDatos}
            className="bg-[#FAFAFA] border border-yellow-500/30 p-4 rounded-lg flex items-center gap-4 hover:border-yellow-500 hover:-translate-y-1 active:scale-95 transition-all shadow-md"
          >
             <div className="text-4xl">📝</div>
             <div className="text-left">
               <h3 className="font-bold text-yellow-400 text-lg">Actualizar mis Datos</h3>
               <p className="text-sm text-gray-500">Avisar si cambiaste de número o de domicilio.</p>
             </div>
          </button>
        </div>

        
        {mostrarFormDatos && (
          <div className="bg-[#FAFAFA] border border-yellow-500/20 rounded-lg p-6 lg:p-10 mb-8 relative shadow-md">
            <button onClick={() => setMostrarFormDatos(false)} className="absolute top-6 right-6 text-gray-500 hover:text-zinc-900 font-bold text-sm">✕ Cancelar</button>
            <h2 className="text-2xl mb-2 font-bold text-zinc-900">Actualizar Mis Datos</h2>
            <p className="text-gray-500 mb-6">Mantené tu teléfono y domicilio al día para facilitar las entregas y cobranzas.</p>
            <form onSubmit={handleActualizarDatos} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm mb-2 text-zinc-700 font-semibold">Teléfono / Celular</label>
                <input required value={telefono} onChange={e=>setTelefono(e.target.value)} type="tel" className="w-full bg-white border border-gray-300 rounded p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm mb-2 text-zinc-700 font-semibold">Dirección</label>
                <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" className="w-full bg-white border border-gray-300 rounded p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm mb-2 text-zinc-700 font-semibold">Localidad</label>
                <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" className="w-full bg-white border border-gray-300 rounded p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <button disabled={subiendo} type="submit" className="w-full bg-yellow-500 text-black py-4 rounded-lg font-bold text-lg hover:bg-yellow-400 transition-colors shadow-md disabled:opacity-50">
                  {subiendo ? "Guardando..." : "Guardar Nuevos Datos"}
                </button>
              </div>
            </form>
          </div>
        )}

        {solicitudes.length > 0 && !mostrarFormulario && !mostrarFormDatos && (
          <div className="mb-6 flex justify-end">
            <button onClick={() => setMostrarFormulario(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded shadow-md transition-colors">
               + Solicitar un nuevo crédito
            </button>
          </div>
        )}

        {(solicitudes.length > 0 && !mostrarFormulario && !mostrarFormDatos) ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4 text-zinc-900">Tus Solicitudes Actuales</h2>
            {solicitudes.map(sol => (
              <div key={sol.id} className="bg-[#FAFAFA] border border-yellow-500/30 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-yellow-400 mb-1">{(sol as any).planElegido ? ((sol as any).planElegido + " Cuotas x $" + (sol as any).montoCuota) : "Crédito"} : {sol.productoDeseado}</h3>
                    <p className="text-sm text-gray-500 mt-1">Enviado el {sol.fechaCreacion?.toDate().toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold \${
                    sol.estado === "PENDIENTE" ? "bg-blue-500/20 text-blue-400 border border-blue-500/50" :
                    sol.estado === "APROBADO" ? "bg-green-500/20 text-green-400 border border-green-500/50" :
                    sol.estado === "RECHAZADO" ? "bg-red-500/20 text-red-400 border border-red-500/50" :
                    "bg-orange-500/20 text-orange-400 border border-orange-500/50"
                  }`}>
                    {sol.estado}
                  </span>
                </div>
                
                
                {(sol as any).estadoEntrega === "ENTREGADO" && (
                  <div className="mt-5 p-4 bg-gray-100/50 border border-gray-300 rounded-lg">
                    <h4 className="text-sm font-bold text-gray-600 mb-2">🏷️ Anticipo de Entrega</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                       <span className="text-xl font-black text-zinc-900">${(sol as any).montoAbonado || "0"} <span className="text-xs text-gray-500 uppercase font-normal ml-1">({(sol as any).metodoPago || "Efectivo"})</span></span>
                       {(sol as any).estadoRendicion === "CONFIRMADO" ? (
                          <span className="bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 rounded-full text-xs font-bold w-fit mt-2 sm:mt-0">✅ PAGO CONFIRMADO POR CENTRAL</span>
                       ) : (
                          <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-3 py-1 rounded-full text-xs font-bold w-fit mt-2 sm:mt-0">⌛ AUDITANDO COBRO CON AFILIADO</span>
                       )}
                    </div>
                  </div>
                )}
                
                {(sol as any).estadoEntrega === "ENTREGADO" && (sol as any).planPagos && (
                  <div className="mt-6 pt-6 border-t border-yellow-500/20">
                    <h4 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">💳 Mi Planilla de Pagos</h4>
                    <p className="text-gray-500 text-sm mb-6">Aquí puedes subir y reportar las transferencias o recibos mensuales de tus cuotas.</p>
                    <div className="space-y-4">
                      {(sol as any).planPagos.map((cuota: any, idx: number) => (
                        <div key={idx} className="bg-white border border-yellow-500/20 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                          <div>
                            <p className="font-bold text-zinc-900 text-lg">Cuota {cuota.numero} de {(sol as any).planElegido}</p>
                            <p className="text-gray-500 text-sm">Vencimiento: {new Date(cuota.vencimiento).toLocaleDateString()}</p>
                            <p className="text-yellow-500 font-extrabold text-xl">${cuota.montoOriginal}</p>
                          </div>
                          
                          <div className="text-right flex flex-col justify-center">
                            {cuota.estado === "PAGADO" && (
                              <div className="flex flex-col items-end gap-2">
                                <span className="bg-green-500/20 text-green-400 border border-green-500/50 px-4 py-2 rounded-full font-bold text-sm w-fit self-end">✅ VERIFICADO Y PAGADO</span>
                                {cuota.comprobanteUrl && <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline font-bold whitespace-nowrap">📄 Ver Recibo Enviado</a>}
                              </div>
                            )}
                            
                            {cuota.estado === "EN_REVISION" && (
                              <div className="flex flex-col items-end gap-2 bg-blue-900/20 p-3 rounded border border-blue-500/30">
                                <span className="text-blue-400 font-bold text-sm flex items-center gap-1">⌛ Auditando pago...</span>
                                <p className="text-[10px] text-gray-500 max-w-xs text-right">El administrador de Cuenta Hogar está revisando el recibo que subiste en la cuenta bancaria.</p>
                              </div>
                            )}
                            
                            {cuota.estado === "PENDIENTE" && (
                              <div className="flex flex-col items-end gap-3 bg-[#FAFAFA] border border-gray-200 p-4 rounded">
                                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/50 px-3 py-1 rounded font-bold text-xs uppercase tracking-widest self-end">PENDIENTE</span>
                                <input type="file" id={`comprobante_${sol.id}_${idx}`} accept="image/*,application/pdf" className="text-[11px] w-full max-w-xs text-gray-500 file:bg-yellow-500 file:text-black file:border-0 file:rounded file:px-3 file:py-1.5 file:font-bold hover:file:bg-yellow-400 file:cursor-pointer outline-none" />
                                <button 
                                  onClick={async () => {
                                    const el = document.getElementById(`comprobante_${sol.id}_${idx}`) as HTMLInputElement;
                                    if(!el.files || el.files.length === 0) return alert("Selecciona el comprobante/foto primero desde tu dispositivo.");
                                    
                                    const btn = document.getElementById(`btn_${sol.id}_${idx}`) as HTMLButtonElement;
                                    btn.innerText = "Enviando...";
                                    btn.disabled = true;

                                    try {
                                      const url = await handleSubirArchivo(el.files[0], `cuota_${cuota.numero}_${sol.id}`);
                                      const newPlan = [...(sol as any).planPagos];
                                      newPlan[idx].comprobanteUrl = url;
                                      newPlan[idx].estado = "EN_REVISION";
                                      await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan });
                                      alert("Comprobante enviado exitosamente. Aguardando validación de la administración.");
                                      fetchSolicitudes();
                                    } catch(e) { alert("Error de conexión al subir. Chequea tu internet."); btn.innerText="Reportar Pago"; btn.disabled=false; }
                                  }}
                                  id={`btn_${sol.id}_${idx}`}
                                  className="w-full bg-yellow-500 text-black px-4 py-2.5 rounded font-black text-sm hover:bg-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.3)] transition"
                                >
                                  📨 Reportar Pago
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sol.estado === "REQUIERE_INFO" && (
                  <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/50 rounded text-orange-200">
                    <p className="font-bold flex items-center mb-2">⚠️ Acción Requerida por el Administrador:</p>
                    <p className="mb-4">{sol.mensajeAdmin || "Por favor, vuelve a subir tus archivos."}</p>
                    <button className="bg-orange-500 text-black px-4 py-2 rounded font-bold hover:bg-orange-400 text-sm">Actualizar Documentación</button>
                  </div>
                )}
                
                {sol.estado === "RECHAZADO" && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded text-red-200">
                    <p className="font-bold mb-1">Motivo de rechazo:</p>
                    <p>{sol.mensajeAdmin || "No cumples con los requisitos crediticios actuales."}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#FAFAFA] border border-yellow-500/20 rounded-lg p-6 lg:p-10 relative">
            {solicitudes.length > 0 && (
               <button onClick={() => setMostrarFormulario(false)} className="absolute top-6 right-6 text-gray-500 hover:text-zinc-900 font-bold text-sm">
                 ✕ Cancelar
               </button>
            )}
            <h2 className="text-2xl mb-2 font-bold text-zinc-900">Solicitar Nuevo Crédito</h2>
            <p className="text-yellow-200/60 mb-8">Completa el formulario biográfico y adjunta la documentación para que evaluemos tu perfil crediticio.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-lg border border-yellow-500/10">
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-semibold">Nombre Completo</label>
                  <input required value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} type="text" placeholder="Juan Perez" className="w-full bg-gray-100 border border-gray-700 rounded p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-semibold">Número de DNI</label>
                  <input required value={numeroDni} onChange={e=>setNumeroDni(e.target.value)} type="number" placeholder="Ej: 32444555" className="w-full bg-gray-100 border border-gray-700 rounded p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-semibold">Teléfono / Celular</label>
                  <input required value={telefono} onChange={e=>setTelefono(e.target.value)} type="tel" placeholder="Ej: +54 9 11 1234-5678" className="w-full bg-gray-100 border border-gray-700 rounded p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-semibold">Dirección</label>
                  <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" placeholder="Ej: Av. San Martin 123" className="w-full bg-gray-100 border border-gray-700 rounded p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-semibold">Localidad</label>
                  <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" placeholder="Ej: Córdoba Capital" className="w-full bg-gray-100 border border-gray-700 rounded p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-semibold">¿Qué producto deseas financiar?</label>
                  <input required value={producto} onChange={e=>setProducto(e.target.value)} type="text" placeholder="Ej: Heladera Samsung 400L" className="w-full bg-gray-100 border border-yellow-500/50 rounded p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-4 rounded-lg border border-yellow-500/10">
                <div>
                  <label className="block text-sm mb-2 text-yellow-200">Foto DNI - Frente</label>
                  <input required type="file" accept="image/*" onChange={e => {if (e.target.files) setDniFrente(e.target.files[0])}} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-yellow-500/20 file:text-yellow-500 hover:file:bg-yellow-500/30" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-200">Foto DNI - Dorso</label>
                  <input required type="file" accept="image/*" onChange={e => {if (e.target.files) setDniDorso(e.target.files[0])}} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-yellow-500/20 file:text-yellow-500 hover:file:bg-yellow-500/30" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-200">Último Recibo de Sueldo</label>
                  <input required type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setReciboSueldo(e.target.files[0])}} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-yellow-500/20 file:text-yellow-500 hover:file:bg-yellow-500/30" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-200">Impuesto o Servicio (Verificar Domicilio)</label>
                  <input required type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setServicio(e.target.files[0])}} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-yellow-500/20 file:text-yellow-500 hover:file:bg-yellow-500/30" />
                </div>
              </div>

              <button disabled={subiendo} type="submit" className="w-full bg-yellow-500 text-black py-4 rounded-lg font-bold text-lg hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:shadow-none mt-8">
                {subiendo ? "Subiendo archivos, por favor no cierres la ventana..." : "Enviar Solicitud de Crédito"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
