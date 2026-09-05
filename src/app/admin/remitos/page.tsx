"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, getDoc, onSnapshot, query, orderBy, deleteDoc, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Search, Filter, Calendar, User, FileText, Download, Trash2, ChevronRight, Truck, CheckCircle2, Package, Sparkles } from "lucide-react";
import { generarRemitoTipoR, generarRemitoModelo, DatosEmpresaRemito } from "@/lib/pdfGenerator";

export default function RemitosAdminPage() {
  const { user } = useAuth();
  const [remitos, setRemitos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "REMITO_TIPO_R" | "REMITO_TRASLADO">("TODOS");

  // Configuración de Datos de Empresa para Remitos
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState<DatosEmpresaRemito>({
    razonSocial: "LOOP GESTIÓN INTEGRAL S.R.L.",
    nombreFantasia: "Cuenta Hogar",
    domicilioFiscal: "Caracas 1101, CABA",
    cuit: "30-71829384-9",
    condicionIva: "RESP. INSCRIPTO",
    iibb: "30-71829384-9",
    fechaInicioActividades: "01/09/2018",
    emailContacto: "administracion@cuentahogar.com",
    telefonoContacto: "+54 9 11 3013-7724"
  });

  const fetchConfigEmpresa = async () => {
    try {
      const docRef = doc(db, "configuraciones", "empresa_remitos");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setEmpresaConfig(snap.data() as DatosEmpresaRemito);
      }
    } catch (e) {
      console.error("Error al cargar configuración de empresa remitos:", e);
    }
  };

  const handleGuardarConfigEmpresa = async () => {
    setGuardandoConfig(true);
    try {
      await setDoc(doc(db, "configuraciones", "empresa_remitos"), empresaConfig);
      alert("✅ Configuración de empresa para Remitos guardada exitosamente.");
      setShowConfigModal(false);
    } catch (e: any) {
      console.error("Error al guardar configuración:", e);
      alert("Error al guardar la configuración: " + (e.message || e.toString()));
    } finally {
      setGuardandoConfig(false);
    }
  };

  // Fetch Remitos from Firestore
  const fetchRemitos = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "remitos"));
      const snap = await getDocs(q);
      const data: any[] = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() });
      });
      data.sort((a, b) => {
        const timeA = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : new Date(a.fechaEmision || 0).getTime();
        const timeB = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : new Date(b.fechaEmision || 0).getTime();
        return timeB - timeA;
      });
      setRemitos(data);
    } catch (err) {
      console.error("Error al cargar remitos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRemitos();
    fetchConfigEmpresa();

    const q = query(collection(db, "remitos"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data: any[] = [];
      snap.forEach(d => {
        data.push({ id: d.id, ...d.data() });
      });
      data.sort((a, b) => {
        const timeA = a.fechaCreacion?.toMillis ? a.fechaCreacion.toMillis() : new Date(a.fechaEmision || 0).getTime();
        const timeB = b.fechaCreacion?.toMillis ? b.fechaCreacion.toMillis() : new Date(b.fechaEmision || 0).getTime();
        return timeB - timeA;
      });
      setRemitos(data);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to remitos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const remitosFiltrados = useMemo(() => {
    return remitos.filter(item => {
      const queryStr = busqueda.toLowerCase().trim();
      const nroMatch = (item.nroRemito || "").toLowerCase().includes(queryStr);
      const clienteMatch = (item.clienteNombre || "").toLowerCase().includes(queryStr);
      const dniMatch = (item.clienteDni || "").toLowerCase().includes(queryStr);
      const prodMatch = (item.productoDescripcion || item.productoNombre || "").toLowerCase().includes(queryStr);
      const contratoMatch = (item.nroContratoInterno || "").toLowerCase().includes(queryStr);
      const provMatch = (item.facturaProveedorOriginal || "").toLowerCase().includes(queryStr);

      const matchesSearch = !queryStr || nroMatch || clienteMatch || dniMatch || prodMatch || contratoMatch || provMatch;

      const isTipoR = item.tipoRemito === "REMITO_TIPO_R" || !item.tipoRemito;
      const matchesTipo = 
        filtroTipo === "TODOS" ? true :
        filtroTipo === "REMITO_TIPO_R" ? isTipoR :
        !isTipoR;

      return matchesSearch && matchesTipo;
    });
  }, [remitos, busqueda, filtroTipo]);

  const totalRemitos = remitos.length;
  const remitosTipoR = remitos.filter(r => r.tipoRemito === "REMITO_TIPO_R" || !r.tipoRemito).length;
  const remitosTraslado = totalRemitos - remitosTipoR;

  const handleRedescargarPDF = (item: any) => {
    if (item.tipoRemito === "REMITO_TIPO_R" || !item.tipoRemito) {
      generarRemitoTipoR({
        empresaConfig,
        codigoProducto: item.codigoProducto || "",
        nroRemito: item.nroRemito || "0001-00000001",
        fechaEmision: item.fechaEmision || new Date().toLocaleDateString("es-AR"),
        nroContratoInterno: item.nroContratoInterno || "CH-202608-00000000-01",
        facturaProveedorOriginal: item.facturaProveedorOriginal || "",
        clienteNombre: item.clienteNombre || "Cliente Titular",
        clienteDni: item.clienteDni || "",
        clienteDomicilio: item.clienteDomicilio || "Domicilio Registrado",
        clienteTelefono: item.clienteTelefono || "",
        productoDescripcion: item.productoDescripcion || item.productoNombre || "Producto",
        nserie: item.nserie || "",
        cantidad: item.cantidad || 1
      });
    } else {
      generarRemitoModelo({
        nroRemito: item.nroRemito || "R-000000",
        fecha: item.fechaEmision || new Date().toLocaleDateString("es-AR"),
        clienteNombre: item.clienteNombre || "",
        clienteDni: item.clienteDni || "",
        clienteDireccion: item.clienteDomicilio || "",
        clienteTelefono: item.clienteTelefono || "",
        productoNombre: item.productoDescripcion || item.productoNombre || "",
        nserie: item.nserie || "",
        origen: item.sucursalOrigen || "Depósito Central",
        destino: item.sucursalDestino || "Lincoln",
        afiliadoEmail: item.afiliadoEmail || ""
      });
    }
  };

  const handleEliminarRemito = async (id: string, nro: string) => {
    const confirm = window.confirm(`¿Estás seguro de anular/eliminar el registro del Remito N° ${nro}?`);
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, "remitos", id));
      alert(`Remito N° ${nro} eliminado exitosamente del registro.`);
    } catch (err: any) {
      console.error(err);
      alert("Error al eliminar el remito: " + err.message);
    }
  };

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#FFFDFC] p-6 rounded-3xl border border-[#DED8CF] shadow-xs">
            <div className="flex items-center gap-4">
              <div className="bg-[#fe5000]/10 border border-[#fe5000]/30 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                📜
              </div>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  Gestión de Remitos Emitidos
                </h1>
                <p className="text-xs text-[#68706E]">
                  Registro histórico centralizado de comprobantes de traslado y mandato logístico.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <Link href="/admin" className="bg-[#121316] hover:bg-[#F7F3EC] text-[#1F2928] px-3 py-2 rounded-xl border border-[#DED8CF] transition">
                🏠 Menú Admin
              </Link>
              <Link href="/admin/validaciones" className="bg-[#121316] hover:bg-[#F7F3EC] text-blue-400 px-3 py-2 rounded-xl border border-[#DED8CF] transition">
                📥 Validaciones
              </Link>
              <Link href="/admin/cartera" className="bg-[#121316] hover:bg-[#F7F3EC] text-purple-400 px-3 py-2 rounded-xl border border-[#DED8CF] transition">
                📈 Cartera
              </Link>
              <Link href="/admin/comisiones" className="bg-[#121316] hover:bg-[#F7F3EC] text-[#B44E2A] px-3 py-2 rounded-xl border border-[#DED8CF] transition">
                💰 Comisiones
              </Link>
              <Link href="/admin/productos" className="bg-[#121316] hover:bg-[#F7F3EC] text-[#B44E2A] px-3 py-2 rounded-xl border border-[#DED8CF] transition">
                ⚡ Productos
              </Link>
              <Link href="/admin/rendiciones" className="bg-[#121316] hover:bg-[#F7F3EC] text-[#2F7D5C] px-3 py-2 rounded-xl border border-[#DED8CF] transition">
                💸 Rendiciones
              </Link>
              <button
                onClick={() => setShowConfigModal(true)}
                className="bg-[#fe5000] hover:bg-[#fe5000]/90 text-white px-3.5 py-2 rounded-xl border border-[#fe5000]/40 font-black flex items-center gap-1.5 transition shadow-xs shadow-[#fe5000]/20 active:scale-95"
              >
                ⚙️ Configuración
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-5 rounded-2xl shadow-md flex items-center gap-4">
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-[#B44E2A] text-xl font-bold">
                📜
              </div>
              <div>
                <p className="text-[10px] text-[#68706E] font-bold uppercase">Total de Remitos Emitidos</p>
                <p className="text-2xl font-black text-white mt-0.5">{totalRemitos}</p>
              </div>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-5 rounded-2xl shadow-md flex items-center gap-4">
              <div className="bg-[#fe5000]/10 border border-[#fe5000]/30 p-3 rounded-xl text-[#B44E2A] text-xl font-bold">
                🚚
              </div>
              <div>
                <p className="text-[10px] text-[#68706E] font-bold uppercase">Remitos Tipo R (Mandato)</p>
                <p className="text-2xl font-black text-[#B44E2A] mt-0.5">{remitosTipoR}</p>
              </div>
            </div>

            <div className="bg-[#FFFDFC] border border-[#DED8CF] p-5 rounded-2xl shadow-md flex items-center gap-4">
              <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl text-blue-400 text-xl font-bold">
                📦
              </div>
              <div>
                <p className="text-[10px] text-[#68706E] font-bold uppercase">Traslados Internos</p>
                <p className="text-2xl font-black text-blue-400 mt-0.5">{remitosTraslado}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#FFFDFC] p-4 rounded-2xl border border-[#DED8CF] shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#68706E]" />
              <input
                type="text"
                placeholder="Buscar por N° Remito, Cliente, DNI, Producto, Contrato..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-[#121316] border border-[#DED8CF] pl-10 pr-4 py-2.5 rounded-xl text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500 font-bold transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-[#68706E] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#B44E2A]" /> Tipo:
              </span>
              <select
                value={filtroTipo}
                onChange={(e: any) => setFiltroTipo(e.target.value)}
                className="bg-[#121316] border border-[#DED8CF] text-white font-bold text-xs p-2.5 rounded-xl outline-none focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="TODOS">Todos los Remitos ({totalRemitos})</option>
                <option value="REMITO_TIPO_R">📜 Remito Tipo R (Mandato Comercial)</option>
                <option value="REMITO_TRASLADO">🚚 Traslado Interno</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl p-12 text-center text-[#68706E] font-bold flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              Cargando historial de remitos...
            </div>
          ) : remitosFiltrados.length === 0 ? (
            <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl p-12 text-center space-y-3">
              <div className="text-4xl">📜</div>
              <h3 className="text-lg font-black text-white">No se encontraron remitos registrados</h3>
              <p className="text-xs text-[#68706E]">
                {busqueda ? "Intenta ajustar la búsqueda o limpiar los filtros." : "Los remitos generados en las solicitudes aparecerán automáticamente aquí."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {remitosFiltrados.map((item) => {
                const isTipoR = item.tipoRemito === "REMITO_TIPO_R" || !item.tipoRemito;

                return (
                  <div key={item.id} className="bg-[#FFFDFC] border border-[#DED8CF] rounded-2xl p-5 shadow-xs space-y-4 transition-all hover:border-[#DED8CF]">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#DED8CF] pb-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-[#121316] border border-amber-500/40 text-amber-300 font-mono font-black text-sm px-3 py-1.5 rounded-xl shadow-inner">
                          📜 {item.nroRemito || "0001-00000000"}
                        </span>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isTipoR ? "bg-[#fe5000]/20 text-[#B44E2A] border border-[#fe5000]/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}>
                          {isTipoR ? "📜 REMITO TIPO R (MANDATO)" : "🚚 TRASLADO INTERNO"}
                        </span>
                      </div>

                      <div className="text-xs text-[#68706E] flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#68706E]" />
                        <span>Fecha: <strong className="text-white">{item.fechaEmision || "Reciente"}</strong></span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      
                      <div className="bg-[#121316] p-3 rounded-xl border border-[#DED8CF] space-y-1">
                        <p className="text-[10px] text-[#68706E] font-bold uppercase">👤 Cliente Titular</p>
                        <p className="text-white font-bold truncate">{item.clienteNombre || "Sin Nombre"}</p>
                        <p className="text-[#68706E] font-mono text-[10px]">DNI: {item.clienteDni || "N/A"}</p>
                        <p className="text-[#68706E] text-[10px] truncate" title={item.clienteDomicilio}>{item.clienteDomicilio || "Sin domicilio"}</p>
                      </div>

                      <div className="bg-[#121316] p-3 rounded-xl border border-[#DED8CF] space-y-1">
                        <p className="text-[10px] text-[#68706E] font-bold uppercase">📦 Producto / Bulto</p>
                        <p className="text-[#B44E2A] font-bold truncate">{item.productoDescripcion || item.productoNombre || "Producto General"}</p>
                        <p className="text-[#68706E] font-mono text-[10px]">IMEI/Serie: {item.nserie || "Sin IMEI"}</p>
                        <p className="text-[#68706E] text-[10px]">Cantidad: <strong>{item.cantidad || 1}</strong></p>
                      </div>

                      <div className="bg-[#121316] p-3 rounded-xl border border-[#DED8CF] space-y-1">
                        <p className="text-[10px] text-[#68706E] font-bold uppercase">🧾 Ref. Origen / Ticket</p>
                        <p className="text-[#1F2928] font-bold text-[11px] truncate" title={item.facturaProveedorOriginal}>
                          {item.facturaProveedorOriginal || "S/N Ticket Proveedor"}
                        </p>
                        <p className="text-[#68706E] text-[10px]">Origen: {item.sucursalOrigen || "Depósito Central"}</p>
                      </div>

                      <div className="bg-[#121316] p-3 rounded-xl border border-[#DED8CF] space-y-1">
                        <p className="text-[10px] text-[#68706E] font-bold uppercase">📜 Contrato Asociado</p>
                        <p className="text-amber-300 font-mono font-bold text-xs truncate">
                          {item.nroContratoInterno || "Sin número registrado"}
                        </p>
                        <p className="text-[#68706E] text-[10px]">Emisor: Loop Gestión Integral SRL</p>
                      </div>

                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-[#DED8CF]">
                      <button
                        onClick={() => handleEliminarRemito(item.id, item.nroRemito)}
                        className="text-[#68706E] hover:text-red-400 text-xs font-bold flex items-center gap-1 hover:underline transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Anular Remito
                      </button>

                      <button
                        onClick={() => handleRedescargarPDF(item)}
                        className="bg-[#fe5000] hover:bg-[#fe5000]/90 text-white font-black text-xs px-4 py-2 rounded-xl shadow-md uppercase tracking-wider flex items-center gap-2 transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Re-Descargar Remito PDF
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* MODAL CONFIGURACIÓN DE EMPRESA PARA REMITOS */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-[#1F2928]/60 backdrop-blur-sm backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#FFFDFC] border border-[#DED8CF] rounded-3xl p-6 max-w-2xl w-full space-y-6 shadow-xs max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[#DED8CF] pb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-[#fe5000]/10 p-2 rounded-xl text-[#B44E2A] text-xl font-bold">⚙️</div>
                  <div>
                    <h3 className="text-lg font-black text-white">Configuración del Encabezado de Remitos</h3>
                    <p className="text-xs text-[#68706E]">Personalizá los datos institucionales y fiscales impresos en los Remitos (Tipo R COD. 91).</p>
                  </div>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="text-[#68706E] hover:text-white font-bold text-lg">✕</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#68706E] font-bold mb-1">Razón Social</label>
                  <input
                    type="text"
                    value={empresaConfig.razonSocial || ""}
                    onChange={e => setEmpresaConfig({ ...empresaConfig, razonSocial: e.target.value })}
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-xl text-white outline-none focus:border-[#fe5000] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#68706E] font-bold mb-1">Nombre de Fantasía</label>
                  <input
                    type="text"
                    value={empresaConfig.nombreFantasia || ""}
                    onChange={e => setEmpresaConfig({ ...empresaConfig, nombreFantasia: e.target.value })}
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-xl text-white outline-none focus:border-[#fe5000] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#68706E] font-bold mb-1">Domicilio Fiscal</label>
                  <input
                    type="text"
                    value={empresaConfig.domicilioFiscal || ""}
                    onChange={e => setEmpresaConfig({ ...empresaConfig, domicilioFiscal: e.target.value })}
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-xl text-white outline-none focus:border-[#fe5000]"
                  />
                </div>

                <div>
                  <label className="block text-[#68706E] font-bold mb-1">CUIT</label>
                  <input
                    type="text"
                    value={empresaConfig.cuit || ""}
                    onChange={e => setEmpresaConfig({ ...empresaConfig, cuit: e.target.value })}
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-xl text-white outline-none focus:border-[#fe5000] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#68706E] font-bold mb-1">Condición IVA</label>
                  <input
                    type="text"
                    value={empresaConfig.condicionIva || ""}
                    onChange={e => setEmpresaConfig({ ...empresaConfig, condicionIva: e.target.value })}
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-xl text-white outline-none focus:border-[#fe5000] font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#68706E] font-bold mb-1">N° Ingresos Brutos (IIBB)</label>
                  <input
                    type="text"
                    value={empresaConfig.iibb || ""}
                    onChange={e => setEmpresaConfig({ ...empresaConfig, iibb: e.target.value })}
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-xl text-white outline-none focus:border-[#fe5000] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#68706E] font-bold mb-1">Fecha Inicio de Actividades</label>
                  <input
                    type="text"
                    value={empresaConfig.fechaInicioActividades || ""}
                    onChange={e => setEmpresaConfig({ ...empresaConfig, fechaInicioActividades: e.target.value })}
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-xl text-white outline-none focus:border-[#fe5000]"
                  />
                </div>

                <div>
                  <label className="block text-[#68706E] font-bold mb-1">E-Mail de Contacto</label>
                  <input
                    type="email"
                    value={empresaConfig.emailContacto || ""}
                    onChange={e => setEmpresaConfig({ ...empresaConfig, emailContacto: e.target.value })}
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-xl text-white outline-none focus:border-[#fe5000]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[#68706E] font-bold mb-1">Teléfono (TE)</label>
                  <input
                    type="text"
                    value={empresaConfig.telefonoContacto || ""}
                    onChange={e => setEmpresaConfig({ ...empresaConfig, telefonoContacto: e.target.value })}
                    className="w-full bg-[#FFFDFC] border border-[#DED8CF] p-2.5 rounded-xl text-white outline-none focus:border-[#fe5000]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#DED8CF]">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 bg-[#F7F3EC] hover:bg-[#FFFDFC] text-[#1F2928] py-3 rounded-xl font-bold transition text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarConfigEmpresa}
                  disabled={guardandoConfig}
                  className="flex-1 bg-[#fe5000] hover:bg-[#fe5000]/90 text-white py-3 rounded-xl font-black transition text-xs shadow-xs uppercase tracking-wider disabled:opacity-50"
                >
                  {guardandoConfig ? "Guardando..." : "💾 Guardar Configuración"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminProtectedRoute>
  );
}
