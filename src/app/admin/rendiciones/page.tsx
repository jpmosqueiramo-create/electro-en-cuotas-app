"use client";

import { calcularOperacionFinanciera } from "@/lib/financialEngine";
import { useAuth } from "@/components/AuthProvider";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, DollarSign, CheckCircle2, AlertCircle, FileText, Calendar } from "lucide-react";

export default function RendicionesPage() {
  const { user } = useAuth();
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);
  const [fechaCobroReal, setFechaCobroReal] = useState(new Date().toISOString().split('T')[0]);
  const [procesando, setProcesando] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "solicitudes"), where("estadoEntrega", "==", "ENTREGADO"));
      const snap = await getDocs(q);
      const itemsPendientes: any[] = [];
      const itemsHistorial: any[] = [];

      snap.forEach(doc => {
        const data = doc.data();
        if (data.estadoRendicion === "PENDIENTE") {
          itemsPendientes.push({ id: doc.id, ...data });
        } else if (data.estadoRendicion === "CONFIRMADO") {
          itemsHistorial.push({ id: doc.id, ...data });
        }
      });
      itemsHistorial.sort((a, b) => (b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : 0) - (a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : 0));

      setPendientes(itemsPendientes);
      setHistorial(itemsHistorial);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const abrirModal = (sol: any) => {
    setSolicitudSeleccionada(sol);
    setFechaCobroReal(new Date().toISOString().split('T')[0]);
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setSolicitudSeleccionada(null);
  };

  const confirmarRendicion = async () => {
    if (!solicitudSeleccionada || !user) return;
    setProcesando(true);
    
    try {
      await updateDoc(doc(db, "solicitudes", solicitudSeleccionada.id), {
        estadoRendicion: "CONFIRMADO",
        fechaRendicionReal: fechaCobroReal,
        historialRendicion: `Verificado por el admin (${user.email}) indicando fecha de cobro: ${fechaCobroReal}`
      });
      alert("Comprobante de rendición guardado exitosamente.");
      cerrarModal();
      fetchData();
    } catch (error: any) {
      console.error("Firebase Update Error:", error);
      alert(`No se pudo guardar la confirmación. Motivo: ${error.message || "Error desconocido"}`);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] p-4 md:p-8 font-sans selection:bg-[#173E3B] selection:text-white">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* HEADER PRINCIPAL */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#FFFDFC] border border-[#DED8CF] p-6 rounded-2xl shadow-xs">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="p-2.5 bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#173E3B] rounded-xl border border-[#DED8CF] transition shadow-xs">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-heading font-bold uppercase tracking-widest text-[#B44E2A]">
                  <DollarSign className="w-3.5 h-3.5 text-[#B44E2A]" /> Centro de Monitoreo Root
                </div>
                <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-[#173E3B]">
                  Rendiciones de Cobranza
                </h1>
                <p className="text-xs text-[#68706E] font-sans mt-0.5">
                  Auditoría de entregas y confirmación física de dinero recibido por afiliados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#F7F3EC] px-4 py-2.5 rounded-xl border border-[#DED8CF]">
              <DollarSign className="w-4 h-4 text-[#2F7D5C]" />
              <span className="text-xs font-heading font-bold text-[#68706E]">
                Pendientes: <strong className="text-[#B44E2A] font-mono text-sm">{pendientes.length}</strong>
              </span>
            </div>
          </header>

          {loading ? (
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-12 rounded-2xl text-center shadow-xs">
              <p className="text-sm text-[#68706E] animate-pulse font-heading font-semibold">Analizando base de datos central...</p>
            </div>
          ) : (
            <>
              {/* SECCIÓN PENDIENTES */}
              <div className="space-y-4">
                <h2 className="text-xl font-heading font-bold text-[#173E3B] flex items-center gap-2 border-b border-[#DED8CF] pb-2">
                  <AlertCircle className="w-5 h-5 text-[#B44E2A]" /> Atención Requerida (Pendientes)
                </h2>

                {pendientes.length === 0 ? (
                  <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-2xl text-center shadow-xs max-w-xl mx-auto space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-[#2F7D5C] mx-auto" />
                    <h3 className="text-base font-heading font-bold text-[#173E3B]">Todo al Día</h3>
                    <p className="text-xs text-[#68706E] font-sans">No hay rendiciones pendientes de confirmación en este momento.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {pendientes.map(sol => (
                      <div key={sol.id} className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-6 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-[#173E3B]/60 transition-all">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start border-b border-[#DED8CF] pb-3">
                            <h3 className="text-base font-heading font-bold text-[#173E3B] truncate max-w-[200px]">{sol.productoDeseado}</h3>
                            <span className="bg-[#E7B86A]/20 text-[#8F6211] border border-[#E7B86A]/50 text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              PENDIENTE ARCA
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between p-2.5 bg-[#F7F3EC] rounded-xl border border-[#DED8CF]">
                              <span className="text-[#68706E] font-sans">👤 Afiliado:</span>
                              <span className="text-[#1F2928] font-heading font-bold truncate max-w-[180px]">{sol.afiliadoEmail}</span>
                            </div>
                            <div className="flex justify-between p-2.5 bg-[#F7F3EC] rounded-xl border border-[#DED8CF]">
                              <span className="text-[#68706E] font-sans">💵 Cobro Reportado:</span>
                              <span className="text-[#B44E2A] text-sm font-heading font-extrabold font-mono">${sol.montoAbonado}</span>
                            </div>
                            <div className="flex justify-between p-2.5 bg-[#F7F3EC] rounded-xl border border-[#DED8CF]">
                              <span className="text-[#68706E] font-sans">💳 Modalidad:</span>
                              <span className="text-[#173E3B] font-heading font-bold uppercase">{sol.metodoPago}</span>
                            </div>
                            <div className="flex justify-between p-2.5 bg-[#F7F3EC] rounded-xl border border-[#DED8CF]">
                              <span className="text-[#68706E] font-sans">📦 SN Entregado:</span>
                              <span className="text-[#1F2928] font-mono font-bold">{sol.numeroSerie || "N/A"}</span>
                            </div>
                          </div>

                          {sol.comentarioEntrega && (
                            <div className="bg-[#F7F3EC] p-3 rounded-xl text-xs italic text-[#1F2928] border-l-2 border-[#B44E2A]">
                              &quot;{sol.comentarioEntrega}&quot;
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => abrirModal(sol)}
                          className="w-full mt-6 bg-[#2F7D5C] hover:bg-[#256449] text-white font-heading font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-xs"
                        >
                          ✓ CONFIRMAR INGRESO AL ARCA
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECCIÓN HISTORIAL */}
              <div className="space-y-4 pt-6">
                <h2 className="text-xl font-heading font-bold text-[#173E3B] border-b border-[#DED8CF] pb-2">
                  Historial de Rendiciones (Caja Confirmada)
                </h2>

                {historial.length === 0 ? (
                  <p className="text-[#68706E] text-xs font-sans">No existen rendiciones aprobadas aún en el historial.</p>
                ) : (
                  <div className="bg-[#FFFDFC] rounded-2xl overflow-hidden border border-[#DED8CF] shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead className="bg-[#F7F3EC] text-[#173E3B] font-heading font-bold uppercase border-b border-[#DED8CF]">
                          <tr>
                            <th className="p-4">Producto</th>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Afiliado</th>
                            <th className="p-4">Importe</th>
                            <th className="p-4">Método</th>
                            <th className="p-4">Auditoría Institucional</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DED8CF]">
                          {historial.map(sol => (
                            <tr key={sol.id} className="hover:bg-[#F7F3EC]/50 transition text-[#1F2928]">
                              <td className="p-4 font-heading font-bold text-[#173E3B] max-w-[200px] truncate">{sol.productoDeseado}</td>
                              <td className="p-4 text-[#1F2928]">{sol.clienteEmail}</td>
                              <td className="p-4 text-[#1F2928]">{sol.afiliadoEmail}</td>
                              <td className="p-4 font-heading font-bold text-[#2F7D5C] font-mono text-sm">${sol.montoAbonado}</td>
                              <td className="p-4">
                                <span className="bg-[#F7F3EC] border border-[#DED8CF] px-2.5 py-1 rounded-md text-[10px] font-heading font-bold text-[#173E3B] uppercase">
                                  {sol.metodoPago}
                                </span>
                              </td>
                              <td className="p-4 text-[11px] text-[#68706E] italic max-w-[250px]">{sol.historialRendicion || "Acuse confirmado exitosamente"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* Modal de Confirmación */}
      {modalOpen && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-[#1F2928]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-6 sm:p-8 rounded-2xl shadow-xl max-w-md w-full relative animate-in fade-in zoom-in duration-200 space-y-5">
            <div>
              <h2 className="text-xl font-heading font-extrabold text-[#173E3B]">Confirmar Recepción de Fondos</h2>
              <p className="text-[#68706E] text-xs font-sans mt-1">
                Verificá el pago de <strong className="text-[#B44E2A] font-mono text-sm">${solicitudSeleccionada.montoAbonado}</strong> reportado por <strong className="text-[#173E3B]">{solicitudSeleccionada.afiliadoEmail}</strong>.
              </p>
            </div>
            
            {/* Alerta de División Fiscal AFIP por Cuota */}
            {(() => {
              const cProd = Number(solicitudSeleccionada.precioContado || solicitudSeleccionada.precioContadoVal) || Math.round((Number(solicitudSeleccionada.montoAbonado || 0) * 12) / 2.5);
              const mult = Number(solicitudSeleccionada.multiplicador) || 2.5;
              const n = Number(solicitudSeleccionada.cuotas || solicitudSeleccionada.planElegido) || 12;
              const calc = calcularOperacionFinanciera({ costoProducto: cProd, multiplicador: mult, cuotas: n });

              return (
                <div className="bg-[#F7F3EC] border border-[#DED8CF] p-4 rounded-xl space-y-2 text-xs">
                  <p className="font-heading font-bold text-[#B44E2A] uppercase tracking-wider text-[10px] flex items-center gap-1">
                    ⚖️ ALERTA DE DIVISIÓN FISCAL AFIP (MANDATO)
                  </p>
                  
                  <div className="flex justify-between items-center bg-[#FFFDFC] p-2.5 rounded-xl border border-[#DED8CF]">
                    <span className="text-[#2F7D5C] font-heading font-bold text-[11px]">🟢 Recibo X (Capital Exento):</span>
                    <span className="text-[#1F2928] font-mono font-bold">${calc.montoExentoCuota.toLocaleString("es-AR")}</span>
                  </div>

                  <div className="bg-[#FFFDFC] p-2.5 rounded-xl border border-[#DED8CF] space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[#173E3B] font-heading font-bold text-[11px]">🔵 Factura B AFIP (Servicios/CFT):</span>
                      <span className="text-[#1F2928] font-mono font-bold">${calc.montoGravadoCuota.toLocaleString("es-AR")}</span>
                    </div>
                    <div className="text-[10px] text-[#68706E] border-t border-[#DED8CF] pt-1 space-y-0.5 font-mono">
                      <div className="flex justify-between"><span>📄 Base Neta (Honorarios):</span> <span className="text-[#1F2928] font-bold">${calc.netoGravadoCuota.toLocaleString("es-AR")}</span></div>
                      <div className="flex justify-between"><span>🏛️ Débito Fiscal IVA 21%:</span> <span className="text-[#173E3B] font-bold">${calc.iva21Cuota.toLocaleString("es-AR")}</span></div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-heading font-bold text-[#173E3B] uppercase mb-1.5">📝 Fecha Real de Cobro</label>
              <input 
                type="date" 
                value={fechaCobroReal}
                onChange={(e) => setFechaCobroReal(e.target.value)}
                className="w-full bg-[#FFFDFC] border border-[#DED8CF] text-[#1F2928] p-3 rounded-xl focus:border-[#173E3B] outline-none font-sans text-xs"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={cerrarModal}
                disabled={procesando}
                className="flex-1 bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#68706E] font-heading font-bold py-3 rounded-xl transition-all border border-[#DED8CF] text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarRendicion}
                disabled={procesando}
                className="flex-1 bg-[#2F7D5C] hover:bg-[#256449] text-white font-heading font-bold py-3 rounded-xl transition-all shadow-xs text-xs disabled:opacity-50"
              >
                {procesando ? "Guardando..." : "✓ Guardar en Arca"}
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminProtectedRoute>
  );
}
