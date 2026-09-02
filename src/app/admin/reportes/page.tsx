"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { descargarCsvExcel, copiarParaGoogleSheets, ExportColumn } from "@/lib/csvExporter";
import { FileSpreadsheet, Download, Copy, Search, ArrowLeft, DollarSign, Truck, Users, CheckCircle2, ShieldCheck } from "lucide-react";

export default function ReportesPage() {
  const [tabActiva, setTabActiva] = useState<"cobros" | "fletes" | "comisiones">("cobros");
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState<string>("");
  const [copiado, setCopiado] = useState(false);

  // Estados para las 3 planillas
  const [listaCobros, setListaCobros] = useState<any[]>([]);
  const [listaFletes, setListaFletes] = useState<any[]>([]);
  const [listaComisiones, setListaComisiones] = useState<any[]>([]);

  const fetchDatosReportes = async () => {
    setLoading(true);
    try {
      // 1. FETCH COBROS DE CUOTAS
      const cobrosArr: any[] = [];
      const snapSols = await getDocs(collection(db, "solicitudes"));
      snapSols.forEach((d) => {
        const solData = d.data();
        const clienteNom = solData.datosPersonales?.nombreCompleto || solData.nombreCompleto || solData.nombre || "Cliente Sin Nombre";
        const clienteDni = solData.datosPersonales?.numeroDni || solData.numeroDni || solData.dni || "-";
        const legajoRef = solData.nroContrato || `CH-${d.id.substring(0, 8).toUpperCase()}`;

        const planPagos = solData.planPagos || [];
        planPagos.forEach((c: any) => {
          if (c.estado === "PAGADO" || c.montoAbonado > 0) {
            const mAbonado = Number(c.montoAbonado || c.montoOriginal || 0);
            const mExento = c.montoExento !== undefined ? Number(c.montoExento) : Math.round(mAbonado * 0.70);
            const mGravado = Math.max(0, mAbonado - mExento);
            const nGravado = Math.round(mGravado / 1.21);
            const iva21 = Math.max(0, mGravado - nGravado);

            cobrosArr.push({
              id: `${d.id}_cuota_${c.numero}`,
              reciboNo: c.nroRecibo || `REC-${d.id.substring(0, 6).toUpperCase()}-${c.numero}`,
              fecha: c.fechaPago ? c.fechaPago.split("T")[0] : (c.vencimiento ? c.vencimiento.split("T")[0] : new Date().toISOString().split("T")[0]),
              clienteNombre: clienteNom,
              clienteDni: clienteDni,
              contratoLegajo: legajoRef,
              cuotaNo: `${c.numero}/${solData.planElegido || 12}`,
              montoAbonado: mAbonado,
              montoExento: mExento,
              montoGravado: mGravado,
              netoGravado: nGravado,
              iva21: iva21,
              metodoPago: c.metodoPago || "Efectivo / Transferencia",
              nroComprobante: c.comprobanteUrl || c.nroComprobante || "N/A",
              cuentaDestino: c.cuentaDestino || "Cta. Empresa",
              afiliadoEmail: solData.afiliadoEmail || "Directo"
            });
          }
        });
      });

      // Ordenar cobros por fecha (más recientes primero)
      cobrosArr.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setListaCobros(cobrosArr);

      // 2. FETCH GASTOS DE FLETE Y LOGÍSTICA
      const fletesArr: any[] = [];
      snapSols.forEach((d) => {
        const solData = d.data();
        if (solData.estadoEntrega === "ENTREGADO" || solData.costoFlete || solData.sucursalDestino || solData.solicitudFlete) {
          const clienteNom = solData.datosPersonales?.nombreCompleto || solData.nombreCompleto || solData.nombre || "Cliente";
          const clienteDni = solData.datosPersonales?.numeroDni || solData.numeroDni || solData.dni || "-";
          const legajoRef = solData.nroContrato || `REMITO-${d.id.substring(0, 8).toUpperCase()}`;

          fletesArr.push({
            id: d.id,
            remitoNo: legajoRef,
            fecha: solData.fechaEntrega ? solData.fechaEntrega.split("T")[0] : (solData.fechaCreacion ? new Date(solData.fechaCreacion.seconds * 1000).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]),
            clienteNombre: clienteNom,
            clienteDni: clienteDni,
            origen: "Caracas 1101, CABA",
            destino: solData.datosPersonales?.direccion || solData.direccion || solData.sucursalDestino || solData.localidad || "Interior",
            mercaderia: solData.productoDeseado || solData.productoNombre || "Electrodomésticos / Carga General",
            costoFlete: Number(solData.costoFlete || solData.precioFlete || 0),
            estadoEntrega: solData.estadoEntrega || "ENTREGADO",
            fletero: solData.fleteroAsignado || solData.afiliadoEmail || "Flota Propia Cuenta Hogar"
          });
        }
      });

      fletesArr.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setListaFletes(fletesArr);

      // 3. FETCH PAGO DE COMISIONES A AFILIADOS
      const comisionesArr: any[] = [];
      const snapComisiones = await getDocs(collection(db, "liquidaciones_comisiones"));
      snapComisiones.forEach((d) => {
        const comData = d.data();
        comisionesArr.push({
          id: d.id,
          nroLiquidacion: `LIQ-${d.id.substring(0, 8).toUpperCase()}`,
          fechaPago: comData.fechaPago ? comData.fechaPago.split("T")[0] : (comData.fecha ? comData.fecha.split("T")[0] : new Date().toISOString().split("T")[0]),
          afiliadoNombre: comData.afiliadoNombre || comData.afiliadoEmail || "Asesor",
          afiliadoEmail: comData.afiliadoEmail || "vendedor@cuenta-hogar.com",
          clienteReferido: comData.clienteNombre || comData.cliente || "Cliente Referido",
          clienteDni: comData.clienteDni || "-",
          contratoRef: comData.nroContrato || "S/D",
          montoVenta: Number(comData.montoVenta || 0),
          comisionPagada: Number(comData.montoComision || comData.comision || 0),
          metodoLiquidacion: comData.metodoPago || "Transferencia Bancaria",
          nroComprobante: comData.nroComprobante || "N/A"
        });
      });

      // Si la colección de liquidaciones está vacía, derivar comisiones de las solicitudes entregadas
      if (comisionesArr.length === 0) {
        snapSols.forEach((d) => {
          const solData = d.data();
          if (solData.afiliadoEmail && solData.afiliadoEmail !== "Directo" && (solData.montoAbonado > 0 || solData.estadoEntrega === "ENTREGADO")) {
            const clienteNom = solData.datosPersonales?.nombreCompleto || solData.nombreCompleto || "Cliente Referido";
            const clienteDni = solData.datosPersonales?.numeroDni || solData.numeroDni || "-";
            const legajoRef = solData.nroContrato || `CH-${d.id.substring(0, 8).toUpperCase()}`;
            const mVenta = Number(solData.montoCuota || solData.montoAbonado || 0) * (Number(solData.planElegido) || 12);
            const comisionEstimada = Math.round(mVenta * 0.05); // 5% de comisión estándar

            comisionesArr.push({
              id: d.id,
              nroLiquidacion: `LIQ-EST-${d.id.substring(0, 6).toUpperCase()}`,
              fechaPago: solData.fechaEntrega ? solData.fechaEntrega.split("T")[0] : new Date().toISOString().split("T")[0],
              afiliadoNombre: solData.afiliadoEmail,
              afiliadoEmail: solData.afiliadoEmail,
              clienteReferido: clienteNom,
              clienteDni: clienteDni,
              contratoRef: legajoRef,
              montoVenta: mVenta,
              comisionPagada: comisionEstimada,
              metodoLiquidacion: "Liquidación por Venta Entregada",
              nroComprobante: "AUTO-LIQ"
            });
          }
        });
      }

      comisionesArr.sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
      setListaComisiones(comisionesArr);

    } catch (e) {
      console.error("Error al cargar reportes financieros:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatosReportes();
  }, []);

  // DEFINICIÓN DE COLUMNAS DE EXPORTACIÓN A EXCEL Y GOOGLE SHEETS
  const columnasCobros: ExportColumn[] = [
    { header: "Fecha Cobro", key: "fecha" },
    { header: "Recibo N°", key: "reciboNo" },
    { header: "Cliente", key: "clienteNombre" },
    { header: "DNI", key: "clienteDni" },
    { header: "Legajo / Contrato", key: "contratoLegajo" },
    { header: "Cuota N°", key: "cuotaNo" },
    { header: "Total Abonado ($)", key: "montoAbonado", formatter: (v) => `$${Number(v || 0).toLocaleString("es-AR")}` },
    { header: "Recupero Capital Exento ($)", key: "montoExento", formatter: (v) => `$${Number(v || 0).toLocaleString("es-AR")}` },
    { header: "Honorarios Gravados ($)", key: "montoGravado", formatter: (v) => `$${Number(v || 0).toLocaleString("es-AR")}` },
    { header: "Base Neta ($)", key: "netoGravado", formatter: (v) => `$${Number(v || 0).toLocaleString("es-AR")}` },
    { header: "Débito Fiscal IVA 21% ($)", key: "iva21", formatter: (v) => `$${Number(v || 0).toLocaleString("es-AR")}` },
    { header: "Método Pago", key: "metodoPago" },
    { header: "N° Transacción", key: "nroComprobante" },
    { header: "Cuenta Destino", key: "cuentaDestino" },
    { header: "Afiliado / Asesor", key: "afiliadoEmail" }
  ];

  const columnasFletes: ExportColumn[] = [
    { header: "Fecha Remito", key: "fecha" },
    { header: "Remito N°", key: "remitoNo" },
    { header: "Cliente", key: "clienteNombre" },
    { header: "DNI", key: "clienteDni" },
    { header: "Origen", key: "origen" },
    { header: "Destino", key: "destino" },
    { header: "Mercadería / Carga", key: "mercaderia" },
    { header: "Costo Flete ($)", key: "costoFlete", formatter: (v) => `$${Number(v || 0).toLocaleString("es-AR")}` },
    { header: "Estado Entrega", key: "estadoEntrega" },
    { header: "Fletero / Asignado", key: "fletero" }
  ];

  const columnasComisiones: ExportColumn[] = [
    { header: "Fecha Pago", key: "fechaPago" },
    { header: "N° Liquidación", key: "nroLiquidacion" },
    { header: "Afiliado / Asesor", key: "afiliadoNombre" },
    { header: "Email Afiliado", key: "afiliadoEmail" },
    { header: "Cliente Referido", key: "clienteReferido" },
    { header: "DNI Cliente", key: "clienteDni" },
    { header: "N° Contrato", key: "contratoRef" },
    { header: "Monto Venta ($)", key: "montoVenta", formatter: (v) => `$${Number(v || 0).toLocaleString("es-AR")}` },
    { header: "Comisión Pagada ($)", key: "comisionPagada", formatter: (v) => `$${Number(v || 0).toLocaleString("es-AR")}` },
    { header: "Método Liquidación", key: "metodoLiquidacion" },
    { header: "N° Comprobante", key: "nroComprobante" }
  ];

  // FILTRADO POR BÚSQUEDA
  const qClean = busqueda.toLowerCase().trim();

  const cobrosFiltrados = listaCobros.filter((c) => {
    if (!qClean) return true;
    return (
      (c.clienteNombre || "").toLowerCase().includes(qClean) ||
      (c.clienteDni || "").toString().includes(qClean) ||
      (c.reciboNo || "").toLowerCase().includes(qClean) ||
      (c.contratoLegajo || "").toLowerCase().includes(qClean)
    );
  });

  const fletesFiltrados = listaFletes.filter((f) => {
    if (!qClean) return true;
    return (
      (f.clienteNombre || "").toLowerCase().includes(qClean) ||
      (f.clienteDni || "").toString().includes(qClean) ||
      (f.destino || "").toLowerCase().includes(qClean) ||
      (f.remitoNo || "").toLowerCase().includes(qClean)
    );
  });

  const comisionesFiltradas = listaComisiones.filter((m) => {
    if (!qClean) return true;
    return (
      (m.afiliadoNombre || "").toLowerCase().includes(qClean) ||
      (m.clienteReferido || "").toLowerCase().includes(qClean) ||
      (m.nroLiquidacion || "").toLowerCase().includes(qClean) ||
      (m.contratoRef || "").toLowerCase().includes(qClean)
    );
  });

  // HANDLERS DE EXPORTACIÓN
  const handleDescargarExcel = () => {
    if (tabActiva === "cobros") {
      descargarCsvExcel("Registro_Maestro_Cobros_Cuotas", columnasCobros, cobrosFiltrados);
    } else if (tabActiva === "fletes") {
      descargarCsvExcel("Registro_Gastos_Flete_Logistica", columnasFletes, fletesFiltrados);
    } else {
      descargarCsvExcel("Registro_Pago_Comisiones_Afiliados", columnasComisiones, comisionesFiltradas);
    }
  };

  const handleCopiarSheets = async () => {
    let ok = false;
    if (tabActiva === "cobros") {
      ok = await copiarParaGoogleSheets(columnasCobros, cobrosFiltrados);
    } else if (tabActiva === "fletes") {
      ok = await copiarParaGoogleSheets(columnasFletes, fletesFiltrados);
    } else {
      ok = await copiarParaGoogleSheets(columnasComisiones, comisionesFiltradas);
    }

    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  // CÁLCULOS KPI
  const totalCobrado = cobrosFiltrados.reduce((sum, c) => sum + (c.montoAbonado || 0), 0);
  const totalFletes = fletesFiltrados.reduce((sum, f) => sum + (f.costoFlete || 0), 0);
  const totalComisiones = comisionesFiltradas.reduce((sum, m) => sum + (m.comisionPagada || 0), 0);

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#121316] text-zinc-100 p-4 md:p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#181920] border border-zinc-800 p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-[#fe5000] to-amber-500">
                  Reportes y Planillas Financieras
                </h1>
                <p className="text-xs text-zinc-400 font-medium mt-0.5">
                  Planillas contables descargables en Excel y compatibles con Google Sheets (Cobros, Fletes y Comisiones)
                </p>
              </div>
            </div>

            {/* BOTONES DE EXPORTACIÓN */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <button
                onClick={handleDescargarExcel}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Descargar Excel (.CSV)
              </button>
              <button
                onClick={handleCopiarSheets}
                className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {copiado ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiado ? "¡Copiado para Google Sheets!" : "📋 Copiar p/ Google Sheets"}
              </button>
            </div>
          </div>

          {/* TARJETAS DE NAVEGACIÓN Y SELECCIÓN DE PLANILLA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* TAB 1: COBROS */}
            <button
              onClick={() => setTabActiva("cobros")}
              className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                tabActiva === "cobros"
                  ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10"
                  : "bg-[#181920] border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase">Planilla 1</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cobros de Cuotas</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Registro contable de cobranzas de clientes</p>
                <p className="text-lg font-black text-amber-400 font-mono mt-2">
                  ${totalCobrado.toLocaleString("es-AR")} <span className="text-xs font-normal text-zinc-500">({cobrosFiltrados.length} reg.)</span>
                </p>
              </div>
            </button>

            {/* TAB 2: FLETES */}
            <button
              onClick={() => setTabActiva("fletes")}
              className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                tabActiva === "fletes"
                  ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10"
                  : "bg-[#181920] border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Truck className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase">Planilla 2</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Gastos de Fletes y Logística</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Control de costos de viajes y despachos</p>
                <p className="text-lg font-black text-blue-400 font-mono mt-2">
                  ${totalFletes.toLocaleString("es-AR")} <span className="text-xs font-normal text-zinc-500">({fletesFiltrados.length} reg.)</span>
                </p>
              </div>
            </button>

            {/* TAB 3: COMISIONES */}
            <button
              onClick={() => setTabActiva("comisiones")}
              className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                tabActiva === "comisiones"
                  ? "bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10"
                  : "bg-[#181920] border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Planilla 3</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Pago de Comisiones</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Liquidaciones a vendedores y afiliados</p>
                <p className="text-lg font-black text-emerald-400 font-mono mt-2">
                  ${totalComisiones.toLocaleString("es-AR")} <span className="text-xs font-normal text-zinc-500">({comisionesFiltradas.length} reg.)</span>
                </p>
              </div>
            </button>

          </div>

          {/* BUSCADOR */}
          <div className="bg-[#181920] border border-zinc-800 p-4 rounded-2xl shadow-lg">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por Cliente, DNI, Recibo N°, Remito N°, Afiliado o Contrato..."
                className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-500 outline-none focus:border-[#fe5000] transition"
              />
            </div>
          </div>

          {/* TABLA DINÁMICA DE LA PLANILLA SELECCIONADA */}
          {loading ? (
            <div className="bg-[#181920] border border-zinc-800 p-12 rounded-3xl text-center">
              <p className="text-sm text-zinc-400 animate-pulse font-medium">Cargando datos contables e historial de registros...</p>
            </div>
          ) : (
            <div className="bg-[#181920] border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
              
              {/* VISTA PLANILLA 1: COBROS */}
              {tabActiva === "cobros" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                      <tr>
                        <th className="p-4">Fecha</th>
                        <th className="p-4">Recibo N°</th>
                        <th className="p-4">Cliente / DNI</th>
                        <th className="p-4">Legajo</th>
                        <th className="p-4">Cuota</th>
                        <th className="p-4 text-right">Total Abonado</th>
                        <th className="p-4 text-right">Capital Exento</th>
                        <th className="p-4 text-right">Honorarios Grav.</th>
                        <th className="p-4 text-right">IVA 21%</th>
                        <th className="p-4">Medio Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 text-zinc-300">
                      {cobrosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-zinc-500">No se encontraron registros de cobros.</td>
                        </tr>
                      ) : (
                        cobrosFiltrados.map((c) => (
                          <tr key={c.id} className="hover:bg-zinc-900/50 transition">
                            <td className="p-4 font-mono">{c.fecha}</td>
                            <td className="p-4 font-mono font-bold text-amber-400">{c.reciboNo}</td>
                            <td className="p-4">
                              <span className="font-bold text-white block">{c.clienteNombre}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">DNI: {c.clienteDni}</span>
                            </td>
                            <td className="p-4 font-mono text-zinc-400">{c.contratoLegajo}</td>
                            <td className="p-4 font-bold text-white">{c.cuotaNo}</td>
                            <td className="p-4 text-right font-mono font-bold text-amber-400">${c.montoAbonado.toLocaleString("es-AR")}</td>
                            <td className="p-4 text-right font-mono text-emerald-400">${c.montoExento.toLocaleString("es-AR")}</td>
                            <td className="p-4 text-right font-mono text-blue-400">${c.montoGravado.toLocaleString("es-AR")}</td>
                            <td className="p-4 text-right font-mono text-cyan-300">${c.iva21.toLocaleString("es-AR")}</td>
                            <td className="p-4 text-zinc-400">{c.metodoPago}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VISTA PLANILLA 2: FLETES */}
              {tabActiva === "fletes" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                      <tr>
                        <th className="p-4">Fecha Remito</th>
                        <th className="p-4">Remito N°</th>
                        <th className="p-4">Cliente / DNI</th>
                        <th className="p-4">Origen / Destino</th>
                        <th className="p-4">Mercadería</th>
                        <th className="p-4 text-right">Costo Flete</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4">Fletero / Transportista</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 text-zinc-300">
                      {fletesFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-zinc-500">No se encontraron registros de fletes.</td>
                        </tr>
                      ) : (
                        fletesFiltrados.map((f) => (
                          <tr key={f.id} className="hover:bg-zinc-900/50 transition">
                            <td className="p-4 font-mono">{f.fecha}</td>
                            <td className="p-4 font-mono font-bold text-blue-400">{f.remitoNo}</td>
                            <td className="p-4">
                              <span className="font-bold text-white block">{f.clienteNombre}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">DNI: {f.clienteDni}</span>
                            </td>
                            <td className="p-4">
                              <span className="text-zinc-400 block text-[11px]">{f.origen}</span>
                              <span className="font-bold text-white block">➔ {f.destino}</span>
                            </td>
                            <td className="p-4 text-zinc-300 font-medium">{f.mercaderia}</td>
                            <td className="p-4 text-right font-mono font-bold text-blue-400">${f.costoFlete.toLocaleString("es-AR")}</td>
                            <td className="p-4">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {f.estadoEntrega}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-400">{f.fletero}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VISTA PLANILLA 3: COMISIONES */}
              {tabActiva === "comisiones" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                      <tr>
                        <th className="p-4">Fecha Pago</th>
                        <th className="p-4">N° Liquidación</th>
                        <th className="p-4">Afiliado / Asesor</th>
                        <th className="p-4">Cliente Referido</th>
                        <th className="p-4">N° Contrato</th>
                        <th className="p-4 text-right">Monto Venta</th>
                        <th className="p-4 text-right">Comisión Pagada</th>
                        <th className="p-4">Método Liquidación</th>
                        <th className="p-4">N° Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 text-zinc-300">
                      {comisionesFiltradas.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-zinc-500">No se encontraron registros de comisiones.</td>
                        </tr>
                      ) : (
                        comisionesFiltradas.map((m) => (
                          <tr key={m.id} className="hover:bg-zinc-900/50 transition">
                            <td className="p-4 font-mono">{m.fechaPago}</td>
                            <td className="p-4 font-mono font-bold text-emerald-400">{m.nroLiquidacion}</td>
                            <td className="p-4">
                              <span className="font-bold text-white block">{m.afiliadoNombre}</span>
                              <span className="text-[10px] text-zinc-500">{m.afiliadoEmail}</span>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-zinc-200 block">{m.clienteReferido}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">DNI: {m.clienteDni}</span>
                            </td>
                            <td className="p-4 font-mono text-zinc-400">{m.contratoRef}</td>
                            <td className="p-4 text-right font-mono font-bold text-zinc-300">${m.montoVenta.toLocaleString("es-AR")}</td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-400">${m.comisionPagada.toLocaleString("es-AR")}</td>
                            <td className="p-4 text-zinc-400">{m.metodoLiquidacion}</td>
                            <td className="p-4 font-mono text-zinc-400">{m.nroComprobante}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </AdminProtectedRoute>
  );
}
