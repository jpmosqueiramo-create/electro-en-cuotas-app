"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DollarSign, CheckCircle2, AlertCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminComisionesPage() {
  const [comisiones, setComisiones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setCargando(true);
      const q = query(collection(db, "notificaciones"), where("comisionAsociada", ">", 0));
      const snap = await getDocs(q);
      const items: any[] = [];
      snap.forEach(d => {
        items.push({ id: d.id, ...d.data() });
      });
      // Sort desc by date
      items.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setComisiones(items);
    } catch (error) {
      console.error(error);
      alert("Error al cargar comisiones.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generarComprobantePDF = (email: string, itemsPendientes: any[], total: number) => {
    const docPdf = new jsPDF();
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(22);
    docPdf.setTextColor(234, 179, 8); // Yellow
    docPdf.text("COMPROBANTE DE LIQUIDACION", 105, 20, { align: "center" });

    docPdf.setFontSize(12);
    docPdf.setTextColor(50, 50, 50);
    docPdf.setFont("helvetica", "normal");
    docPdf.text(`Fecha de Liquidación: ${new Date().toLocaleDateString()}`, 20, 35);
    docPdf.text(`Beneficiario (Afiliado): ${email}`, 20, 45);
    docPdf.text(`Monto Total Abonado: $${total.toLocaleString()}`, 20, 55);

    docPdf.setFont("helvetica", "bold");
    docPdf.text("Detalle de las Comisiones Pagadas:", 20, 70);

    const bodyData = itemsPendientes.map(item => [
      new Date(item.fecha).toLocaleDateString(),
      item.clienteNombre || "Desconocido",
      item.cuotaAsociada ? `Cuota ${item.cuotaAsociada}` : "N/A",
      `$${item.comisionAsociada}`
    ]);

    autoTable(docPdf, {
      startY: 75,
      head: [["Fecha", "Cliente", "Concepto", "Monto"]],
      body: bodyData,
      theme: 'grid',
      headStyles: { fillColor: [234, 179, 8] },
    });

    docPdf.setFont("helvetica", "italic");
    docPdf.setFontSize(10);
    const finalY = (docPdf as any).lastAutoTable.finalY || 100;
    docPdf.text("Este documento certifica el pago de comisiones detalladas.", 105, finalY + 20, { align: "center" });
    docPdf.text("Firma Administrativa / Cuenta Hogar", 105, finalY + 30, { align: "center" });

    docPdf.save(`Liquidacion_${email.split('@')[0]}_${new Date().getTime()}.pdf`);
  };

  const liquidarAfiliado = async (email: string, itemsPendientes: any[], total: number) => {
    if (!window.confirm(`¿Estás seguro de liquidar y marcar como pagadas las ${itemsPendientes.length} comisiones de ${email}?`)) return;
    
    try {
      for (const item of itemsPendientes) {
        await updateDoc(doc(db, "notificaciones", item.id), {
          estadoPago: "PAGADA",
          fechaPagoAfil: new Date().toISOString()
        });
      }
      generarComprobantePDF(email, itemsPendientes, total);
      alert("Comisiones liquidadas exitosamente. El comprobante se ha descargado.");
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Hubo un error al liquidar.");
    }
  };

  // Group by affiliate
  const afiliadosMap: Record<string, any[]> = {};
  comisiones.forEach(c => {
    if (!afiliadosMap[c.afiliadoEmail]) afiliadosMap[c.afiliadoEmail] = [];
    afiliadosMap[c.afiliadoEmail].push(c);
  });

  const afiliadosEmails = Object.keys(afiliadosMap);

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500/5 p-3 rounded-xl border border-zinc-800">
                 <DollarSign className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Liquidación de Comisiones</h1>
                <p className="text-zinc-500 text-sm">Gestiona el pago a tu fuerza de venta</p>
              </div>
            </div>
            <Link href="/admin" className="text-sm border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded transition-colors font-bold whitespace-nowrap shadow-sm">
              ← Volver al Panel
            </Link>
          </header>

          {cargando ? (
             <div className="text-center py-20 text-zinc-500 font-bold animate-pulse">Cargando base financiera...</div>
          ) : afiliadosEmails.length === 0 ? (
             <div className="bg-zinc-900 border border-zinc-850 p-10 rounded-2xl text-center shadow-sm">
                <p className="text-zinc-500">No se ha generado ninguna comisión aún en el sistema.</p>
             </div>
          ) : (
             <div className="space-y-4">
                {afiliadosEmails.map(email => {
                   const items = afiliadosMap[email];
                   const pendientes = items.filter(i => i.estadoPago !== "PAGADA");
                   const pagadas = items.filter(i => i.estadoPago === "PAGADA");
                   
                   const totalPendiente = pendientes.reduce((acc, curr) => acc + (curr.comisionAsociada || 0), 0);
                   const totalPagado = pagadas.reduce((acc, curr) => acc + (curr.comisionAsociada || 0), 0);
                   
                   const isExpanded = expandedEmail === email;

                   return (
                      <div key={email} className="bg-zinc-900 border border-zinc-850 rounded-xl shadow-sm overflow-hidden transition-all">
                         <div onClick={() => setExpandedEmail(isExpanded ? null : email)} className="cursor-pointer p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-zinc-800/40 transition-colors">
                            <div className="flex items-center gap-3">
                               <div className="bg-zinc-100 p-3 rounded-full text-2xl">👤</div>
                               <div>
                                  <h3 className="font-bold text-white text-lg">{email}</h3>
                                  <p className="text-xs text-zinc-500">{items.length} comisiones generadas en la historia</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-6">
                               <div className="text-right">
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Saldo a Liquidar</p>
                                  <p className={`text-xl font-black ${totalPendiente > 0 ? 'text-red-500' : 'text-zinc-400'}`}>${totalPendiente.toLocaleString()}</p>
                               </div>
                               <div className="text-right hidden sm:block">
                                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Ya Pagado</p>
                                  <p className="text-lg font-bold text-green-400">${totalPagado.toLocaleString()}</p>
                               </div>
                            </div>
                         </div>
                         
                         {isExpanded && (
                            <div className="p-5 border-t border-gray-100 bg-zinc-800/40/50">
                               <div className="flex justify-between items-center mb-4">
                                  <h4 className="font-bold text-white">Detalle de Comisiones</h4>
                                  {totalPendiente > 0 && (
                                     <button onClick={() => liquidarAfiliado(email, pendientes, totalPendiente)} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition-all">
                                        <CheckCircle2 className="w-4 h-4"/> Pagar $ {totalPendiente.toLocaleString()} Acumulado
                                     </button>
                                  )}
                               </div>
                               
                               {pendientes.length > 0 && (
                                  <div className="mb-6">
                                     <h5 className="text-xs font-black text-red-500 mb-2 uppercase flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Pendientes de Pago</h5>
                                     <div className="space-y-2">
                                        {pendientes.map(p => (
                                           <div key={p.id} className="bg-zinc-900 border border-red-200 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm shadow-sm">
                                              <div>
                                                 <p className="font-bold text-zinc-200">
                                                    {p.clienteNombre ? `Cliente: ${p.clienteNombre}` : 'Cliente Desconocido'} 
                                                    <span className="text-zinc-400 font-normal ml-2 text-xs">({new Date(p.fecha).toLocaleDateString()})</span>
                                                 </p>
                                                 <p className="text-xs text-blue-400 font-bold mt-0.5">Cuota/Origen: {p.cuotaAsociada ? `Cuota ${p.cuotaAsociada}` : 'Sin Especificar'}</p>
                                              </div>
                                              <span className="font-black text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100">${p.comisionAsociada}</span>
                                           </div>
                                        ))}
                                     </div>
                                  </div>
                               )}

                               {pagadas.length > 0 && (
                                  <div>
                                     <h5 className="text-xs font-black text-green-400 mb-2 uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Historial Ya Pagado</h5>
                                     <div className="space-y-2 opacity-70">
                                        {pagadas.map(p => (
                                           <div key={p.id} className="bg-zinc-900 border border-green-200 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm shadow-sm">
                                              <div>
                                                 <p className="font-bold text-zinc-600">
                                                    {p.clienteNombre ? `Cliente: ${p.clienteNombre}` : 'Cliente Desconocido'} 
                                                    <span className="text-zinc-400 font-normal ml-2 text-xs">({new Date(p.fecha).toLocaleDateString()})</span>
                                                 </p>
                                                 <p className="text-xs text-zinc-500 mt-0.5">Cuota/Origen: {p.cuotaAsociada ? `Cuota ${p.cuotaAsociada}` : 'N/A'}</p>
                                              </div>
                                              <div className="text-right">
                                                 <span className="font-bold text-green-600">${p.comisionAsociada}</span>
                                                 {p.fechaPagoAfil && <p className="text-[9px] text-zinc-400 uppercase mt-0.5">Pagado el {new Date(p.fechaPagoAfil).toLocaleDateString()}</p>}
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
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
