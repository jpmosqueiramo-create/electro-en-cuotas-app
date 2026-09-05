"use client";

import { LOGO_BASE64 } from "@/lib/logoBase64";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, addDoc, doc, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, CheckCircle2, AlertCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminComisionesPage() {
  const [comisiones, setComisiones] = useState<any[]>([]);
  const [historialPagos, setHistorialPagos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  // Modal de Pago Total / Parcial
  const [modalPagoOpen, setModalPagoOpen] = useState(false);
  const [pagoAfiliadoEmail, setPagoAfiliadoEmail] = useState("");
  const [pagoTipo, setPagoTipo] = useState<"TOTAL" | "PARCIAL">("TOTAL");
  const [pagoMontoInput, setPagoMontoInput] = useState("");
  const [pagoMetodo, setPagoMetodo] = useState("Transferencia Bancaria");
  const [pagoCuentaOrigen, setPagoCuentaOrigen] = useState("Banco Galicia");
  const [pagoComprobanteNum, setPagoComprobanteNum] = useState("");
  const [pagoObservaciones, setPagoObservaciones] = useState("");
  const [procesandoPago, setProcesandoPago] = useState(false);

  const fetchData = async () => {
    try {
      setCargando(true);
      const qCom = query(collection(db, "notificaciones"), where("comisionAsociada", ">", 0));
      const snapCom = await getDocs(qCom);
      const itemsCom: any[] = [];
      snapCom.forEach(d => {
        itemsCom.push({ id: d.id, ...d.data() });
      });
      itemsCom.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setComisiones(itemsCom);

      try {
        const snapPagos = await getDocs(collection(db, "pagos_comisiones"));
        const itemsPagos: any[] = [];
        snapPagos.forEach(d => {
          itemsPagos.push({ id: d.id, ...d.data() });
        });
        itemsPagos.sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
        setHistorialPagos(itemsPagos);
      } catch (e) {
        console.log("No hay historial de pagos previo aún.");
      }
    } catch (error) {
      console.error(error);
      alert("Error al cargar base de comisiones.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAbrirModalPago = (email: string, totalPendiente: number, tipo: "TOTAL" | "PARCIAL") => {
    setPagoAfiliadoEmail(email);
    setPagoTipo(tipo);
    setPagoMontoInput(tipo === "TOTAL" ? String(totalPendiente) : "");
    setPagoMetodo("Transferencia Bancaria");
    setPagoCuentaOrigen("Banco Galicia");
    setPagoComprobanteNum("");
    setPagoObservaciones("");
    setModalPagoOpen(true);
  };

  const generarComprobantePDF = (
    email: string,
    pagoData: any,
    itemsAfectados: any[]
  ) => {
    const docPdf = new jsPDF();
    docPdf.setFillColor(15, 23, 42);
    docPdf.rect(15, 12, 180, 28, "F");

    try {
      docPdf.addImage(LOGO_BASE64, "PNG", 17, 14, 24, 24);
    } catch(e){}

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(14);
    docPdf.setTextColor(234, 179, 8);
    docPdf.text("CUENTA HOGAR", 45, 22);

    docPdf.setFontSize(9);
    docPdf.setTextColor(255, 255, 255);
    docPdf.text(
      pagoData.tipoPago === "TOTAL" ? "LIQUIDACIÓN TOTAL DE COMISIONES" : "COMPROBANTE DE PAGO PARCIAL DE COMISIONES",
      190, 22, { align: "right" }
    );

    docPdf.setFontSize(8);
    docPdf.setTextColor(156, 163, 175);
    docPdf.text("Lo que te haga falta, te lo llevamos y financiamos.", 45, 28);

    docPdf.setFontSize(9);
    docPdf.setTextColor(50, 50, 50);
    docPdf.setFont("helvetica", "normal");
    docPdf.text("Beneficiario (Vendedor/Afiliado): " + email, 20, 46);
    docPdf.text("Fecha y Hora de Operación: " + new Date(pagoData.fechaPago).toLocaleString("es-AR"), 20, 52);
    docPdf.text("Método de Pago: " + pagoData.metodoPago + " (" + (pagoData.cuentaOrigen || "Caja General") + ")", 20, 58);
    docPdf.text("N° de Comprobante / Transacción: " + (pagoData.numeroComprobante || "N/A"), 20, 64);

    docPdf.setFillColor(245, 247, 250);
    docPdf.rect(120, 44, 75, 26, "F");
    docPdf.setFont("helvetica", "bold");
    docPdf.setTextColor(22, 163, 74);
    docPdf.text("MONTO ABONADO: $" + (pagoData.montoPagado || 0).toLocaleString("es-AR"), 124, 52);
    docPdf.setTextColor(100, 116, 139);
    docPdf.setFontSize(8);
    docPdf.text("Saldo Anterior: $" + (pagoData.saldoAnterior || 0).toLocaleString("es-AR"), 124, 60);
    docPdf.text("Saldo Restante Pendiente: $" + (pagoData.saldoRestante || 0).toLocaleString("es-AR"), 124, 66);

    if (pagoData.observaciones) {
      docPdf.setFontSize(8);
      docPdf.setFont("helvetica", "italic");
      docPdf.setTextColor(80, 80, 80);
      docPdf.text("Observaciones de la Operación: " + pagoData.observaciones, 20, 74);
    }

    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(10);
    docPdf.setTextColor(30, 41, 59);
    const startYTable = pagoData.observaciones ? 80 : 75;
    docPdf.text("Detalle de Operación / Registro de Pago:", 20, startYTable);

    const bodyData = itemsAfectados.length > 0 
      ? itemsAfectados.map(item => [
          new Date(item.fecha).toLocaleDateString("es-AR"),
          item.clienteNombre || "Cliente General",
          item.cuotaAsociada ? "Cuota " + item.cuotaAsociada : "Venta Directa",
          "$" + (item.comisionAsociada || 0).toLocaleString("es-AR"),
          "$" + (item.montoAbonadoEnOperacion || item.comisionAsociada || 0).toLocaleString("es-AR")
        ])
      : [[
          new Date(pagoData.fechaPago).toLocaleDateString("es-AR"),
          "Transacción General",
          pagoData.tipoPago === "TOTAL" ? "Liquidación Total" : "Pago Parcial",
          "$" + (pagoData.montoPagado || 0).toLocaleString("es-AR"),
          "$" + (pagoData.montoPagado || 0).toLocaleString("es-AR")
        ]];

    autoTable(docPdf, {
      startY: startYTable + 3,
      head: [["Fecha", "Cliente", "Concepto", "Comisión Total", "Monto Imputado"]],
      body: bodyData,
      theme: "grid",
      headStyles: { fillColor: [234, 179, 8], textColor: [0, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 8 }
    });

    const finalY = (docPdf as any).lastAutoTable.finalY || 120;
    docPdf.setFont("helvetica", "italic");
    docPdf.setFontSize(8);
    docPdf.setTextColor(100, 100, 100);
    docPdf.text("Este comprobante constituye certificado de pago oficial registrado en Cuenta Hogar.", 105, finalY + 15, { align: "center" });
    docPdf.text("Firma Autorizada: Loop Gestión Integral S.R.L. — Gerente Juan Pablo Mosqueira (Nombre de Fantasía: Cuenta Hogar)", 105, finalY + 25, { align: "center" });

    docPdf.save("Recibo_Comisiones_" + email.split("@")[0] + "_" + Date.now() + ".pdf");
  };

  const handleEjecutarPagoComisiones = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = Number(pagoMontoInput);
    if (!monto || monto <= 0) return alert("Ingresa un monto válido a pagar.");

    const itemsAfiliado = comisiones.filter(c => c.afiliadoEmail === pagoAfiliadoEmail);
    const pendientes = itemsAfiliado.filter(c => c.estadoPago !== "PAGADA");
    const totalPendiente = pendientes.reduce((acc, curr) => {
      const cobradoPrev = curr.montoPagadoAcumulado || 0;
      return acc + ((curr.comisionAsociada || 0) - cobradoPrev);
    }, 0);

    if (monto > totalPendiente + 0.01) {
      return alert("El monto a pagar ($" + monto + ") no puede superar el saldo pendiente ($" + totalPendiente + ").");
    }

    setProcesandoPago(true);

    try {
      const pendientesOrdenados = [...pendientes].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      let montoRestante = monto;
      const itemsAfectados: any[] = [];
      const fechaOperacion = new Date().toISOString();

      for (const item of pendientesOrdenados) {
        if (montoRestante <= 0) break;

        const comisionTotal = item.comisionAsociada || 0;
        const cobradoPrevio = item.montoPagadoAcumulado || 0;
        const saldoItem = comisionTotal - cobradoPrevio;

        if (montoRestante >= saldoItem) {
          const nuevoAcum = comisionTotal;
          montoRestante -= saldoItem;
          itemsAfectados.push({ ...item, montoAbonadoEnOperacion: saldoItem });
          await updateDoc(doc(db, "notificaciones", item.id), {
            estadoPago: "PAGADA",
            montoPagadoAcumulado: nuevoAcum,
            fechaPagoAfil: fechaOperacion,
            metodoPago: pagoMetodo,
            comprobantePago: pagoComprobanteNum
          });
        } else {
          const nuevoAcum = cobradoPrevio + montoRestante;
          const imputado = montoRestante;
          montoRestante = 0;
          itemsAfectados.push({ ...item, montoAbonadoEnOperacion: imputado });
          await updateDoc(doc(db, "notificaciones", item.id), {
            estadoPago: "PARCIAL",
            montoPagadoAcumulado: nuevoAcum,
            fechaPagoAfil: fechaOperacion,
            metodoPago: pagoMetodo,
            comprobantePago: pagoComprobanteNum
          });
        }
      }

      const saldoRestanteFinal = Math.max(0, totalPendiente - monto);
      const payloadPago = {
        afiliadoEmail: pagoAfiliadoEmail,
        montoPagado: monto,
        saldoAnterior: totalPendiente,
        saldoRestante: saldoRestanteFinal,
        tipoPago: pagoTipo,
        metodoPago: pagoMetodo,
        cuentaOrigen: pagoCuentaOrigen,
        numeroComprobante: pagoComprobanteNum.trim(),
        observaciones: pagoObservaciones.trim(),
        fechaPago: fechaOperacion,
        itemsCount: itemsAfectados.length
      };

      await addDoc(collection(db, "pagos_comisiones"), payloadPago);
      generarComprobantePDF(pagoAfiliadoEmail, payloadPago, itemsAfectados);
      alert("¡Pago de comisiones de $" + monto.toLocaleString("es-AR") + " registrado exitosamente!");
      setModalPagoOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error("Error al registrar pago:", err);
      alert("Error al registrar operación de pago: " + err.message);
    } finally {
      setProcesandoPago(false);
    }
  };

  const afiliadosMap: Record<string, any[]> = {};
  comisiones.forEach(c => {
    if (!afiliadosMap[c.afiliadoEmail]) afiliadosMap[c.afiliadoEmail] = [];
    afiliadosMap[c.afiliadoEmail].push(c);
  });
  const afiliadosEmails = Object.keys(afiliadosMap);

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-[#DED8CF] pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-[#fe5000]/10 p-3.5 rounded-2xl border border-[#fe5000]/30 shadow-xs">
                 <DollarSign className="w-8 h-8 text-[#B44E2A]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#173E3B] flex items-center gap-2">
                  Gestión y Liquidación de Comisiones
                </h1>
                <p className="text-[#68706E] text-xs mt-0.5">
                  Administra pagos totales o parciales a tu fuerza de venta con auditoría y comprobantes PDF
                </p>
              </div>
            </div>
            <Link href="/admin" className="text-xs bg-[#FFFDFC] border border-[#DED8CF] hover:border-yellow-500 text-[#B44E2A] hover:text-yellow-300 px-4 py-2.5 rounded-xl transition-all font-bold shadow-md">
              ← Volver al Panel Admin
            </Link>
          </header>

          {cargando ? (
             <div className="text-center py-20 text-[#68706E] font-bold animate-pulse">
               Cargando base financiera de comisiones...
             </div>
          ) : afiliadosEmails.length === 0 ? (
             <div className="bg-[#FFFDFC] border border-[#DED8CF] p-12 rounded-2xl text-center shadow-sm">
                <p className="text-[#68706E] text-sm">No se ha generado ninguna comisión aún en el sistema.</p>
             </div>
          ) : (
             <div className="space-y-5">
                {afiliadosEmails.map(email => {
                   const items = afiliadosMap[email];
                   const pendientes = items.filter(i => i.estadoPago !== "PAGADA");
                   const pagadasCompletas = items.filter(i => i.estadoPago === "PAGADA");
                   const pagosPreviosAfiliado = historialPagos.filter(p => p.afiliadoEmail === email);

                   const totalPendiente = pendientes.reduce((acc, curr) => {
                     const cobrado = curr.montoPagadoAcumulado || 0;
                     return acc + ((curr.comisionAsociada || 0) - cobrado);
                   }, 0);

                   const totalPagadoHistorico = items.reduce((acc, curr) => {
                     return acc + (curr.montoPagadoAcumulado || (curr.estadoPago === "PAGADA" ? curr.comisionAsociada : 0));
                   }, 0);
                   
                   const isExpanded = expandedEmail === email;

                   return (
                      <div key={email} className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl shadow-xs overflow-hidden transition-all">
                         <div onClick={() => setExpandedEmail(isExpanded ? null : email)} className="cursor-pointer p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[#F7F3EC]/40 transition-colors">
                            <div className="flex items-center gap-3.5">
                               <div className="bg-[#F7F3EC] border border-[#DED8CF] p-3 rounded-2xl text-2xl shadow-inner">👤</div>
                               <div>
                                  <h3 className="font-bold text-white text-lg flex items-center gap-2">{email}</h3>
                                  <p className="text-xs text-[#68706E] mt-0.5">{items.length} comisiones registradas</p>
                               </div>
                            </div>

                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[#DED8CF] pt-3 md:pt-0">
                               <div className="text-left md:text-right">
                                  <p className="text-[10px] text-[#68706E] font-bold uppercase tracking-widest">Saldo Pendiente</p>
                                  <p className={`text-xl font-black ${totalPendiente > 0 ? "text-red-400" : "text-[#68706E]"}`}>
                                    ${totalPendiente.toLocaleString("es-AR")}
                                  </p>
                               </div>
                               <div className="text-right">
                                  <p className="text-[10px] text-[#68706E] font-bold uppercase tracking-widest">Total Abonado</p>
                                  <p className="text-lg font-bold text-[#2F7D5C]">${totalPagadoHistorico.toLocaleString("es-AR")}</p>
                               </div>
                               <div className="text-[#68706E]">
                                 {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                               </div>
                            </div>
                         </div>
                         
                         {isExpanded && (
                            <div className="p-5 border-t border-[#DED8CF] bg-[#121316]/60 space-y-6">
                               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#FFFDFC] p-4 rounded-xl border border-[#DED8CF]">
                                  <div>
                                    <h4 className="font-black text-sm text-[#173E3B] font-bold uppercase tracking-wider flex items-center gap-2">
                                      💳 Registrar Pago a Vendedor
                                    </h4>
                                    <p className="text-xs text-[#68706E]">Elegí cancelar la totalidad o realizar entregas a cuenta</p>
                                  </div>

                                  {totalPendiente > 0 ? (
                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                      <button 
                                        onClick={() => handleAbrirModalPago(email, totalPendiente, "PARCIAL")}
                                        className="flex-1 sm:flex-none bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/40 text-[#B44E2A] px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                                      >
                                        ✏️ Pago Parcial / A Cuenta
                                      </button>
                                      
                                      <button 
                                        onClick={() => handleAbrirModalPago(email, totalPendiente, "TOTAL")}
                                        className="flex-1 sm:flex-none bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5 uppercase tracking-wider"
                                      >
                                        <CheckCircle2 className="w-4 h-4" /> Liquidar Total (${totalPendiente.toLocaleString("es-AR")})
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="bg-green-500/10 text-[#2F7D5C] border border-green-500/20 text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
                                      ✅ Sin Saldo Pendiente
                                    </span>
                                  )}
                               </div>

                               {pendientes.length > 0 && (
                                  <div className="space-y-2.5">
                                     <h5 className="text-xs font-black text-[#B44E2A] uppercase tracking-widest flex items-center gap-1.5 border-b border-[#DED8CF] pb-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 text-[#B44E2A]" /> Comisiones Pendientes de Liquidar ({pendientes.length})
                                     </h5>
                                     <div className="space-y-2">
                                        {pendientes.map(p => {
                                           const cobradoPrev = p.montoPagadoAcumulado || 0;
                                           const saldoItem = (p.comisionAsociada || 0) - cobradoPrev;
                                           const esParcial = cobradoPrev > 0;

                                           return (
                                              <div key={p.id} className="bg-[#FFFDFC] border border-[#DED8CF] p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs shadow-sm">
                                                 <div className="space-y-0.5">
                                                    <p className="font-bold text-[#1F2928] text-sm">
                                                       {p.clienteNombre ? "Cliente: " + p.clienteNombre : "Venta General"} 
                                                       <span className="text-[#68706E] font-normal text-xs ml-2">({new Date(p.fecha).toLocaleDateString("es-AR")})</span>
                                                    </p>
                                                    <p className="text-xs text-blue-400 font-bold">
                                                       Concepto: {p.cuotaAsociada ? "Cuota " + p.cuotaAsociada : "Venta Directa"}
                                                    </p>
                                                    {esParcial && (
                                                       <p className="text-[10px] text-[#B44E2A] font-mono">
                                                         Abonado a cuenta: ${cobradoPrev.toLocaleString("es-AR")} | Saldo rest.: ${saldoItem.toLocaleString("es-AR")}
                                                       </p>
                                                    )}
                                                 </div>

                                                 <div className="text-right flex items-center gap-3">
                                                    {esParcial && (
                                                      <span className="text-[9px] bg-yellow-500/20 text-[#B44E2A] border border-yellow-500/30 px-2 py-0.5 rounded font-black uppercase">
                                                        Pago Parcial
                                                      </span>
                                                    )}
                                                    <div className="text-right">
                                                       <span className="font-black text-[#B44E2A] text-sm bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-mono">
                                                         ${saldoItem.toLocaleString("es-AR")}
                                                       </span>
                                                       <p className="text-[9px] text-[#68706E] mt-1">Original: ${p.comisionAsociada}</p>
                                                    </div>
                                                 </div>
                                              </div>
                                           );
                                        })}
                                     </div>
                                  </div>
                               )}

                               {pagosPreviosAfiliado.length > 0 && (
                                  <div className="space-y-2.5 pt-2">
                                     <h5 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-[#DED8CF] pb-1.5">
                                        <FileText className="w-3.5 h-3.5 text-blue-400" /> Historial de Transacciones de Pago ({pagosPreviosAfiliado.length})
                                     </h5>
                                     <div className="space-y-2">
                                        {pagosPreviosAfiliado.map(pago => (
                                           <div key={pago.id} className="bg-[#FFFDFC] border border-blue-950 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs shadow-md">
                                              <div className="space-y-1">
                                                 <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${pago.tipoPago === "TOTAL" ? "bg-green-500/20 text-[#2F7D5C] border border-green-500/30" : "bg-yellow-500/20 text-[#B44E2A] border border-yellow-500/30"}`}>
                                                       {pago.tipoPago === "TOTAL" ? "Liquidación Total" : "Pago Parcial / A Cuenta"}
                                                    </span>
                                                    <span className="text-[#68706E] text-[10px] font-mono">
                                                       {new Date(pago.fechaPago).toLocaleString("es-AR")}
                                                    </span>
                                                 </div>
                                                 <p className="text-[#173E3B] font-bold">
                                                    Método: <span className="text-[#1F2928] font-normal">{pago.metodoPago} ({pago.cuentaOrigen || "Caja General"})</span>
                                                 </p>
                                                 {pago.numeroComprobante && (
                                                    <p className="text-[#68706E] font-mono text-[10px]">
                                                       Ref/Comprobante: {pago.numeroComprobante}
                                                    </p>
                                                 )}
                                                 {pago.observaciones && (
                                                    <p className="text-[#68706E] text-[10px] italic">
                                                       "{pago.observaciones}"
                                                    </p>
                                                 )}
                                              </div>

                                              <div className="text-right flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[#DED8CF] pt-2 sm:pt-0">
                                                 <div>
                                                    <span className="text-[#2F7D5C] font-black text-base font-mono">
                                                      +${(pago.montoPagado || 0).toLocaleString("es-AR")}
                                                    </span>
                                                    <p className="text-[9px] text-[#68706E]">Saldo Restante: ${pago.saldoRestante?.toLocaleString("es-AR")}</p>
                                                 </div>

                                                 <button 
                                                   type="button"
                                                   onClick={() => generarComprobantePDF(email, pago, [])}
                                                   className="bg-[#F7F3EC] hover:bg-[#FFFDFC] text-[#1F2928] hover:text-[#173E3B] font-bold p-2 rounded-lg text-[10px] border border-[#DED8CF] transition-colors flex items-center gap-1"
                                                   title="Descargar Comprobante PDF"
                                                 >
                                                   📄 Recibo
                                                 </button>
                                              </div>
                                           </div>
                                        ))}
                                     </div>
                                  </div>
                               )}

                               {pagadasCompletas.length > 0 && (
                                  <div className="space-y-2.5 pt-2">
                                     <h5 className="text-xs font-black text-[#2F7D5C] uppercase tracking-widest flex items-center gap-1.5 border-b border-[#DED8CF] pb-1.5 opacity-80">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2F7D5C]" /> Comisiones Totalmente Liquidadas ({pagadasCompletas.length})
                                     </h5>
                                     <div className="space-y-2 opacity-75">
                                        {pagadasCompletas.map(p => (
                                           <div key={p.id} className="bg-[#FFFDFC] border border-[#DED8CF] p-3 rounded-xl flex justify-between items-center text-xs">
                                              <div>
                                                 <p className="font-bold text-[#1F2928]">
                                                    {p.clienteNombre ? "Cliente: " + p.clienteNombre : "Venta General"} 
                                                    <span className="text-[#68706E] font-normal ml-2 text-[10px]">({new Date(p.fecha).toLocaleDateString("es-AR")})</span>
                                                 </p>
                                                 <p className="text-[10px] text-[#68706E] mt-0.5">
                                                   Concepto: {p.cuotaAsociada ? "Cuota " + p.cuotaAsociada : "Venta Directa"}
                                                 </p>
                                              </div>
                                              <div className="text-right">
                                                 <span className="font-bold text-[#2F7D5C] font-mono">${p.comisionAsociada}</span>
                                                 {p.fechaPagoAfil && (
                                                   <p className="text-[9px] text-[#68706E] uppercase mt-0.5">
                                                     Pagado {new Date(p.fechaPagoAfil).toLocaleDateString("es-AR")}
                                                   </p>
                                                 )}
                                              </div>
                                           </div>
                                        ))}
                                     </div>
                                  </div>
                               )}

                            </div>
                         )}
                      </div>
                   )
                })}
             </div>
          )}

          {modalPagoOpen && (
            <div className="fixed inset-0 bg-[#121316]/85 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
              <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl w-full max-w-lg p-6 md:p-8 space-y-6 shadow-xs relative">
                
                <div className="flex justify-between items-center border-b border-[#DED8CF] pb-4">
                  <div>
                    <span className="text-[9px] bg-[#fe5000]/20 text-[#B44E2A] font-black uppercase px-2.5 py-1 rounded border border-[#fe5000]/30 inline-block mb-1">
                      REGISTRO DE LIQUIDACIÓN
                    </span>
                    <h3 className="text-lg font-heading font-bold text-[#173E3B]">
                      {pagoTipo === "TOTAL" ? "Liquidación Total de Comisiones" : "Pago Parcial a Cuenta"}
                    </h3>
                    <p className="text-xs text-[#68706E] font-bold mt-0.5">Vendedor: {pagoAfiliadoEmail}</p>
                  </div>
                  <button 
                    onClick={() => setModalPagoOpen(false)} 
                    className="text-[#68706E] hover:text-[#173E3B] font-bold text-sm bg-[#F7F3EC] p-2 rounded-xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleEjecutarPagoComisiones} className="space-y-4 text-xs">
                  
                  <div className="grid grid-cols-2 gap-2 bg-[#121316] p-1.5 rounded-xl border border-[#DED8CF]">
                    <button
                      type="button"
                      onClick={() => {
                        setPagoTipo("TOTAL");
                        const itemsAf = comisiones.filter(c => c.afiliadoEmail === pagoAfiliadoEmail && c.estadoPago !== "PAGADA");
                        const tot = itemsAf.reduce((acc, curr) => acc + ((curr.comisionAsociada || 0) - (curr.montoPagadoAcumulado || 0)), 0);
                        setPagoMontoInput(String(tot));
                      }}
                      className={`py-2 rounded-lg font-bold text-xs transition-all ${pagoTipo === "TOTAL" ? "bg-green-600 text-white shadow-md font-black" : "text-[#68706E] hover:text-[#173E3B]"}`}
                    >
                      💚 Liquidación Total
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPagoTipo("PARCIAL");
                        setPagoMontoInput("");
                      }}
                      className={`py-2 rounded-lg font-bold text-xs transition-all ${pagoTipo === "PARCIAL" ? "bg-[#173E3B] text-white font-heading font-bold shadow-md font-black" : "text-[#68706E] hover:text-[#173E3B]"}`}
                    >
                      ✏️ Pago Parcial
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#B44E2A] font-bold uppercase mb-1">
                      💵 Monto a Transferir / Abonar ($)
                    </label>
                    <input 
                      type="number" 
                      required
                      value={pagoMontoInput} 
                      onChange={e => setPagoMontoInput(e.target.value)} 
                      placeholder="Ej: 45000" 
                      className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-3 rounded-xl text-[#1F2928] font-mono font-black text-base outline-none focus:border-yellow-500 shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">
                        💳 Método de Pago
                      </label>
                      <select 
                        value={pagoMetodo} 
                        onChange={e => setPagoMetodo(e.target.value)}
                        className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#173E3B] font-bold outline-none focus:border-yellow-500"
                      >
                        <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                        <option value="Efectivo en Mano">Efectivo en Mano</option>
                        <option value="MercadoPago">MercadoPago / CVU</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Otro">Otro Método</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">
                        🏦 Cuenta / Caja de Origen
                      </label>
                      <input 
                        type="text" 
                        value={pagoCuentaOrigen} 
                        onChange={e => setPagoCuentaOrigen(e.target.value)} 
                        placeholder="Ej: Banco Galicia / Caja Central" 
                        className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] outline-none focus:border-[#173E3B] focus:ring-1 focus:ring-[#173E3B] font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">
                      🧾 N° de Comprobante / Transacción / Ref
                    </label>
                    <input 
                      type="text" 
                      value={pagoComprobanteNum} 
                      onChange={e => setPagoComprobanteNum(e.target.value)} 
                      placeholder="Ej: Transferencia N° 9812401294" 
                      className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] font-mono outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#68706E] font-bold uppercase mb-1">
                      📝 Observaciones o Notas de Pago
                    </label>
                    <textarea 
                      value={pagoObservaciones} 
                      onChange={e => setPagoObservaciones(e.target.value)} 
                      placeholder="Ej: Pago a cuenta correspondiente al mes de Agosto..." 
                      className="w-full bg-[#F7F3EC] border border-[#DED8CF] p-2.5 rounded-xl text-[#1F2928] outline-none focus:border-[#173E3B] focus:ring-1 focus:ring-[#173E3B] resize-none h-16"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#DED8CF] flex gap-2">
                    <button 
                      type="submit" 
                      disabled={procesandoPago}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs disabled:opacity-50"
                    >
                      {procesandoPago ? "Procesando..." : "✅ Registrar Pago y Emitir Comprobante PDF"}
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={() => setModalPagoOpen(false)}
                      className="bg-[#F7F3EC] hover:bg-[#FFFDFC] text-[#68706E] font-bold px-4 py-3 rounded-xl text-xs"
                    >
                      Cancelar
                    </button>
                  </div>

                </form>

              </div>
            </div>
          )}

        </div>
      </div>
    </AdminProtectedRoute>
  );
}
