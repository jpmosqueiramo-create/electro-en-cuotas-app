"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { generarPdfPresupuesto } from "@/lib/pdfGenerator";
import { FileText, Search, Filter, Download, ArrowLeft, ExternalLink, Users, ShieldCheck, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react";

function parseAnyDate(val: any): Date {
  if (!val) return new Date(0);
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  if (val.toDate && typeof val.toDate === "function") return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date();
}

export default function PresupuestosPage() {
  const [presupuestos, setPresupuestos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  const fetchPresupuestos = async () => {
    setLoading(true);
    try {
      const allPresupuestos: any[] = [];

      // 1. Fetch de solicitudes_cuenta (Aperturas de Cuenta)
      const snapAperturas = await getDocs(collection(db, "solicitudes_cuenta"));
      snapAperturas.forEach((d) => {
        const solData = d.id ? { id: d.id, ...d.data() } : d.data();
        const presupList = (solData as any).presupuestos || [];
        if (presupList.length > 0) {
          presupList.forEach((p: any) => {
            allPresupuestos.push({
              ...p,
              solicitudId: d.id,
              solicitudTipo: "apertura",
              clienteNombre: (solData as any).nombreCompleto || (solData as any).nombre || "Cliente Sin Nombre",
              clienteDni: (solData as any).numeroDni || (solData as any).dni || "-",
              clienteWhatsapp: (solData as any).whatsapp || (solData as any).telefono || "-",
              clienteLocalidad: (solData as any).direccion || (solData as any).localidad || "-",
              fechaObjeto: parseAnyDate(p.fechaIso || p.fecha || (solData as any).fechaIso || (solData as any).fecha)
            });
          });
        } else if ((solData as any).necesidad || (solData as any).productoDeseado || (solData as any).productoNombre) {
          const prodName = (solData as any).necesidad || (solData as any).productoDeseado || (solData as any).productoNombre;
          allPresupuestos.push({
            id: "pres_pend_" + d.id,
            solicitudId: d.id,
            solicitudTipo: "apertura",
            clienteNombre: (solData as any).nombreCompleto || (solData as any).nombre || "Cliente Sin Nombre",
            clienteDni: (solData as any).numeroDni || (solData as any).dni || "-",
            clienteWhatsapp: (solData as any).whatsapp || (solData as any).telefono || "-",
            clienteLocalidad: (solData as any).direccion || (solData as any).localidad || "-",
            producto: prodName,
            items: [{ producto: prodName, contado: 0, cuotas: 12, valorCuota: 0 }],
            estado: "Pendiente",
            notas: "Solicitud recibida desde portada ('Buscás algo especial'). Pendiente de armar cotización por el administrador.",
            fechaObjeto: parseAnyDate((solData as any).fechaIso || (solData as any).fecha || (solData as any).fechaCreacion)
          });
        }
      });

      // 2. Fetch de solicitudes (Solicitudes Especiales / Estándar)
      const snapSolicitudes = await getDocs(collection(db, "solicitudes"));
      snapSolicitudes.forEach((d) => {
        const solData = d.id ? { id: d.id, ...d.data() } : d.data();
        const presupList = (solData as any).presupuestos || [];
        presupList.forEach((p: any) => {
          if (!allPresupuestos.some((existing) => existing.id === p.id && existing.solicitudId === d.id)) {
            allPresupuestos.push({
              ...p,
              solicitudId: d.id,
              solicitudTipo: "estandar",
              clienteNombre: (solData as any).nombreCompleto || (solData as any).nombre || (solData as any).datosPersonales?.nombreCompleto || "Cliente Sin Nombre",
              clienteDni: (solData as any).numeroDni || (solData as any).dni || (solData as any).datosPersonales?.numeroDni || "-",
              clienteWhatsapp: (solData as any).whatsapp || (solData as any).telefono || "-",
              clienteLocalidad: (solData as any).direccion || (solData as any).localidad || "-",
              fechaObjeto: parseAnyDate(p.fechaIso || p.fecha || (solData as any).fechaCreacion)
            });
          }
        });
      });

      allPresupuestos.sort((a, b) => b.fechaObjeto.getTime() - a.fechaObjeto.getTime());
      setPresupuestos(allPresupuestos);
    } catch (e) {
      console.error("Error al cargar presupuestos:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresupuestos();
  }, []);

  const presupuestosFiltrados = presupuestos.filter((p) => {
    const estadoMatch =
      filtroEstado === "TODOS" ? true :
      filtroEstado === "ACEPTADO" ? (p.estado === "Aceptado" || p.estado === "Aprobado") :
      filtroEstado === "RECHAZADO" ? p.estado === "Rechazado" :
      filtroEstado === "PENDIENTE" ? (p.estado === "Pendiente" || !p.estado) :
      filtroEstado === "ELIMINADO" ? (p.estado === "Eliminado" || p.estado === "Cancelado") : true;

    const queryClean = busqueda.toLowerCase().trim();
    if (!queryClean) return estadoMatch;

    const matchNombre = (p.clienteNombre || "").toLowerCase().includes(queryClean);
    const matchDni = (p.clienteDni || "").toString().includes(queryClean);
    const matchId = (p.id || "").toLowerCase().includes(queryClean);
    const matchProd = (p.producto || "").toLowerCase().includes(queryClean) ||
      (p.items || []).some((it: any) => (it.producto || "").toLowerCase().includes(queryClean));

    return estadoMatch && (matchNombre || matchDni || matchId || matchProd);
  });

  const handleDescargarPdf = (p: any) => {
    const itemsList = p.items && p.items.length > 0 
      ? p.items.map((it: any) => ({
          producto: it.producto,
          contado: it.contado || 0,
          cuotas: it.cuotas || 12,
          valorCuota: it.valorCuota || 0
        }))
      : (p.producto ? [{
          producto: p.producto,
          contado: p.contado || 0,
          cuotas: p.cuotas || 12,
          valorCuota: p.valorCuota || 0
        }] : []);

    generarPdfPresupuesto({
      nroPresupuesto: p.id ? p.id.replace("pres_", "").substring(0, 8).toUpperCase() : "S/D",
      fecha: p.fechaObjeto ? p.fechaObjeto.toLocaleDateString("es-AR") : new Date().toLocaleDateString("es-AR"),
      clienteNombre: p.clienteNombre || "Cliente",
      clienteDni: p.clienteDni || "-",
      clienteWhatsapp: p.clienteWhatsapp || "-",
      clienteLocalidad: p.clienteLocalidad || "-",
      items: itemsList,
      notas: p.notas || ""
    });
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
                  <FileText className="w-3.5 h-3.5 text-[#B44E2A]" /> Centro de Monitoreo Root
                </div>
                <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-[#173E3B]">
                  Historial Maestro de Presupuestos
                </h1>
                <p className="text-xs text-[#68706E] font-sans mt-0.5">
                  Registro cronológico de todas las cotizaciones emitidas (Aprobadas, Rechazadas, Pendientes y Canceladas)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link href="/admin/clientes" className="bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#173E3B] border border-[#DED8CF] hover:border-[#173E3B] px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition flex items-center gap-1.5 shadow-xs">
                <Users className="w-3.5 h-3.5" /> Ver Clientes
              </Link>
              <Link href="/admin/validaciones" className="bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#B44E2A] border border-[#DED8CF] hover:border-[#B44E2A] px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition flex items-center gap-1.5 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" /> Validaciones
              </Link>
              <div className="bg-[#F7F3EC] px-3.5 py-2 rounded-xl border border-[#DED8CF] text-xs font-heading font-bold text-[#68706E]">
                Total: <strong className="text-[#173E3B] font-mono text-sm">{presupuestos.length}</strong>
              </div>
            </div>
          </header>

          {/* BARRA DE CONTROLES: FILTROS Y BUSCADOR */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#FFFDFC] border border-[#DED8CF] p-5 rounded-2xl shadow-xs">
            
            {/* Buscador */}
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-[#68706E] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por Nombre, DNI, N° de Presupuesto o Producto..."
                className="w-full bg-[#FFFDFC] border border-[#DED8CF] pl-10 pr-4 py-2.5 rounded-xl text-xs text-[#1F2928] placeholder-[#68706E] outline-none focus:border-[#173E3B] focus:ring-1 focus:ring-[#173E3B] font-sans transition"
              />
            </div>

            {/* Filtros por Estado */}
            <div className="md:col-span-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-heading font-bold text-[#68706E] mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Estado:
              </span>
              {[
                { key: "TODOS", label: "Todos" },
                { key: "ACEPTADO", label: "🟢 Aceptados" },
                { key: "PENDIENTE", label: "🟡 Pendientes" },
                { key: "RECHAZADO", label: "🔴 Rechazados" },
                { key: "ELIMINADO", label: "🗑️ Cancelados" }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFiltroEstado(f.key)}
                  className={`text-xs font-heading font-bold px-3 py-1.5 rounded-xl border transition-all ${
                    filtroEstado === f.key
                      ? "bg-[#173E3B] text-white border-[#173E3B] shadow-xs"
                      : "bg-[#FFFDFC] text-[#68706E] border-[#DED8CF] hover:border-[#173E3B]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

          </div>

          {/* LISTADO DE PRESUPUESTOS */}
          {loading ? (
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-12 rounded-2xl text-center shadow-xs">
              <p className="text-sm text-[#68706E] animate-pulse font-heading font-semibold">Cargando historial maestro de presupuestos...</p>
            </div>
          ) : presupuestosFiltrados.length === 0 ? (
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-12 rounded-2xl text-center space-y-3 shadow-xs">
              <FileText className="w-12 h-12 text-[#68706E]/60 mx-auto" />
              <p className="text-base text-[#173E3B] font-heading font-bold">No se encontraron presupuestos</p>
              <p className="text-xs text-[#68706E] font-sans max-w-md mx-auto">
                No hay presupuestos registrados que coincidan con la búsqueda o el filtro seleccionado.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {presupuestosFiltrados.map((p, idx) => {
                const isAceptado = p.estado === "Aceptado" || p.estado === "Aprobado";
                const isRechazado = p.estado === "Rechazado";
                const isCancelado = p.estado === "Eliminado" || p.estado === "Cancelado";

                const itemsList = p.items && p.items.length > 0 ? p.items : (p.producto ? [{ producto: p.producto, contado: p.contado || 0, cuotas: p.cuotas || 12, valorCuota: p.valorCuota }] : []);
                const totalCuota = itemsList.reduce((sum: number, it: any) => sum + (Number(it.valorCuota) || 0), 0);

                return (
                  <div
                    key={p.id + "_" + idx}
                    className="bg-[#FFFDFC] border border-[#DED8CF] hover:border-[#173E3B]/60 p-5 rounded-2xl transition-all shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    {/* Info Cliente y Fecha */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-heading font-bold text-[#B44E2A] font-mono bg-[#B44E2A]/10 px-2.5 py-0.5 rounded-md border border-[#B44E2A]/20">
                          N° {p.id ? p.id.replace("pres_", "").substring(0, 8).toUpperCase() : "S/D"}
                        </span>
                        
                        <span className={`text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                          isAceptado ? "bg-[#2F7D5C]/15 text-[#2F7D5C] border-[#2F7D5C]/30" :
                          isRechazado ? "bg-rose-100 text-rose-700 border-rose-200" :
                          isCancelado ? "bg-gray-100 text-[#68706E] border-gray-200" :
                          "bg-[#E7B86A]/20 text-[#8F6211] border-[#E7B86A]/50"
                        }`}>
                          {isAceptado ? "🟢 Aceptado" : isRechazado ? "🔴 Rechazado" : isCancelado ? "🗑️ Cancelado" : "🟡 Pendiente"}
                        </span>

                        <span className="text-xs text-[#68706E] font-sans">
                          {p.fechaObjeto ? p.fechaObjeto.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Fecha no disponible"}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-heading font-bold text-[#173E3B]">{p.clienteNombre}</h3>
                        <p className="text-xs text-[#68706E] font-sans mt-0.5">
                          DNI: <span className="font-mono font-bold text-[#1F2928]">{p.clienteDni}</span> | WhatsApp: <span className="font-mono text-[#1F2928]">{p.clienteWhatsapp}</span> | Localidad: <span className="text-[#1F2928]">{p.clienteLocalidad}</span>
                        </p>
                      </div>

                      {/* Listado de Productos / Opciones */}
                      <div className="pt-2 space-y-1.5">
                        {itemsList.map((it: any, itemIdx: number) => (
                          <div key={itemIdx} className="text-xs bg-[#F7F3EC] p-2.5 rounded-xl border border-[#DED8CF] flex items-center justify-between">
                            <div>
                              {itemsList.length > 1 && (
                                <span className="text-[9px] font-heading font-bold uppercase text-[#B44E2A] bg-[#B44E2A]/10 px-1.5 py-0.5 rounded border border-[#B44E2A]/20 mr-1.5">
                                  Opción {itemIdx + 1}
                                </span>
                              )}
                              <span className="font-heading font-bold text-[#173E3B]">{it.producto}</span>
                              <span className="text-[#68706E] ml-2 font-sans">({it.cuotas} cuotas de <strong className="text-[#2F7D5C] font-mono">${(it.valorCuota || 0).toLocaleString("es-AR")}</strong>)</span>
                            </div>
                            {it.costoProveedor > 0 && (
                              <span className="text-[10px] text-[#68706E] font-mono">
                                Prov: ${it.costoProveedor}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {p.notas && (
                        <p className="text-xs text-[#68706E] font-sans italic pt-1">
                          Notas: {p.notas}
                        </p>
                      )}
                    </div>

                    {/* Resumen Financiero y Acciones */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 flex-shrink-0 w-full md:w-auto border-t md:border-t-0 border-[#DED8CF] pt-3 md:pt-0">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] text-[#68706E] font-heading uppercase tracking-wider font-bold block">Cuota Mensual Total</span>
                        <span className="text-xl font-heading font-extrabold text-[#173E3B] font-mono">
                          ${totalCuota.toLocaleString("es-AR")} <span className="text-xs font-normal text-[#68706E] font-sans">/ mes</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleDescargarPdf(p)}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#FFFDFC] hover:bg-[#F7F3EC] text-[#B44E2A] border border-[#DED8CF] hover:border-[#B44E2A] px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition-all shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>

                        <Link
                          href={`/admin/validaciones`}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-[#173E3B] hover:bg-[#123230] text-white px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition-all shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Legajo
                        </Link>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </AdminProtectedRoute>
  );
}
