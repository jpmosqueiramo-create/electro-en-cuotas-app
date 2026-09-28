"use client";

import { AdminNav } from "@/components/AdminNav";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { obtenerVendedores, Vendedor } from "@/lib/vendedoresManager";
import { collection, doc, getDocs, query, updateDoc, deleteDoc, where, addDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { sanitizePhoneWhatsApp } from "@/lib/phoneUtils";
import { generarComprobantePago } from "@/lib/pdfGenerator";


const generarMensajeRecordatorioCuota = (sol: any, cuota?: any) => {
  const nombre = sol.datosPersonales?.nombreCompleto || sol.nombreCompleto || sol.nombre || "Cliente";
  const producto = sol.productoDeseado || sol.productoNombre || "su producto";
  const nroContrato = sol.nroContrato || (sol.id ? sol.id.substring(0, 8).toUpperCase() : "");

  let detalleCuota = "";
  if (cuota) {
    let fecVenc = "vencida";
    if (cuota.vencimiento) {
      try {
        const dStr = cuota.vencimiento.includes("T") ? cuota.vencimiento : cuota.vencimiento + "T12:00:00";
        fecVenc = new Date(dStr).toLocaleDateString("es-AR");
      } catch (e) {}
    }
    const monto = Number(cuota.montoOriginal || 0).toLocaleString("es-AR");
    detalleCuota = `• *Cuota N° ${cuota.numero}*: $ ${monto} (Venció el ${fecVenc})`;
  } else {
    let atrasadas = 0;
    let montcAtrasado = 0;
    if (sol.planPagos) {
      const hoy = new Date();
      sol.planPagos.forEach((c: any) => {
        if (c.estado !== "PAGADO" && new Date(c.vencimiento) < hoy) {
          atrasadas++;
          montcAtrasado += Number(c.montoOriginal || 0);
        }
      });
    }
    const montoTotal = Number(montcAtrasado || 0).toLocaleString("es-AR");
    detalleCuota = `• *Saldo Vencido Pendiente*: $ ${montoTotal} (${atrasadas} ${atrasadas === 1 ? 'cuota vencida' : 'cuotas vencidas'})`;
  }

  return `Hola ${nombre}, ¿cómo estás? 👋

Te escribimos desde *Cuenta Hogar* para enviarte un recordatorio amigable sobre tu plan de pagos del bien: *${producto}* ${nroContrato ? `(Legajo N° ${nroContrato})` : ''}.

📌 *Detalle del pago:*
${detalleCuota}

💳 *Medios de Pago Disponibles:*
• *Transferencia Bancaria / CBU*:
  - Alias: CUENTA.HOGAR.OFICIAL
  - Razón Social: LOOP GESTIÓN INTEGRAL S.R.L.
• *Efectivo*: En nuestra sucursal o centro de atención.

Por favor, una vez realizado el pago, envianos el comprobante por este medio para registrar tu cuota de inmediato. ¡Muchas gracias por tu atención! 😊`;
};

export default function CarteraPage() {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nuevaNota, setNuevaNota] = useState("");
  const [pagoAConfirmar, setPagoAConfirmar] = useState<any | null>(null);
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoComprobante, setPagoComprobante] = useState("");
  const [pagoCuentaDestino, setPagoCuentaDestino] = useState("Caja Efectivo");
  const [vendedoresList, setVendedoresList] = useState<Vendedor[]>([]);
  const [pagoVendedorDestino, setPagoVendedorDestino] = useState("ADMINISTRADOR");

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
    obtenerVendedores().then(setVendedoresList).catch(console.error);
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


  const handleProcesarPagoFinal = async () => {
    if (!pagoAConfirmar) return;
    const { solId, idx, metodo, originalAmount, isClientApprove } = pagoAConfirmar;
    
    const amountPaid = Number(pagoMonto);
    if (isNaN(amountPaid) || amountPaid < 0) {
      alert("Por favor, ingrese un monto válido.");
      return;
    }

    try {
      const sol = solicitudes.find(s => s.id === solId);
      if (!sol) return;

      const newPlan = [...(sol.planPagos || [])];
      const cuota = newPlan[idx];

      newPlan[idx].estado = "PAGADO";
      newPlan[idx].montoAbonado = amountPaid;
      newPlan[idx].fechaPago = new Date().toISOString();
      newPlan[idx].nroComprobante = pagoComprobante.trim();
      newPlan[idx].cuentaDestino = pagoCuentaDestino.trim();
      if (!isClientApprove) {
        newPlan[idx].metodoPagoManual = metodo;
      }

      const difference = originalAmount - amountPaid;
      let nextCuotaVal: number | undefined = undefined;
      let nextCuotaNum: number | undefined = undefined;
      let feedbackMsg = "Pago registrado y acreditado con éxito.";

      if (difference !== 0) {
        const nextPendingIdx = newPlan.findIndex((c, i) => i > idx && c.estado === "PENDIENTE");
        if (nextPendingIdx !== -1) {
          const oldVal = newPlan[nextPendingIdx].montoOriginal;
          const newVal = Math.max(0, oldVal + difference);
          newPlan[nextPendingIdx].montoOriginal = newVal;
          nextCuotaVal = newVal;
          nextCuotaNum = newPlan[nextPendingIdx].numero;
          feedbackMsg = `Pago registrado. Diferencia de $${difference > 0 ? '+' : ''}${difference} trasladada a la Cuota ${newPlan[nextPendingIdx].numero} (Nuevo valor: $${newVal}).`;
        } else {
          feedbackMsg = `Pago registrado. Diferencia residual de $${difference} asentada en la cuota final del plan.`;
        }
      }

      // Guardar en Firebase
      await updateDoc(doc(db, "solicitudes", solId), { planPagos: newPlan });

      // Generar Comprobante en PDF e iniciar descarga automática
      const receiptId = `REC-${solId.substring(0, 5).toUpperCase()}-${cuota.numero}`;
      const numCuotasTotal = sol.planPagos?.length || parseInt(sol.planElegido || "12") || 12;
      const cProdVal = Number((sol as any).precioContado || (sol as any).costoProducto || (sol as any).costoBien) || 0;
      const totalFinVal = Number((sol as any).totalFinanciado) || (amountPaid * numCuotasTotal);
      const baseGravVal = Math.max(0, totalFinVal - cProdVal);
      
      const mExentoCuota = numCuotasTotal > 0 ? Math.round(cProdVal / numCuotasTotal) : 0;
      const mGravadoCuota = numCuotasTotal > 0 ? Math.round(baseGravVal / numCuotasTotal) : 0;

      generarComprobantePago({
        nroContrato: (sol as any).nroContrato || `CH-${sol.id.substring(0, 8).toUpperCase()}`,
        nroRecibo: receiptId,
        fecha: new Date().toLocaleDateString("es-AR"),
        clienteNombre: sol.datosPersonales?.nombreCompleto || (sol as any).nombreCompleto || "Cliente",
        clienteDni: sol.datosPersonales?.numeroDni || (sol as any).numeroDni || "-",
        cuotaNumero: cuota.numero,
        cuotasTotal: numCuotasTotal,
        montoAbonado: amountPaid,
        montoExento: mExentoCuota,
        montoGravado: mGravadoCuota,
        metodoPago: isClientApprove ? "Aprobación Recibo Online" : metodo,
        nroComprobante: pagoComprobante.trim() || undefined,
        cuentaDestino: pagoCuentaDestino.trim() || undefined,
        proximaCuotaValor: nextCuotaVal,
        proximaCuotaNumero: nextCuotaNum,
        esPagoParcial: difference !== 0
      });

      // Asignación de Vendedor y Comisión
      let vendedorInfo: any = { id: "ADMINISTRADOR", nombre: "Administrador", porcentajeComision: 0, comisionMonto: 0 };
      if (pagoVendedorDestino !== "ADMINISTRADOR") {
        const vFound = vendedoresList.find(v => v.id === pagoVendedorDestino);
        if (vFound) {
          const pct = vFound.porcentajeComision || 0;
          const comMonto = Math.round(amountPaid * (pct / 100));
          vendedorInfo = {
            id: vFound.id,
            nombre: vFound.nombre,
            email: vFound.email,
            porcentajeComision: pct,
            comisionMonto: comMonto
          };
        }
      }

      newPlan[idx].vendedorId = vendedorInfo.id;
      newPlan[idx].vendedorNombre = vendedorInfo.nombre;
      newPlan[idx].porcentajeComision = vendedorInfo.porcentajeComision;
      newPlan[idx].comisionMonto = vendedorInfo.comisionMonto;

      // Enviar Notificación de Comisión al Vendedor Asignado (si no es Administrador)
      if (vendedorInfo.id !== "ADMINISTRADOR" && vendedorInfo.email) {
        await addDoc(collection(db, "notificaciones"), {
          afiliadoEmail: vendedorInfo.email,
          vendedorId: vendedorInfo.id,
          vendedorNombre: vendedorInfo.nombre,
          mensaje: `Se acreditó el pago de cuota ${cuota.numero} de ${sol.datosPersonales?.nombreCompleto || 'cliente'} por $${amountPaid}. Comisión asignada: $${vendedorInfo.comisionMonto} (${vendedorInfo.porcentajeComision}%).`,
          fecha: new Date().toISOString(),
          leida: false,
          comisionAsociada: vendedorInfo.comisionMonto,
          estadoPago: "PENDIENTE",
          cuotaAsociada: cuota.numero || idx + 1,
          clienteNombre: sol.datosPersonales?.nombreCompleto || 'Desconocido'
        });
      }

      await fetchData();
      setPagoAConfirmar(null);
      alert(`${feedbackMsg}\n\n¡El comprobante de pago PDF ha sido generado y descargado!`);
    } catch (e: any) {
      console.error(e);
      alert("Error al procesar el pago: " + e.message);
    }
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
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] p-8">
      <div className="max-w-7xl mx-auto">
        <AdminNav title="Cartera Activa y Cobranzas" subtitle="Seguimiento maestro de créditos en calle, cobranzas, emisión de recibos PDF y gestión de morosidad" />

        {promesasExigibles.length > 0 && !loading && (
           <div className="bg-red-900/30 border border-red-500/80 p-5 rounded-xl mb-8 flex flex-col gap-2 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <h3 className="text-red-400 font-black text-lg flex items-center gap-2">⚠️ ATENCIÓN: Promesas de Pago Pendientes para Hoy</h3>
              <p className="text-sm text-[#68706E] mb-2">Los siguientes clientes tienen promesas pactadas para hoy o días anteriores pero el sistema detecta que continúan con morosidad activa.</p>
              <div className="flex flex-wrap gap-3">
                 {promesasExigibles.map(sol => {
                    const lProm = sol.historialContactos.find((c:any) => c.promesaPago);
                    return (
                       <div key={sol.id} onClick={() => setExpandedId(sol.id)} className="cursor-pointer bg-red-500/5 hover:bg-red-500/20 text-white px-4 py-2 rounded-lg border border-red-500/10 transition shadow-sm">
                          <p className="text-sm font-bold">{sol.datosPersonales?.nombreCompleto}</p>
                          <p className="text-[10px] text-red-400">Pactó: {new Date(lProm.promesaPago + "T12:00:00").toLocaleDateString()} ⭐</p>
                          <p className="text-[10px] text-[#68706E]">📲 {sol.datosPersonales?.telefono}</p>
                       </div>
                    )
                 })}
              </div>
           </div>
        )}

        {loading ? (
          <p className="text-center text-[#68706E] font-bold mt-20">Cargando base de cartera...</p>
        ) : solicitudes.length === 0 ? (
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-xl text-center shadow-xs max-w-xl mx-auto mt-12">
            <h2 className="text-xl font-bold text-[#173E3B] font-heading font-bold mb-2">Cartera Vacía</h2>
            <p className="text-[#68706E]">No hay ventas entregadas actualmente activas en seguimiento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {solicitudes.map(sol => {
              const est = calcularEstadoCuotas(sol.planPagos);
              return (
                <div key={sol.id} className="bg-[#FFFDFC] border border-[#DED8CF] rounded-xl p-6 shadow-xs relative flex flex-col">
                  {est.atrasadas > 0 && <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md uppercase animate-pulse">MOROSO ({est.atrasadas})</div>}
                  {est.restantes === 0 && est.pagadas > 0 && <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md uppercase">FINALIZADO</div>}
                  
                  <div className="mb-4 border-b border-[#DED8CF] pb-4 mt-6">
                     {/* BOTON DE BORRAR */}
                     <button onClick={() => setModalBorrar(sol.id)} className="absolute top-2 left-2 z-10 text-red-500 hover:text-[#173E3B] bg-red-500/5 hover:bg-red-600 rounded p-1.5 transition-colors border border-red-500/10" title="Eliminar Cliente de la Base de Datos">
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                     </button>
                     
                     <h3 className="text-xl font-black text-[#173E3B] font-heading font-bold mb-1">{sol.datosPersonales?.nombreCompleto || "Desconocido"}</h3>
                     <p className="text-[#68706E] text-sm flex gap-2"><span className="text-[#B44E2A] font-bold">📲 {sol.datosPersonales?.telefono}</span> <span className="text-[#68706E]">|</span> <span className="text-[#68706E]">{sol.datosPersonales?.numeroDni}</span></p>
                     <p className="text-[#68706E] text-xs mt-1">Afiliado asignado: {sol.afiliadoEmail}</p>
                     <p className="text-blue-400 font-bold text-sm mt-3">Equipo: {sol.productoDeseado}</p>

                     {/* ESTADO CONTRATO FIRMADO DIGITALMENTE O WHATSAPP LINK */}
                     <div className="mt-4">
                       {sol.contratoFirmado ? (
                         <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                           <div>
                             <span className="text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                               🟢 Contrato Firmado Digitalmente
                             </span>
                             <p className="text-[11px] text-[#68706E] mt-0.5">
                               Fecha: {sol.fechaFirmaDigital ? new Date(sol.fechaFirmaDigital).toLocaleString('es-AR') : 'Autorizado'} | IP: {sol.ipFirmaDigital || 'Web'}
                             </p>
                           </div>
                           <Link
                             href={`/firmar-contrato/${sol.id}`}
                             target="_blank"
                             className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-md transition shadow-xs whitespace-nowrap"
                           >
                             📄 Ver Contrato
                           </Link>
                         </div>
                       ) : (
                         <div className="bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                           <div>
                             <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider">
                               ✍️ Autorización de Contrato
                             </span>
                             <p className="text-[11px] text-[#68706E] mt-0.5">
                               Podés enviar el link directo de firma por WhatsApp al cliente.
                             </p>
                           </div>
                           <div className="flex gap-2">
                             <a
                               href={`https://wa.me/${sanitizePhoneWhatsApp(sol.datosPersonales?.telefono || sol.whatsapp || sol.telefono || '')}?text=${encodeURIComponent(`Hola ${sol.datosPersonales?.nombreCompleto || 'Cliente'}, podés revisar y autorizar digitalmente tu Contrato de Mandato Comercial desde el siguiente enlace seguro:

https://cuenta-hogar--negocio-facil-page.us-central1.hosted.app/firmar-contrato/${sol.id}`)}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-md transition shadow-xs whitespace-nowrap flex items-center gap-1"
                             >
                               💬 WhatsApp Link
                             </a>
                             <Link
                               href={`/firmar-contrato/${sol.id}`}
                               target="_blank"
                               className="bg-[#FFFDFC] border border-[#DED8CF] hover:bg-[#F7F3EC] text-[#173E3B] text-[11px] font-bold px-3 py-1.5 rounded-md transition shadow-xs whitespace-nowrap"
                             >
                               👀 Ver Firma
                             </Link>
                           </div>
                         </div>
                       )}
                     </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mb-6">
                     <div className="bg-[#FFFDFC] border border-[#DED8CF] p-2 rounded">
                       <p className="text-2xl font-black text-[#2F7D5C]">{est.pagadas}</p>
                       <p className="text-[10px] text-[#68706E] uppercase">Pagadas</p>
                     </div>
                     <div className="bg-[#FFFDFC] border border-[#DED8CF] p-2 rounded">
                       <p className="text-2xl font-black text-[#B44E2A]">{est.restantes}</p>
                       <p className="text-[10px] text-[#68706E] uppercase">Restantes</p>
                     </div>
                     <div className={`p-2 rounded border ${est.atrasadas > 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-[#FFFDFC] border-[#DED8CF]'}`}>
                       <p className={`text-2xl font-black ${est.atrasadas > 0 ? 'text-red-500' : 'text-[#68706E]'}`}>{est.atrasadas}</p>
                       <p className="text-[10px] text-[#68706E] uppercase">Vencidas</p>
                     </div>
                  </div>

                  {est.atrasadas > 0 && (
                     <div className="bg-red-900/20 border border-red-500/20 p-3 rounded mb-6">
                        <p className="text-red-400 text-xs text-center font-bold">Deuda Exigible Inmediata: <span className="text-lg">${est.montcAtrasado}</span></p>
                     </div>
                  )}

                  <button onClick={() => setExpandedId(expandedId === sol.id ? null : sol.id)} className="mt-auto w-full bg-[#F7F3EC] hover:bg-[#FFFDFC] text-[#173E3B] font-bold py-3 rounded text-sm transition border border-[#DED8CF] shadow-md">
                    {expandedId === sol.id ? "Cerrar Panel de Venta" : "Ver Plan de Cuotas y Bitácora 💳"}
                  </button>

                  {expandedId === sol.id && (
                     <div className="mt-6 pt-6 border-t border-[#DED8CF] animate-fade-in space-y-8">
                        
                        {/* SECCION NUEVA: PLANILLA DE CUOTAS CLARA ABSOLUTA */}
                        <div className="bg-[#FFFDFC] rounded-lg border border-[#DED8CF] p-4 shadow-inner overflow-hidden">
                           <h4 className="text-[#B44E2A] font-bold text-sm mb-4 border-b border-[#DED8CF] pb-2"> Plan de Cuotas del Producto </h4>
                           {!sol.planPagos || sol.planPagos.length === 0 ? (
                               <div className="flex flex-col items-center gap-3 py-4 bg-red-900/10 border border-red-500/10 rounded-lg">
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
                                         <div key={idx} className={`p-3 rounded-xl border flex flex-col justify-between gap-3 text-sm ${cuota.estado === 'PAGADO' ? 'bg-green-950/10 border-green-500/20' : cuota.estado === 'EN_REVISION' ? 'bg-blue-950/20 border-blue-500/50' : isAtrasada ? 'bg-red-950/20 border-red-500/20' : 'bg-[#FFFDFC] border-[#DED8CF]'}`}>
                                             <div className="flex items-center justify-between">
                                                <div>
                                                   <p className="font-bold text-[#1F2928]">Cuota {cuota.numero} <span className="text-[#B44E2A] ml-2 font-mono">${cuota.montoOriginal}</span></p>
                                                   <p className="text-xs text-[#68706E]">Vence: {new Date(cuota.vencimiento).toLocaleDateString("es-AR")}</p>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${cuota.estado === 'PAGADO' ? 'bg-green-500/20 text-[#2F7D5C]' : cuota.estado === 'EN_REVISION' ? 'bg-blue-500 text-white animate-pulse' : isAtrasada ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-[#B44E2A]'}`}>
                                                   {isAtrasada && cuota.estado !== 'PAGADO' && cuota.estado !== 'EN_REVISION' ? 'VENCIDA' : cuota.estado}
                                                </span>
                                             </div>

                                             {cuota.estado === "PAGADO" && (
                                                <div className="flex flex-col gap-1.5 mt-1 bg-[#FFFDFC] p-2.5 rounded-lg border border-[#DED8CF]">
                                                   <div className="flex justify-between items-center text-[10px]">
                                                      <span className="text-[#68706E] font-bold uppercase">Abonado:</span>
                                                      <span className="text-[#2F7D5C] font-black">${cuota.montoAbonado || cuota.montoOriginal}</span>
                                                   </div>
                                                   {cuota.fechaPago && (
                                                      <div className="flex justify-between items-center text-[10px]">
                                                         <span className="text-[#68706E]">Fecha de Pago:</span>
                                                         <span className="text-[#1F2928]">{new Date(cuota.fechaPago).toLocaleDateString("es-AR")}</span>
                                                      </div>
                                                   )}
                                                   {(cuota.cuentaDestino || cuota.metodoPagoManual || cuota.metodoPago) && (
                                                      <div className="flex justify-between items-center text-[10px]">
                                                         <span className="text-[#68706E]">Medio / Cuenta:</span>
                                                         <span className="text-[#1F2928]">{cuota.cuentaDestino || cuota.metodoPagoManual || cuota.metodoPago}</span>
                                                      </div>
                                                   )}
                                                   {cuota.nroComprobante && (
                                                      <div className="flex justify-between items-center text-[10px]">
                                                         <span className="text-[#68706E]">Transacción:</span>
                                                         <span className="text-[#1F2928] font-mono">{cuota.nroComprobante}</span>
                                                      </div>
                                                   )}
                                                   <div className="flex gap-2 mt-2 pt-2 border-t border-[#DED8CF]">
                                                      {cuota.comprobanteUrl && (
                                                         <a 
                                                           href={cuota.comprobanteUrl} 
                                                           target="_blank" 
                                                           rel="noreferrer" 
                                                           className="flex-1 bg-blue-950/20 text-blue-400 border border-blue-500/20 text-center py-1 rounded text-[9px] font-bold hover:bg-blue-600 hover:text-[#173E3B] transition"
                                                         >
                                                           📄 Ver Adjunto
                                                         </a>
                                                      )}
                                                      <button
                                                         onClick={() => {
                                                            const isPartial = cuota.montoAbonado !== undefined && cuota.montoAbonado !== cuota.montoOriginal;
                                                            const receiptId = `REC-${sol.id.substring(0, 5).toUpperCase()}-${cuota.numero}`;
                                                            const numCuotasTotal = sol.planPagos?.length || 12;
                                                            const cProdVal = Number(sol.precioContado || sol.costoProducto || sol.costoBien) || 0;
                                                            const totalFinVal = Number(sol.totalFinanciado) || ((cuota.montoAbonado || cuota.montoOriginal) * numCuotasTotal);
                                                            const baseGravVal = Math.max(0, totalFinVal - cProdVal);
                                                            
                                                            generarComprobantePago({
                                                               nroContrato: sol.nroContrato || `CH-${sol.id.substring(0, 8).toUpperCase()}`,
                                                               nroRecibo: receiptId,
                                                               fecha: cuota.fechaPago ? new Date(cuota.fechaPago).toLocaleDateString("es-AR") : new Date().toLocaleDateString("es-AR"),
                                                               clienteNombre: sol.datosPersonales?.nombreCompleto || sol.nombreCompleto || "Cliente",
                                                               clienteDni: sol.datosPersonales?.numeroDni || sol.numeroDni || "-",
                                                               cuotaNumero: cuota.numero,
                                                               cuotasTotal: numCuotasTotal,
                                                               montoAbonado: cuota.montoAbonado || cuota.montoOriginal,
                                                               montoExento: numCuotasTotal > 0 ? Math.round(cProdVal / numCuotasTotal) : 0,
                                                               montoGravado: numCuotasTotal > 0 ? Math.round(baseGravVal / numCuotasTotal) : 0,
                                                               metodoPago: cuota.metodoPagoManual || cuota.metodoPago || "Acreditado",
                                                               nroComprobante: cuota.nroComprobante,
                                                               cuentaDestino: cuota.cuentaDestino,
                                                               esPagoParcial: isPartial
                                                            });
                                                         }}
                                                         className="flex-1 bg-green-950/20 text-[#2F7D5C] border border-green-500/20 py-1 rounded text-[9px] font-bold hover:bg-green-600 hover:text-[#173E3B] transition uppercase tracking-wider flex items-center justify-center gap-1"
                                                      >
                                                         📥 Recibo PDF
                                                      </button>
                                                   </div>
                                                </div>
                                             )}

                                             {cuota.estado === "EN_REVISION" && (
                                                <div className="bg-[#F7F3EC] p-3 rounded-xl border border-[#DED8CF] flex flex-col gap-3 mt-1">
                                                   {cuota.comprobanteUrl && (
                                                      <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="bg-blue-600/20 text-blue-400 border border-blue-500/50 text-xs font-bold py-2 rounded text-center hover:bg-blue-600 hover:text-[#173E3B] transition-colors">📄 Abrir Comprobante Adjunto</a>
                                                   )}
                                                   <div className="flex gap-2">
                                                      <button onClick={async () => {
                                                          const m = prompt("Motivo de rechazo (Ej: borroso, falso):");
                                                          if (m === null) return;
                                                          const newPlan = [...(sol.planPagos || [])];
                                                          newPlan[idx].estado = "PENDIENTE";
                                                          newPlan[idx].comprobanteUrl = null;
                                                          await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan });
                                                          await fetchData();
                                                          alert("Pago Rechazado.");
                                                      }} className="flex-1 bg-red-900/40 text-red-400 border border-red-500/10 hover:bg-red-600 hover:text-[#173E3B] py-2 rounded text-xs font-bold transition">Rechazar</button>
                                                      <button onClick={() => {
                                                          setPagoAConfirmar({ solId: sol.id, idx, metodo: 'Transferencia', originalAmount: cuota.montoOriginal, isClientApprove: true });
                                                          setPagoMonto(String(cuota.montoOriginal));
                                                          setPagoComprobante(cuota.nroComprobante || "");
                                                          setPagoCuentaDestino(cuota.cuentaDestino || "Mercado Pago (Fintech)");
                                                      }} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded text-xs font-black transition shadow-xs">✓ Aprobar</button>
                                                   </div>
                                                </div>
                                             )}

                                             {cuota.estado !== "PAGADO" && cuota.estado !== "EN_REVISION" && (
                                                <div className="bg-[#FFFDFC]/60 p-3 rounded-lg border border-[#DED8CF]/60 flex flex-col gap-2 mt-1">
                                                   <p className="text-[10px] text-[#68706E] font-medium">Registrar cobro manual realizado en efectivo o transferencia:</p>
                                                   <div className="flex flex-wrap gap-2">
                                                      <button
                                                        onClick={() => {
                                                          setPagoAConfirmar({ solId: sol.id, idx, metodo: 'Efectivo', originalAmount: cuota.montoOriginal, isClientApprove: false });
                                                          setPagoMonto(String(cuota.montoOriginal));
                                                          setPagoComprobante("");
                                                          setPagoCuentaDestino("Caja Efectivo");
                                                        }}
                                                        className="flex-1 bg-green-950/30 hover:bg-green-600 border border-green-500/20 text-[#2F7D5C] hover:text-[#173E3B] py-1.5 rounded text-[10px] font-black transition uppercase tracking-wider min-w-[70px]"
                                                      >
                                                        💵 Efectivo
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setPagoAConfirmar({ solId: sol.id, idx, metodo: 'Transferencia', originalAmount: cuota.montoOriginal, isClientApprove: false });
                                                          setPagoMonto(String(cuota.montoOriginal));
                                                          setPagoComprobante("");
                                                          setPagoCuentaDestino("Mercado Pago (Fintech)");
                                                        }}
                                                        className="flex-1 bg-blue-950/30 hover:bg-blue-600 border border-blue-500/20 text-blue-400 hover:text-[#173E3B] py-1.5 rounded text-[10px] font-black transition uppercase tracking-wider min-w-[70px]"
                                                      >
                                                        📱 Transf.
                                                      </button>
                                                      <a
                                                         href={`https://wa.me/${sanitizePhoneWhatsApp(sol.datosPersonales?.telefono || sol.whatsapp || sol.telefono || '')}?text=${encodeURIComponent(generarMensajeRecordatorioCuota(sol, cuota))}`}
                                                         target="_blank"
                                                         rel="noopener noreferrer"
                                                         className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded text-[10px] font-bold shadow-md flex items-center justify-center gap-1 min-w-[120px]"
                                                         title="Enviar recordatorio predeterminado de esta cuota por WhatsApp"
                                                      >
                                                         💬 Recordatorio WA
                                                      </a>
                                                   </div>
                                                </div>
                                             )}
                                         </div>
                                       )
                                   })}
                               </div>
                           )}
                        </div>

                        {/* SECCION: BITACORA */}
                        <div>
                            <h4 className="text-[#173E3B] font-bold text-sm mb-3 border-b border-[#DED8CF] pb-1 flex justify-between">Historial de Contactos <span className="text-[10px] text-[#68706E] font-normal mt-1">(Bitácora)</span></h4>
                            {(!sol.historialContactos || sol.historialContactos.length === 0) ? (
                               <p className="text-xs text-[#68706E] italic text-center py-4">No hay contactos registrados aún.</p>
                            ) : (
                               <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar mb-4">
                                  {sol.historialContactos.map((log: any) => (
                                     <div key={log.id} className="bg-[#F7F3EC]/50 p-3 rounded border border-[#DED8CF]">
                                        <div className="flex justify-between items-start mb-1">
                                           <span className="text-[10px] text-[#68706E] font-bold">{new Date(log.fecha).toLocaleString()}</span>
                                           <span className="text-[9px] bg-[#FFFDFC] px-2 py-0.5 rounded text-[#68706E]">{log.usuario}</span>
                                        </div>
                                        <p className="text-sm text-[#1F2928]">{log.nota}</p>
                                        {log.promesaPago && (
                                           <div className="mt-2 bg-yellow-500/5 border border-[#DED8CF] p-1.5 rounded flex items-center gap-2">
                                              <span className="text-[#B44E2A] text-[10px] font-bold">📅 PROMESA D/PAGO:</span>
                                              <span className="text-[#B44E2A] text-[11px] font-bold">{new Date(log.promesaPago + "T12:00:00").toLocaleDateString()}</span>
                                           </div>
                                        )}
                                     </div>
                                  ))}
                               </div>
                            )}

                            <div className="bg-[#FFFDFC] p-4 rounded-lg border border-[#DED8CF]">
                               <h5 className="text-[10px] text-[#B44E2A] font-bold uppercase tracking-widest mb-2">Registrar una nueva gestión telefónica/whatsapp</h5>
                               <textarea value={nuevaNota} onChange={e=>setNuevaNota(e.target.value)} placeholder="Ej: Llamé y dijo que cancela en RapiPago mañana a las 18hs..." className="w-full bg-[#FFFDFC] text-[#1F2928] p-3 rounded border border-[#DED8CF] text-xs outline-none focus:border-yellow-500 h-20 min-h-[4rem] mb-3 transition-colors" />
                               <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                                  <label className="text-[11px] font-bold text-[#68706E] whitespace-nowrap">Agendar Promesa P.:</label>
                                  <input type="date" value={fechaPromesa} onChange={e=>setFechaPromesa(e.target.value)} className="w-full sm:w-auto bg-[#FFFDFC] text-[#1F2928] p-2 rounded border border-[#DED8CF] text-xs outline-none focus:border-yellow-500" />
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

      {/* MODAL DE CONFIRMACIÓN DE COBRO Y EMISIÓN DE COMPROBANTE */}
      {pagoAConfirmar && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F2928]/60 backdrop-blur-sm p-4">
            <div className="bg-[#FFFDFC] border-2 border-green-500/20 rounded-3xl w-full max-w-md p-6 shadow-xs space-y-5">
               <div className="border-b border-[#DED8CF] pb-3 flex justify-between items-center">
                  <div>
                     <h3 className="text-sm font-black text-[#2F7D5C] uppercase tracking-widest">💰 Acreditación de Pago</h3>
                     <p className="text-[10px] text-[#68706E]">Registre los datos de la transacción para emitir comprobante PDF</p>
                  </div>
                  <button onClick={() => setPagoAConfirmar(null)} className="text-[#68706E] hover:text-[#173E3B] text-xs font-bold">✕</button>
               </div>
               
               <div className="space-y-4 text-xs">
                  <div>
                     <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Monto Real Cobrado ($)</label>
                     <input 
                        type="number" 
                        value={pagoMonto} 
                        onChange={e => setPagoMonto(e.target.value)} 
                        className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-lg text-[#173E3B] font-bold text-sm outline-none focus:border-green-500" 
                        placeholder="Monto"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Nº Comprobante / Transacción (Opcional)</label>
                     <input 
                        type="text" 
                        value={pagoComprobante} 
                        onChange={e => setPagoComprobante(e.target.value)} 
                        className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-lg text-[#1F2928] font-mono outline-none focus:border-green-500" 
                        placeholder="Ej: TXN-99887766"
                     />
                  </div>
                  <div>
                     <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">Cuenta de Destino / Depósito</label>
                     <select 
                        value={pagoCuentaDestino} 
                        onChange={e => setPagoCuentaDestino(e.target.value)} 
                        className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-lg text-[#1F2928] outline-none focus:border-green-500 font-medium"
                     >
                        <option value="Caja Efectivo">💵 Caja Efectivo</option>
                        <option value="Mercado Pago (Fintech)">📱 Mercado Pago (Fintech)</option>
                        <option value="Banco Galicia">🏢 Banco Galicia</option>
                        <option value="Banco Provincia">🏢 Banco Provincia</option>
                        <option value="Ualá">📱 Ualá</option>
                        <option value="Otra Cuenta / Cheque">📄 Otra Cuenta / Cheque</option>
                     </select>
                  </div>
               </div>

               <div className="flex gap-3 pt-2">
                  <button 
                     onClick={() => setPagoAConfirmar(null)} 
                     className="flex-1 bg-[#F7F3EC] hover:bg-[#FFFDFC] text-[#1F2928] font-bold py-2 rounded-lg text-xs transition uppercase tracking-wider"
                  >
                     Cancelar
                  </button>
                  <button 
                     onClick={handleProcesarPagoFinal} 
                     className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-xs transition shadow-xs shadow-green-900/30 uppercase tracking-wider"
                  >
                     💾 Confirmar y Generar PDF
                  </button>
               </div>
            </div>
         </div>
      )}

      

               <div className="w-full flex gap-3">
      {/* MODAL DE ELIMINACION DEFINITIVA */}
      {modalBorrar && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1F2928]/60 backdrop-blur-sm backdrop-blur-sm p-4">
            <div className="bg-[#FFFDFC] border border-red-500/50 rounded-2xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.3)] flex flex-col items-center animate-fade-in text-center">
               <div className="bg-red-500/5 w-20 h-20 rounded-full flex items-center justify-center mb-6 border border-red-500/10">
                  <span className="text-red-500 text-4xl font-black">!</span>
               </div>
               <h3 className="text-2xl font-heading font-extrabold text-[#173E3B] mb-3">Eliminar Cartera</h3>
               <p className="text-[#68706E] text-sm mb-6 leading-relaxed">Estás a punto de <strong className="text-red-400">borrar a este cliente y toda su historia de la faz de la tierra</strong>. Esto es I-R-R-E-V-E-R-S-I-B-L-E. ¿Estás absolutamente seguro?</p>
               <div className="w-full flex gap-3">
                  <button onClick={() => setModalBorrar(null)} className="flex-1 bg-[#F7F3EC] text-[#1F2928] py-3.5 rounded-xl font-bold hover:bg-[#FFFDFC] transition">Cancelar</button>
                  <button onClick={async () => {
                     try {
                        await deleteDoc(doc(db, "solicitudes", modalBorrar));
                        alert("Cliente y cartera evaporados correctamente.");
                        setModalBorrar(null);
                        fetchData();
                     } catch(e) { alert("Error al borrar."); }
                  }} className="flex-1 bg-red-600 text-white py-3.5 rounded-xl font-bold hover:bg-red-500 transition shadow-xs">Purgar Base</button>
               </div>
            </div>
         </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #52525b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #eab308; }
      `}} />
    </div>
    </div>
    </AdminProtectedRoute>
  );
}