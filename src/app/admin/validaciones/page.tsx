"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy, addDoc } from "firebase/firestore";
import { generarContrato, generarPagare } from "@/lib/pdfGenerator";
import { useEffect, useState } from "react";
import Link from "next/link";

type Solicitud = {
  id: string;
  clienteId?: string;
  clienteEmail: string;
  cargadoPorAfiliado?: boolean;
  afiliadoEmail?: string;
  estado: string;
  mensajeAdmin: string;
  fechaCreacion: any;
  productoDeseado: string;
  datosPersonales?: {
    nombreCompleto: string;
    numeroDni: string;
    telefono: string;
    direccion: string;
    localidad: string;
  };
  documentos: {
    dniFrente: string;
    dniDorso: string;
    reciboSueldo: string;
    servicio: string;
  };
  planElegido?: string;
  montoCuota?: number;
  historialRecepcion?: string;
  estadoProducto?: string;
  estadoEntrega?: string;
  numeroSerie?: string;
  montoAbonado?: number;
  metodoPago?: string;
  comentarioEntrega?: string;
  fechaEntrega?: string;
  planPagos?: any[];
};

export default function AdminValidacionesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [cargando, setCargando] = useState(true);

  const [nuevosEstados, setNuevosEstados] = useState<Record<string, string>>({});
  const [nuevosMensajes, setNuevosMensajes] = useState<Record<string, string>>({});
  const [guardandoId, setGuardandoId] = useState<string | null>(null);
  const [entregaActiva, setEntregaActiva] = useState<string | null>(null);
  const [nserie, setNserie] = useState("");
  const [montoAbonado, setMontoAbonado] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [comentarioEntrega, setComentarioEntrega] = useState("");

  const fetchSolicitudes = async () => {
    try {
      const q = query(collection(db, "solicitudes"), orderBy("fechaCreacion", "desc"));
      const snap = await getDocs(q);
      const results: Solicitud[] = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() } as Solicitud));
      setSolicitudes(results);
    } catch (error) {
      console.error(error);
      alert("Error cargando solicitudes. Asegúrate de tener los índices o reglas correctas.");
      try {
        const snap2 = await getDocs(collection(db, "solicitudes"));
        const results: Solicitud[] = [];
        snap2.forEach(d => results.push({ id: d.id, ...d.data() } as Solicitud));
        results.sort((a,b) => b.fechaCreacion?.seconds - a.fechaCreacion?.seconds);
        setSolicitudes(results);
      } catch (e) {
        console.error("Doble fallo", e);
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  
  
  const handleActualizarEstadoProducto = async (id: string, nuevoEstado: string) => {
    try {
      await updateDoc(doc(db, "solicitudes", id), { estadoProducto: nuevoEstado });
      await fetchSolicitudes();
    } catch (e) { console.error(e); }
  };

  const handleConfirmarEntregaAdmin = async (id: string, nuevoEstado: string, esDirecto: boolean = false) => {
    try {
      let dataToUpdate: any = { estadoEntrega: nuevoEstado };
      if (nuevoEstado === "ENTREGADO" && !esDirecto) {
        if (!nserie || nserie.trim().length < 3) return alert("ADMIN: Debes ingresar un número de serie válido.");
        if (!montoAbonado || isNaN(Number(montoAbonado))) return alert("ADMIN: Debes ingresar un monto válido.");
        dataToUpdate.numeroSerie = nserie.trim();
        dataToUpdate.montoAbonado = Number(montoAbonado);
        dataToUpdate.metodoPago = metodoPago;
        if (comentarioEntrega) dataToUpdate.comentarioEntrega = comentarioEntrega;
        dataToUpdate.fechaEntrega = new Date().toISOString();
        if (Number(montoAbonado) > 0) {
           dataToUpdate.estadoRendicion = "CONFIRMADO";
           dataToUpdate.fechaRendicionReal = new Date().toISOString().split('T')[0];
           dataToUpdate.historialRendicion = "Auditoría Automática Administrador Central";
        }
        
        const solObj = solicitudes.find((s: any) => s.id === id);
        if (solObj && solObj.planElegido) {
           const cant = parseInt(solObj.planElegido);
           const vc = solObj.montoCuota || 0;
           const planArr = [];
           const bDate = new Date();
           
           if (Number(montoAbonado) > 0) {
              planArr.push({
                 numero: 0,
                 montoOriginal: Number(montoAbonado),
                 montoAbonado: Number(montoAbonado),
                 estado: "PAGADO",
                 vencimiento: new Date().toISOString(),
                 fechaPago: new Date().toISOString(),
                 metodoPago: metodoPago,
                 comprobanteUrl: null,
                 notaAcumulacion: "Adelanto Inicial"
              });
           }

           for(let i = 1; i <= cant; i++) {
              const nd = new Date(bDate);
              nd.setMonth(nd.getMonth() + i);
              planArr.push({
                 numero: i,
                 montoOriginal: vc,
                 montoAbonado: 0,
                 estado: "PENDIENTE",
                 vencimiento: nd.toISOString(),
                 fechaPago: null,
                 metodoPago: null,
                 comprobanteUrl: null
              });
           }
           dataToUpdate.planPagos = planArr;
        }
      }
      await updateDoc(doc(db, "solicitudes", id), dataToUpdate);
      alert("Estado de logística actualizado exitosamente");
      setEntregaActiva(null);
      await fetchSolicitudes();
    } catch (e) { alert("Error al actualizar logística"); }
  };

const handleAsignarAfiliado = async (id: string, email: string) => {
    if (email && !email.includes("@")) return alert("Por favor ingresa un email válido para el afiliado.");
    try {
      await updateDoc(doc(db, "solicitudes", id), { afiliadoEmail: email ? email.toLowerCase().trim() : null });
      alert(email ? "Solicitud asignada exitosamente al afiliado: " + email : "Asignación removida");
      await fetchSolicitudes();
    } catch (error) {
      console.error(error);
      alert("Error al asignar afiliado");
    }
  };

  const handleEstadoChange = (id: string, val: string) => {
    setNuevosEstados(prev => ({ ...prev, [id]: val }));
  };
  const handleMensajeChange = (id: string, val: string) => {
    setNuevosMensajes(prev => ({ ...prev, [id]: val }));
  };

  const guardarCambios = async (sol: Solicitud) => {
    const estadoToSave = nuevosEstados[sol.id] || sol.estado;
    const mensajeToSave = nuevosMensajes[sol.id] !== undefined ? nuevosMensajes[sol.id] : (sol.mensajeAdmin || "");
    
    if (estadoToSave === "REQUIERE_INFO" && !mensajeToSave.trim()) {
      return alert("¡Debes escribir un mensaje explicando qué información falta para poder requerirla!");
    }

    setGuardandoId(sol.id);
    try {
      await updateDoc(doc(db, "solicitudes", sol.id), {
        estado: estadoToSave,
        mensajeAdmin: mensajeToSave
      });
      alert("¡Solicitud actualizada exitosamente!");
      await fetchSolicitudes();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al actualizar la solicitud.");
    } finally {
      setGuardandoId(null);
    }
  };

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-yellow-500">Cargando base de datos...</div>;
  }

  const afiliadoesActivos = Array.from(new Set(["jpmosqueira@hotmail.com", ...solicitudes.map((s: any) => s.afiliadoEmail).filter(Boolean)]));

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-black text-yellow-500 p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-12 border-b border-yellow-500/30 pb-4">
            <div className="flex items-center gap-4">
  <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Electro en Cuotas Logo" className="h-10 w-auto object-contain" />
  <h1 className="text-2xl font-bold text-yellow-400">Bandeja de Pendientes & Validaciones</h1>
</div>
            <Link href="/admin" className="text-sm border border-yellow-500/50 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded transition-colors">
              Volver Atrás
            </Link>
          </header>

          <div className="space-y-8">
            {solicitudes.length === 0 && (
              <p className="text-center text-yellow-200/50 italic py-12 text-xl">
                Aún no hay solicitudes de crédito registradas.
              </p>
            )}

            {solicitudes.map(sol => {
              const currentEstado = nuevosEstados[sol.id] || sol.estado;
              const currentMensaje = nuevosMensajes[sol.id] !== undefined ? nuevosMensajes[sol.id] : (sol.mensajeAdmin || "");
              
              return (
                <div key={sol.id} className="bg-zinc-900 border border-yellow-500/20 rounded-lg p-6 lg:flex lg:gap-8 relative overflow-hidden">
                  {/* Etiqueta especial de Afiliado (Condicional) */}
                  {sol.cargadoPorAfiliado && (
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-bl-lg shadow-md">
                      🤵 Carga vía Afiliado: {sol.afiliadoEmail}
                    </div>
                  )}

                  <div className="flex-1 mb-6 lg:mb-0 lg:border-r border-yellow-500/20 lg:pr-8">
                    <div className="flex justify-between items-center mb-4 mt-2 lg:mt-0">
                      <h2 className="text-2xl font-bold text-white">{sol.productoDeseado}</h2>
                      <span className="bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold w-fit">
                        {sol.fechaCreacion ? new Date(sol.fechaCreacion.seconds * 1000).toLocaleDateString() : 'Desconocida'}
                      </span>
                    </div>

                    {/* SECCION ASIGNACION AFILIADO */}
                     <div className="mb-6 bg-black border border-yellow-500/20 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                        <div>
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Afiliado a Cargo del Legajo / Seguimiento</p>
                           {sol.afiliadoEmail ? (
                              <p className="text-sm text-yellow-400 font-bold flex items-center gap-2">
                                👤 {sol.afiliadoEmail}
                                <button onClick={() => handleAsignarAfiliado(sol.id, "")} className="text-[10px] text-red-500 hover:text-red-400 underline ml-2">(Quitar Asignación)</button>
                              </p>
                           ) : (
                              <p className="text-sm text-gray-400 italic">Libre (Sin asignar a equipo de ventas)</p>
                           )}
                        </div>
                        
                        {!sol.afiliadoEmail && (
                           <div className="flex gap-2 w-full sm:w-auto">
                              <select id={`seller_${sol.id}`} className="bg-zinc-900 border border-gray-700 text-xs p-2.5 rounded text-white focus:outline-none focus:border-yellow-500 flex-1 sm:w-48">
                                <option value="">-- Seleccionar --</option>
                                {afiliadoesActivos.map(v => <option key={v as string} value={v as string}>{v as string}</option>)}
                                <option value="NUEVO" className="font-bold text-yellow-500">+ Escribir correo nuevo...</option>
                              </select>
                              <button onClick={() => {
                                 const el = document.getElementById(`seller_${sol.id}`) as HTMLSelectElement;
                                 let email = el.value;
                                 if (email === "NUEVO") email = prompt("Escribe el correo electrónico exacto del afiliado nuevo:") || "";
                                 if (email) handleAsignarAfiliado(sol.id, email);
                              }} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2.5 rounded text-xs font-bold transition-colors shadow-md">Delegar</button>
                           </div>
                        )}
                     </div>
                    
                    <div className="bg-black border border-yellow-500/20 p-4 rounded mb-6 mt-4">
                      <h3 className="text-lg font-semibold text-yellow-400 mb-2 border-b border-yellow-500/20 pb-1">Perfil Crediticio de:</h3>
                      {sol.datosPersonales ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-yellow-200/80">
                          <p><strong className="text-white">Nombre:</strong> {sol.datosPersonales.nombreCompleto}</p>
                          <p><strong className="text-white">DNI:</strong> {sol.datosPersonales.numeroDni}</p>
                          <p><strong className="text-white">Tel:</strong> {sol.datosPersonales.telefono}</p>
                          <p><strong className="text-white">Contacto Email:</strong> {sol.clienteEmail}</p>
                          <p className="col-span-1 md:col-span-2"><strong className="text-white">Domicilio:</strong> {sol.datosPersonales.direccion}, {sol.datosPersonales.localidad}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-yellow-200/50">Solicitud antigua (Email de contacto: {sol.clienteEmail})</p>
                      )}
                    </div>

                    <h3 className="font-semibold text-lg border-b border-yellow-500/10 mb-4 pb-2">Documentación Adjuntada</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <a href={sol.documentos?.dniFrente} target="_blank" rel="noreferrer" className="text-center bg-zinc-800 border border-gray-700 hover:border-yellow-500 hover:text-yellow-400 p-3 rounded text-sm transition-colors">
                        📷 Ver DNI Frente
                      </a>
                      <a href={sol.documentos?.dniDorso} target="_blank" rel="noreferrer" className="text-center bg-zinc-800 border border-gray-700 hover:border-yellow-500 hover:text-yellow-400 p-3 rounded text-sm transition-colors">
                        📷 Ver DNI Dorso
                      </a>
                      <a href={sol.documentos?.reciboSueldo} target="_blank" rel="noreferrer" className="text-center bg-zinc-800 border border-gray-700 hover:border-yellow-500 hover:text-yellow-400 p-3 rounded text-sm transition-colors">
                        📄 Ver Recibo Sueldo
                      </a>
                      <a href={sol.documentos?.servicio} target="_blank" rel="noreferrer" className="text-center bg-zinc-800 border border-gray-700 hover:border-yellow-500 hover:text-yellow-400 p-3 rounded text-sm transition-colors">
                        📄 Ver Servicio
                      </a>
                    </div>
                  </div>

                  <div className="w-full lg:w-1/3 flex flex-col space-y-4">
                    <h3 className="font-semibold text-lg text-white">Resolución Administrativa</h3>
                    
                    <div>
                      <label className="block text-sm mb-1 text-yellow-200">Dictamen sobre la Solicitud:</label>
                      <select 
                        value={currentEstado} 
                        onChange={(e) => handleEstadoChange(sol.id, e.target.value)}
                        className={`w-full bg-zinc-800 border-2 rounded p-2 text-white font-bold focus:outline-none \${
                          currentEstado === 'PENDIENTE' ? 'border-blue-500/50 text-blue-400' :
                          currentEstado === 'APROBADO' ? 'border-green-500 text-green-400' :
                          currentEstado === 'RECHAZADO' ? 'border-red-500 text-red-500' :
                          'border-orange-500 text-orange-400'
                        }`}
                      >
                        <option value="PENDIENTE" className="text-blue-400 font-bold">● PENDIENTE</option>
                        <option value="APROBADO" className="text-green-400 font-bold">● APROBAR VENTA</option>
                        <option value="RECHAZADO" className="text-red-500 font-bold">● RECHAZAR SOLICITUD</option>
                        <option value="REQUIERE_INFO" className="text-orange-400 font-bold">● REQUERIR NUEVA INFO</option>
                      </select>
                    </div>

                    
                    
                        {/* ESTADO FÍSICO / INVENTARIO TERCERIZADO */}
                        <div className="bg-zinc-950 border border-zinc-700 p-3 rounded-lg flex flex-col gap-1 mb-4 mt-4">
                           <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">🎯 Ubicación Física / Inventario:</label>
                           <select 
                             value={sol.estadoProducto || "En depósito (Central)"}
                             onChange={e => handleActualizarEstadoProducto(sol.id, e.target.value)}
                             className="bg-black text-xs px-2 py-2 rounded text-gray-300 font-bold outline-none border border-zinc-700 focus:border-yellow-500 w-full"
                           >
                              <option value="En depósito (Central)">🏢 En depósito (Central)</option>
                              <option value="En stock (Afiliado)">👤 En manos del Afiliado</option>
                              <option value="En viaje">🚚 En viaje</option>
                              <option value="Encargado a proveedor">📦 Encargado a proveedor</option>
                           </select>
                           {sol.historialRecepcion && (
                             <p className="text-[10px] text-green-400 italic mt-1 bg-green-900/20 p-1 rounded border border-green-500/30">✅ {sol.historialRecepcion}</p>
                           )}
                        </div>
                    {(sol.estado === "APROBADO" || currentEstado === "APROBADO") && (
                       <div className="mt-6 border border-blue-500/30 bg-blue-900/10 p-4 rounded-lg mb-2">
                          <h4 className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-widest flex items-center gap-2">🚚 Control de Logística y Entrega</h4>
                          
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">Estado de Envío:</span>
                                {entregaActiva === sol.id ? (
                                   <span className="text-[10px] font-bold text-yellow-500 block text-right">Completando entrega...</span>
                                ) : (
                                <select 
                                   value={sol.estadoEntrega || "PENDIENTE_ENTREGA"}
                                   onChange={e => {
                                      const val = e.target.value;
                                      if (val === "ENTREGADO") {
                                         setNserie(""); setMontoAbonado(sol.montoCuota?.toString() || ""); setMetodoPago("Efectivo"); setComentarioEntrega("");
                                         setEntregaActiva(sol.id);
                                      } else {
                                         handleConfirmarEntregaAdmin(sol.id, val, true);
                                      }
                                   }}
                                   className="bg-black border border-blue-500/50 text-xs px-2 py-1.5 rounded text-white font-bold outline-none"
                                >
                                   <option value="PENDIENTE_ENTREGA">Pendiente de entrega</option>
                                   <option value="ENTREGADO">Entregado al Cliente</option>
                                   <option value="ANULADO">Anuló compra / Falló</option>
                                </select>
                                )}
                             </div>
                             
                             {entregaActiva === sol.id && (
                                <div className="bg-blue-950/30 border border-blue-500/50 p-4 rounded mt-2 flex flex-col gap-3 w-full max-w-sm">
                                   <h4 className="text-blue-400 font-bold text-xs uppercase text-center border-b border-blue-500/30 pb-2 mb-1">Confirmación de Cierre</h4>
                                   <div>
                                     <label className="block text-[10px] text-gray-400 mb-1">Nº de Serie del Producto (Obligatorio)</label>
                                     <input type="text" value={nserie} onChange={e=>setNserie(e.target.value)} placeholder="Ej: SN-928374928" className="bg-black text-white px-3 py-2 rounded text-xs border border-blue-900 w-full focus:border-blue-500 outline-none" />
                                   </div>
                                   <div className="grid grid-cols-2 gap-3">
                                     <div>
                                       <label className="block text-[10px] text-gray-400 mb-1">Monto Abonado ($)</label>
                                       <input type="number" value={montoAbonado} onChange={e=>setMontoAbonado(e.target.value)} className="bg-black text-white px-3 py-2 rounded text-xs border border-blue-900 w-full focus:border-blue-500 outline-none font-bold" />
                                     </div>
                                     <div>
                                       <label className="block text-[10px] text-gray-400 mb-1">Método de Pago</label>
                                       <select value={metodoPago} onChange={e=>setMetodoPago(e.target.value)} className="bg-black text-white px-3 py-2 rounded text-xs border border-blue-900 w-full focus:border-blue-500 outline-none font-bold">
                                         <option value="Efectivo">💵 Efectivo</option>
                                         <option value="Transferencia">📱 Transferencia</option>
                                       </select>
                                     </div>
                                   </div>
                                   <div>
                                     <label className="block text-[10px] text-gray-400 mb-1">Comentario Adicional (Opcional)</label>
                                     <input type="text" value={comentarioEntrega} onChange={e=>setComentarioEntrega(e.target.value)} placeholder="..." className="bg-black text-white px-3 py-2 rounded text-xs border border-blue-900 w-full focus:border-blue-500 outline-none" />
                                   </div>
                                   <div className="flex gap-2 mt-2">
                                     <button onClick={() => setEntregaActiva(null)} className="flex-1 bg-zinc-800 text-gray-300 py-2 rounded text-xs font-bold hover:bg-zinc-700 transition">Cancelar</button>
                                     <button onClick={() => handleConfirmarEntregaAdmin(sol.id, "ENTREGADO")} className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-500 transition shadow-md">✓ GUARDAR</button>
                                   </div>
                                </div>
                             )}
                             
                             {sol.estadoEntrega === "ENTREGADO" && !entregaActiva && (
                                <div className="bg-green-500/10 border border-green-500/30 p-2 rounded mt-2 flex flex-col gap-1 w-full max-w-sm">
                                  <p className="text-xs text-green-400"><strong className="text-green-500">Nº SERIE:</strong> {sol.numeroSerie || "No registrado"}</p>
                                  <p className="text-xs text-green-400"><strong className="text-green-500">PAGO:</strong> ${sol.montoAbonado || 0} ({sol.metodoPago || "N/A"})</p>
                                </div>
                             )}
                             
                             {sol.estadoEntrega === "ENTREGADO" && (
                                <div className="bg-green-500/10 border border-green-500/30 p-2 rounded mt-2">
                                  <p className="text-xs text-green-400"><strong className="text-green-500">Nº SERIE:</strong> {sol.numeroSerie || "No registrado"}</p>
                                </div>
                             )}
                             
                             {sol.comentarioEntrega && (
                                <p className="text-xs text-gray-300 italic bg-black p-2 rounded mt-1 border border-zinc-800">"{sol.comentarioEntrega}"</p>
                             )}
                          </div>
                       </div>
                    )}
                    
                    <div className="mt-4">
                      
                             {sol.planPagos && (
                                <div className="mt-4 mb-4 bg-zinc-950 border border-yellow-500/20 p-4 rounded-lg">
                                  <h4 className="text-yellow-500 font-bold text-xs uppercase mb-3 flex items-center gap-2">💰 Auditoría de Cobros (Cuotas)</h4>
                                  <div className="flex flex-col gap-2">
                                    {sol.planPagos.map((cuota: any, idx: number) => (
                                       <div key={idx} className="bg-black border border-zinc-800 p-3 rounded flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
                                          <div>
                                            <p className="text-white font-bold text-sm">Cuota {cuota.numero} <span className="text-gray-500 font-normal">| ${cuota.montoOriginal}</span></p>
                                            <p className="text-[10px] text-gray-500">Vence: {new Date(cuota.vencimiento).toLocaleDateString()}</p>
                                          </div>
                                          
                                          <div className="flex flex-wrap items-center gap-3">
                                            {cuota.estado === "PAGADO" && (
                                              <div className="flex flex-col items-start gap-1">
                                                <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded text-[10px] font-bold">✅ PAGADO ({cuota.fechaPago ? new Date(cuota.fechaPago).toLocaleDateString() : 'Acreditado'})</span>
                                                {cuota.comprobanteUrl && <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-500/30 underline font-bold whitespace-nowrap mt-1">📄 Ver Recibo Guardado</a>}
                                              </div>
                                            )}
                                            {cuota.estado === "PENDIENTE" && <span className="text-orange-500 font-bold text-[10px]">⏳ PENDIENTE CLIENTE</span>}
                                            {cuota.estado === "EN_REVISION" && (
                                               <div className="flex flex-wrap items-center gap-2 bg-blue-900/30 p-2 rounded border border-blue-500/50">
                                                  <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 underline font-bold whitespace-nowrap">📄 Ver Recibo</a>
                                                  <div className="flex gap-1">
                                                    <button onClick={async () => {
                                                        const newPlan = [...(sol.planPagos || [])];
                                                        newPlan[idx].estado = "PAGADO";
                                                        newPlan[idx].fechaPago = new Date().toISOString();
                                                        await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan });
                                                        if (sol.afiliadoEmail) {
                                                           await addDoc(collection(db, "notificaciones"), {
                                                              afiliadoEmail: sol.afiliadoEmail,
                                                              mensaje: '¡Excelente! Se aprobó el recibo de ' + (sol.datosPersonales?.nombreCompleto || 'un cliente') + ' por $' + cuota.montoOriginal + '. Ya podés ver la comisión ganada.',
                                                              fecha: new Date().toISOString(),
                                                              leida: false,
                                                              comisionAsociada: cuota.montoOriginal * 0.15
                                                           });
                                                        }
                                                        await fetchSolicitudes();
                                                    }} className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-[10px] font-bold shadow-md">✓ Aprobar</button>
                                                    <button onClick={async () => {
                                                        const m = prompt("Motivo de rechazo (Ej: foto borrosa, comprobante viejo):");
                                                        if (m === null) return;
                                                        const newPlan = [...(sol.planPagos || [])];
                                                        newPlan[idx].estado = "PENDIENTE";
                                                        newPlan[idx].comprobanteUrl = null;
                                                        await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan });
                                                        await fetchSolicitudes();
                                                        alert("Rechazado. El estado volvió a PENDIENTE para el cliente.");
                                                    }} className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-[10px] font-bold shadow-md">✕ Rechazar</button>
                                                  </div>
                                               </div>
                                            )}
                                          </div>
                                       </div>
                                    ))}
                                  </div>
                                </div>
                             )}
                    {(currentEstado === "APROBADO" || sol.estado === "APROBADO") && (
                        <div className="flex flex-col gap-2 pt-4 border-t border-zinc-800 mt-2">
                          <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest text-center mb-1">Acciones Legales Automáticas</p>
                          <button onClick={() => generarContrato(sol)} className="bg-zinc-800 border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-black py-2.5 rounded text-sm font-bold transition-colors w-full flex items-center justify-center gap-2 shadow-sm">📄 Descargar Contrato PDF</button>
                          <button onClick={() => generarPagare(sol)} className="bg-zinc-800 border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-black py-2.5 rounded text-sm font-bold transition-colors w-full flex items-center justify-center gap-2 shadow-sm">📄 Descargar Pagaré PDF</button>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col">
                      <label className="block text-sm mb-1 text-yellow-200">Comentario para el cliente o afiliado:</label>
                      <textarea 
                        value={currentMensaje}
                        onChange={(e) => handleMensajeChange(sol.id, e.target.value)}
                        className="w-full flex-1 min-h-[100px] bg-zinc-800 border border-gray-700 rounded p-2 text-white focus:border-yellow-500 focus:outline-none text-sm resize-none"
                        placeholder="Ejemplo: Te faltó enviar el dorso del DNI con buena iluminación..."
                      />
                    </div>

                    <button 
                      onClick={() => guardarCambios(sol)}
                      disabled={guardandoId === sol.id || (currentEstado === sol.estado && currentMensaje === (sol.mensajeAdmin||""))}
                      className="w-full bg-yellow-500 text-black py-4 rounded-lg font-extrabold hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:shadow-none"
                    >
                      {guardandoId === sol.id ? "Conectando..." : "Registrar Dictamen"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}