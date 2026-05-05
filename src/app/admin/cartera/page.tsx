"use client";

import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, query, updateDoc, deleteDoc, where, addDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CarteraPage() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nuevaNota, setNuevaNota] = useState("");
  const [modalConfirmacion, setModalConfirmacion] = useState<{solId: string, idxCuota: number, planPagos: any[]} | null>(null);
  const [montoIngresado, setMontoIngresado] = useState("");
  const [metodoPagoCuota, setMetodoPagoCuota] = useState("Efectivo");
  const [modalBorrar, setModalBorrar] = useState<string | null>(null);
  const [fechaPromesa, setFechaPromesa] = useState("");

  const generarPlanRetroactivo = async (sol: any) => {
      if(!sol.planElegido) return alert("Esta solicitud no tiene plan de cuotas registrado (ej. 12).");
      const cant = parseInt(sol.planElegido);
      if(isNaN(cant)) return alert("El plan elegido no es un número válido.");
      
      try {
         const planArr = [];
         // Start from creation date or today
         const bDate = sol.fechaEntrega ? new Date(sol.fechaEntrega) : new Date();
         
         for(let i = 1; i <= cant; i++) {
            const nd = new Date(bDate);
            nd.setMonth(nd.getMonth() + (i - 1));
            planArr.push({
               numero: i,
               montoOriginal: sol.montoCuota || 0,
               montoAbonado: i === 1 ? (sol.montoAbonado || 0) : 0,
               estado: i === 1 ? (sol.estadoRendicion === "CONFIRMADO" ? "PAGADO" : "PENDIENTE") : "PENDIENTE",
               vencimiento: nd.toISOString(),
               fechaPago: i === 1 ? (sol.fechaRendicionReal || new Date().toISOString()) : null,
               metodoPago: i === 1 ? (sol.metodoPago || "Efectivo") : null,
               comprobanteUrl: null
            });
         }
         await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: planArr });
         alert("¡Plan reconstruido exitosamente! Ahora el cliente verá su Estado de Cuenta.");
         fetchData();
      } catch(e) {
         console.error(e);
         alert("Error regenerando plan de pagos.");
      }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "solicitudes"), where("estadoEntrega", "==", "ENTREGADO"));
      const snap = await getDocs(q);
      const items: any[] = [];
      snap.forEach(doc => {
         items.push({ id: doc.id, ...doc.data() });
      });
      setSolicitudes(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAgregarNota = async (sol: any) => {
    if (!nuevaNota.trim()) return alert("Debes escribir una nota.");
    try {
      const historial = sol.historialContactos || [];
      const nuevoRegistro = {
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
        usuario: user?.email || "Admin",
        nota: nuevaNota.trim(),
        promesaPago: fechaPromesa || null
      };

      await updateDoc(doc(db, "solicitudes", sol.id), {
        historialContactos: [nuevoRegistro, ...historial]
      });

      alert("Nota de seguimiento agregada.");
      setNuevaNota("");
      setFechaPromesa("");
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Error al guardar la nota.");
    }
  };

  const aprobarCuotaMensual = async (solId: string, idxCuota: number, planPagosActual: any[]) => {
    if (!window.confirm("¿Estás seguro que el cliente realizó correctamente este pago? Se marcará como Verificado.")) return;
    try {
      const nuevoPlan = [...planPagosActual];
      nuevoPlan[idxCuota] = {
         ...nuevoPlan[idxCuota],
         estado: "PAGADO",
         fechaResolucionAdmin: new Date().toISOString(),
         adminFirma: user?.email || "Central"
      };
      await updateDoc(doc(db, "solicitudes", solId), { planPagos: nuevoPlan });
      alert("Cuota verificada y aprobada como PAGADA en el historial del cliente.");
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Hubo un error al aprobar la cuota.");
    }
  };

  const calcularEstadoCuotas = (planPagos: any[]) => {
    if (!planPagos) return { pagadas: 0, restantes: 0, atrasadas: 0, montcAtrasado: 0 };
    let pagadas = 0; let restantes = 0; let atrasadas = 0; let montcAtrasado = 0;
    const hoy = new Date();
    
    planPagos.forEach(cuota => {
      if (cuota.estado === "PAGADO") pagadas++;
      else {
        restantes++;
        if (new Date(cuota.vencimiento) < hoy) {
          atrasadas++;
          montcAtrasado += Number(cuota.montoOriginal);
        }
      }
    });
    return { pagadas, restantes, atrasadas, montcAtrasado };
  };

  const hoyStr = new Date().toISOString().split("T")[0];
  const promesasExigibles = solicitudes.filter(sol => {
     if (sol.estadoEntrega !== "ENTREGADO") return false;
     const est = calcularEstadoCuotas(sol.planPagos);
     if (est.atrasadas === 0) return false;
     if (!sol.historialContactos || sol.historialContactos.length === 0) return false;
     const ultimaPromesa = sol.historialContactos.find((c:any) => c.promesaPago);
     if (!ultimaPromesa) return false;
     return ultimaPromesa.promesaPago <= hoyStr;
  });

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-yellow-500/30 pb-4">
          <div>
             <h1 className="text-3xl font-black text-yellow-500">Gestión de Cartera Activa</h1>
             <p className="text-gray-400 text-sm mt-1">Seguimiento de cuotas, cobranzas y promesas de pago.</p>
          </div>
          <Link href="/admin" className="text-gray-400 border border-gray-700 px-4 py-2 rounded hover:text-white transition font-bold">← Volver al Panel</Link>
        </header>

        {promesasExigibles.length > 0 && !loading && (
           <div className="bg-red-900/30 border border-red-500/80 p-5 rounded-xl mb-8 flex flex-col gap-2 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <h3 className="text-red-400 font-black text-lg flex items-center gap-2">⚠️ ATENCIÓN: Promesas de Pago Pendientes para Hoy</h3>
              <p className="text-sm text-gray-400 mb-2">Los siguientes clientes tienen promesas pactadas para hoy o días anteriores pero el sistema detecta que continúan con morosidad activa.</p>
              <div className="flex flex-wrap gap-3">
                 {promesasExigibles.map(sol => {
                    const lProm = sol.historialContactos.find((c:any) => c.promesaPago);
                    return (
                       <div key={sol.id} onClick={() => setExpandedId(sol.id)} className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-white px-4 py-2 rounded-lg border border-red-500/30 transition shadow-sm">
                          <p className="text-sm font-bold">{sol.datosPersonales?.nombreCompleto}</p>
                          <p className="text-[10px] text-red-300">Pactó: {new Date(lProm.promesaPago + "T12:00:00").toLocaleDateString()} ⭐</p>
                          <p className="text-[10px] text-gray-400">📲 {sol.datosPersonales?.telefono}</p>
                       </div>
                    )
                 })}
              </div>
           </div>
        )}

        {loading ? (
          <p className="text-center text-gray-400 font-bold mt-20">Cargando base de cartera...</p>
        ) : solicitudes.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center shadow-lg max-w-xl mx-auto mt-12">
            <h2 className="text-xl font-bold text-white mb-2">Cartera Vacía</h2>
            <p className="text-gray-400">No hay ventas entregadas actualmente activas en seguimiento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {solicitudes.map(sol => {
              const est = calcularEstadoCuotas(sol.planPagos);
              return (
                <div key={sol.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative flex flex-col">
                  {est.atrasadas > 0 && <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md uppercase animate-pulse">MOROSO ({est.atrasadas})</div>}
                  {est.restantes === 0 && est.pagadas > 0 && <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md uppercase">FINALIZADO</div>}
                  
                  <div className="mb-4 border-b border-zinc-800 pb-4 mt-6">
                     {/* BOTON DE BORRAR */}
                     <button onClick={() => setModalBorrar(sol.id)} className="absolute top-2 left-2 z-10 text-red-500 hover:text-white bg-red-500/10 hover:bg-red-600 rounded p-1.5 transition-colors border border-red-500/30" title="Eliminar Cliente de la Base de Datos">
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                     </button>
                     
                     <h3 className="text-xl font-black text-white mb-1">{sol.datosPersonales?.nombreCompleto || "Desconocido"}</h3>
                     <p className="text-gray-400 text-sm flex gap-2"><span className="text-yellow-500 font-bold">📲 {sol.datosPersonales?.telefono}</span> <span className="text-zinc-500">|</span> <span className="text-gray-400">{sol.datosPersonales?.numeroDni}</span></p>
                     <p className="text-gray-500 text-xs mt-1">Afiliado asignado: {sol.afiliadoEmail}</p>
                     <p className="text-blue-400 font-bold text-sm mt-3">Equipo: {sol.productoDeseado}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mb-6">
                     <div className="bg-black border border-zinc-800 p-2 rounded">
                       <p className="text-2xl font-black text-green-500">{est.pagadas}</p>
                       <p className="text-[10px] text-gray-500 uppercase">Pagadas</p>
                     </div>
                     <div className="bg-black border border-zinc-800 p-2 rounded">
                       <p className="text-2xl font-black text-yellow-500">{est.restantes}</p>
                       <p className="text-[10px] text-gray-500 uppercase">Restantes</p>
                     </div>
                     <div className={`p-2 rounded border ${est.atrasadas > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-black border-zinc-800'}`}>
                       <p className={`text-2xl font-black ${est.atrasadas > 0 ? 'text-red-500' : 'text-gray-500'}`}>{est.atrasadas}</p>
                       <p className="text-[10px] text-gray-500 uppercase">Vencidas</p>
                     </div>
                  </div>

                  {est.atrasadas > 0 && (
                     <div className="bg-red-900/20 border border-red-500/20 p-3 rounded mb-6">
                        <p className="text-red-400 text-xs text-center font-bold">Deuda Exigible Inmediata: <span className="text-lg">${est.montcAtrasado}</span></p>
                     </div>
                  )}

                  <button onClick={() => setExpandedId(expandedId === sol.id ? null : sol.id)} className="mt-auto w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded text-sm transition border border-zinc-700 shadow-md">
                    {expandedId === sol.id ? "Cerrar Panel de Venta" : "Ver Plan de Cuotas y Bitácora 💳"}
                  </button>

                  {expandedId === sol.id && (
                     <div className="mt-6 pt-6 border-t border-zinc-800 animate-fade-in space-y-8">
                        
                        {/* SECCION NUEVA: PLANILLA DE CUOTAS CLARA ABSOLUTA */}
                        <div className="bg-black rounded-lg border border-yellow-500/20 p-4 shadow-inner overflow-hidden">
                           <h4 className="text-yellow-500 font-bold text-sm mb-4 border-b border-yellow-500/20 pb-2"> Plan de Cuotas del Producto </h4>
                           {!sol.planPagos || sol.planPagos.length === 0 ? (
                               <div className="flex flex-col items-center gap-3 py-4 bg-red-900/10 border border-red-500/30 rounded-lg">
                                  <p className="text-red-400 text-xs text-center font-bold">⚠️ Esta venta es antigua y no tiene vector de cuotas.</p>
                                  <button onClick={() => generarPlanRetroactivo(sol)} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded text-xs font-bold w-fit shadow-md transition-all uppercase tracking-wider">
                                     Generar Vector de {sol.planElegido || '?'} Cuotas Automáticamente
                                  </button>
                               </div>
                           ) : (
                               <div className="space-y-3">
                                  {sol.planPagos.map((cuota: any, idx: number) => {
                                      const isAtrasada = cuota.estado !== "PAGADO" && new Date(cuota.vencimiento) < new Date();
                                      return (
                                        <div key={idx} className={`p-3 rounded border flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm ${cuota.estado === 'PAGADO' ? 'bg-green-900/10 border-green-500/30' : cuota.estado === 'EN_REVISION' ? 'bg-blue-900/20 border-blue-500/50' : isAtrasada ? 'bg-red-900/20 border-red-500/30' : 'bg-zinc-900 border-zinc-700/50'}`}>
                                            <div>
                                               <p className="font-bold text-white">Cuota {cuota.numero} <span className="text-yellow-400 ml-2">${cuota.montoOriginal}</span></p>
                                               <p className="text-xs text-gray-400">Vence: {new Date(cuota.vencimiento).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex flex-col md:items-end gap-1">
                                               <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider w-fit ${cuota.estado === 'PAGADO' ? 'bg-green-500/20 text-green-400' : cuota.estado === 'EN_REVISION' ? 'bg-blue-500 text-white animate-pulse' : isAtrasada ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-400'}`}>
                                                  {isAtrasada && cuota.estado !== 'PAGADO' && cuota.estado !== 'EN_REVISION' ? 'VENCIDA' : cuota.estado}
                                               </span>
                                               
                                               {cuota.comprobanteUrl && (
                                                  <div className="flex gap-2 mt-2">
                                                     <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded font-bold shadow-md">👀 Ver Recibo</a>
                                                     {cuota.estado === "EN_REVISION" && (
                                                     <button onClick={() => {
                                                         setModalConfirmacion({solId: sol.id, idxCuota: idx, planPagos: sol.planPagos});
                                                         setMontoIngresado(cuota.montoOriginal.toString());
                                                      }} className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded font-bold shadow-md hover:scale-105 transition-transform">✓ Aprobar Pago Central</button>
                                                     )}
                                                  </div>
                                               )}
                                            </div>
                                        </div>
                                      )
                                  })}
                               </div>
                           )}
                        </div>

                        {/* SECCION: BITACORA */}
                        <div>
                            <h4 className="text-white font-bold text-sm mb-3 border-b border-zinc-800 pb-1 flex justify-between">Historial de Contactos <span className="text-[10px] text-gray-500 font-normal mt-1">(Bitácora)</span></h4>
                            {(!sol.historialContactos || sol.historialContactos.length === 0) ? (
                               <p className="text-xs text-gray-500 italic text-center py-4">No hay contactos registrados aún.</p>
                            ) : (
                               <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar mb-4">
                                  {sol.historialContactos.map((log: any) => (
                                     <div key={log.id} className="bg-zinc-800/50 p-3 rounded border border-zinc-700/50">
                                        <div className="flex justify-between items-start mb-1">
                                           <span className="text-[10px] text-gray-400 font-bold">{new Date(log.fecha).toLocaleString()}</span>
                                           <span className="text-[9px] bg-black px-2 py-0.5 rounded text-gray-500">{log.usuario}</span>
                                        </div>
                                        <p className="text-sm text-gray-200">{log.nota}</p>
                                        {log.promesaPago && (
                                           <div className="mt-2 bg-yellow-500/10 border border-yellow-500/30 p-1.5 rounded flex items-center gap-2">
                                              <span className="text-yellow-500 text-[10px] font-bold">📅 PROMESA D/PAGO:</span>
                                              <span className="text-yellow-400 text-[11px] font-bold">{new Date(log.promesaPago + "T12:00:00").toLocaleDateString()}</span>
                                           </div>
                                        )}
                                     </div>
                                  ))}
                               </div>
                            )}

                            <div className="bg-black p-4 rounded-lg border border-yellow-500/10">
                               <h5 className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-2">Registrar una nueva gestión telefónica/whatsapp</h5>
                               <textarea value={nuevaNota} onChange={e=>setNuevaNota(e.target.value)} placeholder="Ej: Llamé y dijo que cancela en RapiPago mañana a las 18hs..." className="w-full bg-zinc-900 text-white p-3 rounded border border-zinc-700 text-xs outline-none focus:border-yellow-500 h-20 min-h-[4rem] mb-3 transition-colors" />
                               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                                  <label className="text-[11px] font-bold text-gray-400 whitespace-nowrap">Agendar Promesa P.:</label>
                                  <input type="date" value={fechaPromesa} onChange={e=>setFechaPromesa(e.target.value)} className="w-full sm:w-auto bg-zinc-900 text-white p-2 rounded border border-zinc-700 text-xs outline-none focus:border-yellow-500" />
                               </div>
                               <button onClick={() => handleAgregarNota(sol)} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs py-3 rounded uppercase tracking-wider transition-colors shadow-md">
                                  + Guardar Nota a la Bitácora
                               </button>
                            </div>
                        </div>

                     </div>
                  )}

                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* MODAL DE CONFIRMACION REACTIVO */}
      {modalConfirmacion && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-yellow-500/50 rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center animate-fade-in text-center">
               <div className="bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center mb-6 border border-green-500/30">
                  <span className="text-green-500 text-4xl font-black">✓</span>
               </div>
               <h3 className="text-2xl font-black text-white mb-3">Liquidar Cuota</h3>
               <p className="text-gray-400 text-sm mb-4 leading-relaxed">¿Estás completamente seguro de que el importe de esta cuota impactó en tu cuenta bancaria y deseas marcarla como cerrada permanentemente?</p>
               
               <div className="w-full text-left mb-6 bg-black p-4 rounded-lg border border-zinc-800">
                  <label className="text-xs text-yellow-500 font-bold uppercase mb-2 block">Monto Realmente Pagado ($)</label>
                  <input 
                     type="number" 
                     value={montoIngresado} 
                     onChange={(e) => setMontoIngresado(e.target.value)}
                     className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 rounded-lg focus:border-yellow-500 outline-none transition-colors font-bold text-lg"
                     min="0"
                  />
                  <p className="text-[10px] text-gray-500 mt-2">Si el pago es parcial, el saldo restante se sumará automáticamente a la próxima cuota o creará una nueva.</p>
               </div>
               <div className="w-full text-left mb-6 bg-black p-4 rounded-lg border border-zinc-800">
                  <label className="text-xs text-yellow-500 font-bold uppercase mb-2 block">Método de Pago</label>
                  <select value={metodoPagoCuota} onChange={e=>setMetodoPagoCuota(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-white p-3 rounded-lg focus:border-yellow-500 outline-none font-bold">
                     <option value="Efectivo">Efectivo 💵</option>
                     <option value="Transferencia">Transferencia Bancaria 🏦</option>
                  </select>
               </div>

               <div className="w-full flex gap-3">
                  <button onClick={() => setModalConfirmacion(null)} className="flex-1 bg-zinc-800 text-gray-300 py-3.5 rounded-xl font-bold hover:bg-zinc-700 transition">Regresar</button>
                  <button onClick={async () => {
                     try {
                        const { solId, idxCuota, planPagos } = modalConfirmacion;
                        const montoFijo = parseFloat(montoIngresado);
                        if (isNaN(montoFijo) || montoFijo < 0) return alert("Ingresa un monto válido.");

                        const nuevoPlan = [...planPagos];
                        const cuotaActual = nuevoPlan[idxCuota];
                        const faltante = (cuotaActual.montoOriginal || 0) - montoFijo;

                        nuevoPlan[idxCuota] = {
                           ...cuotaActual,
                           estado: "PAGADO",
                           montoAbonadoReal: montoFijo,
                           fechaResolucionAdmin: new Date().toISOString(),
                           adminFirma: user?.email || "Central"
                        };

                        if (faltante > 0) {
                           if (idxCuota + 1 < nuevoPlan.length) {
                              const prox = nuevoPlan[idxCuota+1];
                              nuevoPlan[idxCuota+1] = {
                                  ...prox,
                                  montoOriginal: (prox.montoOriginal || 0) + faltante,
                                  notaAcumulacion: `Incluye saldo pendiente de $${faltante} arrastrado de la cuota ${cuotaActual.numero || idxCuota + 1}.`
                              };
                           } else {
                              const numProx = (cuotaActual.numero || idxCuota + 1) + 1;
                              const currentVec = new Date(cuotaActual.vencimiento);
                              currentVec.setMonth(currentVec.getMonth() + 1);
                              nuevoPlan.push({
                                 numero: numProx,
                                 montoOriginal: faltante,
                                 montoAbonado: 0,
                                 estado: "PENDIENTE",
                                 vencimiento: currentVec.toISOString(),
                                 fechaPago: null,
                                 metodoPago: null,
                                 comprobanteUrl: null,
                                 notaAcumulacion: `Cuota generada automáticamente por saldo pendiente de la cuota anterior.`
                              });
                           }
                        }

                        await updateDoc(doc(db, "solicitudes", solId), { planPagos: nuevoPlan });
                        
                        const curSol = solicitudes.find(s => s.id === solId);
                        if (curSol && curSol.afiliadoEmail && metodoPagoCuota === "Transferencia") {
                           await addDoc(collection(db, "notificaciones"), {
                              afiliadoEmail: curSol.afiliadoEmail,
                              mensaje: '¡Excelente! Se registró el pago de ' + (curSol.datosPersonales?.nombreCompleto || 'un cliente') + ' por $' + montoFijo + '. Ya podés ver en la plataforma la comisión asociada.',
                              fecha: new Date().toISOString(),
                              leida: false,
                              comisionAsociada: montoFijo * 0.15,
                              estadoPago: "PENDIENTE",
                              cuotaAsociada: cuotaActual.numero || idxCuota + 1,
                              clienteNombre: curSol.datosPersonales?.nombreCompleto || 'Desconocido'
                           });
                        }
                        alert("¡Cuota liquidada exitosamente!");
                        setModalConfirmacion(null);
                        fetchData();
                     } catch(e) { alert("Error al aprobar."); }
                  }} className="flex-1 bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-500 transition shadow-[0_0_20px_rgba(34,197,94,0.4)]">Sí, cobrar</button>
               </div>
            </div>
         </div>
      )}

      {/* MODAL DE ELIMINACION DEFINITIVA */}
      {modalBorrar && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-black border border-red-500/50 rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.3)] flex flex-col items-center animate-fade-in text-center">
               <div className="bg-red-500/10 w-20 h-20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                  <span className="text-red-500 text-4xl font-black">!</span>
               </div>
               <h3 className="text-2xl font-black text-white mb-3">Eliminar Cartera</h3>
               <p className="text-gray-400 text-sm mb-6 leading-relaxed">Estás a punto de <strong className="text-red-400">borrar a este cliente y toda su historia de la faz de la tierra</strong>. Esto es I-R-R-E-V-E-R-S-I-B-L-E. ¿Estás absolutamente seguro?</p>
               <div className="w-full flex gap-3">
                  <button onClick={() => setModalBorrar(null)} className="flex-1 bg-zinc-800 text-gray-300 py-3.5 rounded-xl font-bold hover:bg-zinc-700 transition">Cancelar</button>
                  <button onClick={async () => {
                     try {
                        await deleteDoc(doc(db, "solicitudes", modalBorrar));
                        alert("Cliente y cartera evaporados correctamente.");
                        setModalBorrar(null);
                        fetchData();
                     } catch(e) { alert("Error al borrar."); }
                  }} className="flex-1 bg-red-600 text-white py-3.5 rounded-xl font-bold hover:bg-red-500 transition shadow-lg">Purgar Base</button>
               </div>
            </div>
         </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #52525b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #eab308; }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}