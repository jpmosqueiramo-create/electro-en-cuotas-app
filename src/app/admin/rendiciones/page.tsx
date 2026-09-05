"use client";

import { calcularOperacionFinanciera } from "@/lib/financialEngine";
import { useAuth } from "@/components/AuthProvider";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";

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
      itemsHistorial.sort((a, b) => b.fechaCreacion?.toMillis() - a.fechaCreacion?.toMillis());

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
      <div className="min-h-screen bg-[#FFFDFC] text-white p-8 relative">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-8 border-b border-[#DED8CF] pb-4">
            <div className="flex items-center gap-4">
              <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-12 w-auto object-contain" />
              <h1 className="text-3xl font-black text-[#B44E2A]">Rendiciones de Cobranzas</h1>
            </div>
            <Link href="/admin" className="text-[#68706E] border border-[#DED8CF] px-4 py-2 rounded hover:text-white transition font-bold">← Volver al Panel de Monitoreo</Link>
          </header>

          {loading ? (
            <p className="text-center text-[#68706E] font-bold mt-20">Analizando base de datos central...</p>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-4 border-b border-[#DED8CF] pb-2">Atención Requerida (Pendientes)</h2>
              {pendientes.length === 0 ? (
                <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-xl text-center shadow-xs max-w-xl mx-auto mb-12">
                  <span className="text-4xl mb-4 block">✅</span>
                  <h2 className="text-xl font-bold text-white mb-2">Todo al Día</h2>
                  <p className="text-[#68706E]">No hay pagos pendientes de rendir por parte de los afiliados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                  {pendientes.map(sol => (
                    <div key={sol.id} className="bg-[#FFFDFC] border border-[#DED8CF] rounded-xl p-6 shadow-xs relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md">FRENADO</div>

                      <h3 className="text-lg font-black text-white mb-1 border-b border-[#DED8CF] pb-2">{sol.productoDeseado}</h3>

                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold flex justify-between p-2 bg-[#FFFDFC] rounded">
                          <span className="text-[#68706E]">👤 Afiliado:</span>
                          <span className="text-white tracking-wide">{sol.afiliadoEmail}</span>
                        </p>
                        <p className="text-xs font-semibold flex justify-between p-2 bg-[#FFFDFC] rounded border border-[#DED8CF]">
                          <span className="text-[#68706E]">💵 Cobro Reportado:</span>
                          <span className="text-[#B44E2A] text-sm font-black">${sol.montoAbonado}</span>
                        </p>
                        <p className="text-xs font-semibold flex justify-between p-2 bg-[#FFFDFC] rounded">
                          <span className="text-[#68706E]">💳 Modalidad:</span>
                          <span className="text-white uppercase">{sol.metodoPago}</span>
                        </p>
                        <p className="text-xs font-semibold flex justify-between p-2 bg-[#FFFDFC] rounded">
                          <span className="text-[#68706E]">📦 SN Entregado:</span>
                          <span className="text-blue-400">{sol.numeroSerie || "N/A"}</span>
                        </p>
                      </div>

                      {sol.comentarioEntrega && (
                        <div className="bg-[#F7F3EC] p-3 rounded mt-3 text-xs italic text-[#1F2928] border-l-2 border-[#fe5000]">
                          &quot;{sol.comentarioEntrega}&quot;
                        </div>
                      )}

                      <button
                        onClick={() => abrirModal(sol)}
                        className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400"
                      >
                        ✓ CONFIRMAR INGRESO AL ARCA
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <h2 className="text-xl font-bold text-white mb-4 mt-8 border-b border-[#DED8CF] pb-2">Historial de Rendiciones (Caja Confirmada)</h2>
              {historial.length === 0 ? (
                <p className="text-[#68706E] text-sm">No existen rendiciones aprobadas aún en el historial.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left bg-[#FFFDFC] rounded-lg overflow-hidden border border-[#DED8CF] text-sm">
                    <thead className="bg-[#FFFDFC]/50 text-[#68706E] border-b border-[#DED8CF]">
                      <tr>
                        <th className="p-4">Producto</th>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Afiliado</th>
                        <th className="p-4">Importe</th>
                        <th className="p-4">Método</th>
                        <th className="p-4">Auditoría Institucional</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map(sol => (
                        <tr key={sol.id} className="border-b border-[#DED8CF] hover:bg-[#F7F3EC]/60 transition">
                          <td className="p-4 font-bold text-white max-w-[200px] truncate">{sol.productoDeseado}</td>
                          <td className="p-4 text-[#1F2928]">{sol.clienteEmail}</td>
                          <td className="p-4 text-[#1F2928]">{sol.afiliadoEmail}</td>
                          <td className="p-4 font-black text-[#2F7D5C]">${sol.montoAbonado}</td>
                          <td className="p-4"><span className="bg-[#F7F3EC] border border-[#DED8CF] px-2 py-1 rounded text-xs text-white uppercase">{sol.metodoPago}</span></td>
                          <td className="p-4 text-[10px] text-[#68706E] italic max-w-[250px]">{sol.historialRendicion || "Acuse confirmado exitosamente"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* Modal de Confirmación */}
      {modalOpen && solicitudSeleccionada && (
        <div className="fixed inset-0 bg-[#FFFDFC]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDFC] border border-[#DED8CF] p-8 rounded-xl shadow-xs max-w-md w-full relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-white mb-2">Confirmar Recepción</h2>
            <p className="text-[#68706E] text-sm mb-6">Verifica los datos del pago de <strong className="text-[#B44E2A]">${solicitudSeleccionada.montoAbonado}</strong> reportado por <strong className="text-white">{solicitudSeleccionada.afiliadoEmail}</strong>.</p>
            
            {/* Alerta de División Fiscal AFIP por Cuota */}
            {(() => {
              const cProd = Number(solicitudSeleccionada.precioContado || solicitudSeleccionada.precioContadoVal) || Math.round((Number(solicitudSeleccionada.montoAbonado || 0) * 12) / 2.5);
              const mult = Number(solicitudSeleccionada.multiplicador) || 2.5;
              const n = Number(solicitudSeleccionada.cuotas || solicitudSeleccionada.planElegido) || 12;
              const calc = calcularOperacionFinanciera({ costoProducto: cProd, multiplicador: mult, cuotas: n });

              return (
                <div className="mb-6 bg-[#121316] border border-[#DED8CF] p-4 rounded-xl space-y-2 text-xs">
                  <p className="font-black text-[#B44E2A] uppercase tracking-widest text-[10px] flex items-center gap-1">
                    ⚖️ ALERTA DE DIVISIÓN FISCAL AFIP (MANDATO)
                  </p>
                  
                  <div className="flex justify-between items-center bg-[#FFFDFC] p-2 rounded border border-emerald-500/30">
                    <span className="text-[#2F7D5C] font-bold text-[11px]">🟢 Recibo X (Capital Exento):</span>
                    <span className="text-white font-black">${calc.montoExentoCuota.toLocaleString("es-AR")}</span>
                  </div>

                  <div className="bg-[#FFFDFC] p-2.5 rounded border border-blue-500/30 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-400 font-bold text-[11px]">🔵 Factura B AFIP (Servicios/CFT):</span>
                      <span className="text-white font-black">${calc.montoGravadoCuota.toLocaleString("es-AR")}</span>
                    </div>
                    <div className="text-[10px] text-[#68706E] border-t border-[#DED8CF] pt-1 space-y-0.5 font-mono">
                      <div className="flex justify-between"><span>📄 Base Neta (Honorarios):</span> <span className="text-white font-bold">${calc.netoGravadoCuota.toLocaleString("es-AR")}</span></div>
                      <div className="flex justify-between"><span>🏛️ Débito Fiscal IVA 21%:</span> <span className="text-blue-300 font-bold">${calc.iva21Cuota.toLocaleString("es-AR")}</span></div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mb-6">
              <label className="block text-xs font-bold text-[#68706E] uppercase mb-2">📝 Fecha Real de Cobro</label>
              <input 
                type="date" 
                value={fechaCobroReal}
                onChange={(e) => setFechaCobroReal(e.target.value)}
                className="w-full bg-[#FFFDFC] border border-[#DED8CF] text-white p-3 rounded-lg focus:border-[#fe5000] outline-none transition-colors"
              />
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={cerrarModal}
                disabled={procesando}
                className="flex-1 bg-[#F7F3EC] hover:bg-[#FFFDFC] text-white font-bold py-3 rounded-lg transition-colors border border-[#DED8CF]"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarRendicion}
                disabled={procesando}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-lg transition-all shadow-[0_0_15px_rgba(22,163,74,0.4)] disabled:opacity-50"
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
