"use client";

import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy, addDoc } from "firebase/firestore";
import { generarContrato, generarPagare } from "@/lib/pdfGenerator";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Search, Filter, AlertCircle, CheckCircle2, Truck, DollarSign, Archive } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"analisis" | "logistica" | "cobranzas" | "historial">("analisis");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
    return <div className="min-h-screen flex items-center justify-center bg-white text-yellow-500">Cargando base de datos...</div>;
  }

  const afiliadoesActivos = Array.from(new Set(["jpmosqueira@hotmail.com", ...solicitudes.map((s: any) => s.afiliadoEmail).filter(Boolean)]));

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-[#FAFAFA] text-yellow-500 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-yellow-500/30 pb-6">
            <div className="flex items-center gap-4">
              <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Cuenta Hogar Logo" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-2xl font-black text-yellow-400">Panel de Control General</h1>
                <p className="text-gray-500 text-sm">Gestión de créditos, entregas y cobranzas</p>
              </div>
            </div>
            <Link href="/admin" className="text-sm border border-yellow-500/50 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded transition-colors font-bold whitespace-nowrap">
              ← Volver Atrás
            </Link>
          </header>

          {/* TABS NAVIGATION */}
          <div className="flex flex-wrap gap-2 mb-6 bg-[#FAFAFA]/50 p-2 rounded-xl border border-yellow-500/10">
            <button onClick={() => setActiveTab('analisis')} className={`flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'analisis' ? 'bg-yellow-500 text-black shadow-lg scale-[1.02]' : 'text-gray-500 hover:bg-gray-100'}`}>
              <AlertCircle className="w-4 h-4" /> Análisis Crediticio
            </button>
            <button onClick={() => setActiveTab('logistica')} className={`flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'logistica' ? 'bg-blue-600 text-white shadow-lg scale-[1.02]' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Truck className="w-4 h-4" /> Logística y Entregas
            </button>
            <button onClick={() => setActiveTab('cobranzas')} className={`flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'cobranzas' ? 'bg-green-600 text-white shadow-lg scale-[1.02]' : 'text-gray-500 hover:bg-gray-100'}`}>
              <DollarSign className="w-4 h-4" /> Cobranza de Cuotas
            </button>
            <button onClick={() => setActiveTab('historial')} className={`flex-1 min-w-[150px] py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'historial' ? 'bg-zinc-700 text-zinc-900 shadow-lg scale-[1.02]' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Archive className="w-4 h-4" /> Archivo Completo
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="mb-6 relative">
             <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
             <input 
               type="text" 
               placeholder="Buscar por DNI, Nombre o Email del cliente..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-[#FAFAFA] border border-yellow-500/20 text-zinc-900 pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:border-yellow-500 transition-colors font-medium shadow-inner"
             />
          </div>

          {/* LISTADO DE SOLICITUDES (ACORDEÓN) */}
          <div className="space-y-4">
            {solicitudes.filter(sol => {
              // 1. Filter by Search Term
              const searchStr = `${sol.datosPersonales?.nombreCompleto || ''} ${sol.datosPersonales?.numeroDni || ''} ${sol.clienteEmail || ''} ${sol.productoDeseado || ''}`.toLowerCase();
              if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;

              // 2. Filter by Active Tab
              if (activeTab === 'analisis') return sol.estado === 'PENDIENTE' || sol.estado === 'REQUIERE_INFO';
              if (activeTab === 'logistica') return sol.estado === 'APROBADO' && sol.estadoEntrega !== 'ENTREGADO';
              if (activeTab === 'cobranzas') return sol.estado === 'APROBADO' && sol.estadoEntrega === 'ENTREGADO' && sol.planPagos && sol.planPagos.some(p => p.estado === 'EN_REVISION' || p.estado === 'PENDIENTE');
              return true; // Historial shows all
            }).map(sol => {
              const currentEstado = nuevosEstados[sol.id] || sol.estado;
              const currentMensaje = nuevosMensajes[sol.id] !== undefined ? nuevosMensajes[sol.id] : (sol.mensajeAdmin || "");
              const isExpanded = expandedId === sol.id;
              
              return (
                <div key={sol.id} className={`bg-[#FAFAFA] border ${isExpanded ? 'border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-yellow-500/20 hover:border-yellow-500/40'} rounded-xl transition-all overflow-hidden`}>
                  
                  {/* CARD HEADER (COMPACT VIEW) */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : sol.id)}
                    className="p-4 md:p-6 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative"
                  >
                    {sol.cargadoPorAfiliado && (
                      <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-br-lg uppercase tracking-widest">
                        Carga Afiliado
                      </div>
                    )}
                    
                    <div className="flex-1 mt-2 md:mt-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-bold text-zinc-900">{sol.datosPersonales?.nombreCompleto || "Cliente Sin Nombre"}</h2>
                        <span className="text-sm text-gray-500 font-medium">DNI: {sol.datosPersonales?.numeroDni || "N/A"}</span>
                      </div>
                      <p className="text-yellow-400 font-bold flex items-center gap-2">
                        {sol.productoDeseado}
                        <span className="text-xs font-normal text-gray-500 px-2 py-0.5 bg-white rounded">
                          {sol.fechaCreacion ? new Date(sol.fechaCreacion.seconds * 1000).toLocaleDateString() : ''}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                      <div className="flex flex-col items-end">
                        <span className={`px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase border ${
                            sol.estado === "PENDIENTE" ? "bg-blue-500/20 text-blue-400 border-blue-500/50" :
                            sol.estado === "APROBADO" ? "bg-green-500/20 text-green-400 border-green-500/50" :
                            sol.estado === "RECHAZADO" ? "bg-red-500/20 text-red-400 border-red-500/50" :
                            "bg-orange-500/20 text-orange-400 border-orange-500/50"
                          }`}>
                          {sol.estado}
                        </span>
                        {sol.estado === 'APROBADO' && (
                           <span className="text-[10px] text-gray-500 mt-1">
                             Logística: {sol.estadoEntrega === 'ENTREGADO' ? '✅ Entregado' : '⏳ Pendiente'}
                           </span>
                        )}
                      </div>
                      <div className="text-gray-500 bg-white p-2 rounded-full">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* CARD BODY (EXPANDED VIEW) */}
                  {isExpanded && (
                    <div className="p-4 md:p-6 border-t border-yellow-500/20 bg-white/40">
                      
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        
                        {/* COLUMNA 1: PERFIL Y DOCS */}
                        <div className="flex flex-col gap-6">
                           <div className="bg-white border border-yellow-500/20 p-5 rounded-xl shadow-inner">
                             <h3 className="text-sm font-black text-yellow-500 mb-3 uppercase tracking-widest border-b border-yellow-500/20 pb-2">Perfil Crediticio</h3>
                             <div className="space-y-2 text-sm text-gray-600">
                               <p><strong className="text-zinc-900">Email:</strong> {sol.clienteEmail}</p>
                               <p><strong className="text-zinc-900">Teléfono:</strong> {sol.datosPersonales?.telefono}</p>
                               <p><strong className="text-zinc-900">Domicilio:</strong> {sol.datosPersonales?.direccion}, {sol.datosPersonales?.localidad}</p>
                             </div>
                           </div>

                           <div className="bg-white border border-yellow-500/20 p-5 rounded-xl shadow-inner">
                             <h3 className="text-sm font-black text-yellow-500 mb-3 uppercase tracking-widest border-b border-yellow-500/20 pb-2">Documentos Adjuntos</h3>
                             <div className="grid grid-cols-2 gap-3">
                               <a href={sol.documentos?.dniFrente} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-[#FAFAFA] border border-gray-300 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📷 DNI Frente</a>
                               <a href={sol.documentos?.dniDorso} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-[#FAFAFA] border border-gray-300 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📷 DNI Dorso</a>
                               <a href={sol.documentos?.reciboSueldo} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-[#FAFAFA] border border-gray-300 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📄 Recibo Sueldo</a>
                               <a href={sol.documentos?.servicio} target="_blank" rel="noreferrer" className="flex items-center justify-center bg-[#FAFAFA] border border-gray-300 hover:border-yellow-500 text-yellow-400 p-2 rounded-lg text-xs font-bold transition-colors">📄 Impuesto/Serv.</a>
                             </div>
                           </div>

                           <div className="bg-white border border-yellow-500/20 p-5 rounded-xl shadow-inner">
                              <h3 className="text-sm font-black text-yellow-500 mb-3 uppercase tracking-widest border-b border-yellow-500/20 pb-2">Asignación de Afiliado</h3>
                              {sol.afiliadoEmail ? (
                                <div className="flex flex-col gap-2">
                                  <p className="text-sm text-zinc-900 font-bold bg-[#FAFAFA] p-2 rounded border border-gray-200">👤 {sol.afiliadoEmail}</p>
                                  <button onClick={() => handleAsignarAfiliado(sol.id, "")} className="text-xs text-red-500 hover:text-red-400 font-bold self-start mt-1">✕ Remover Asignación</button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <p className="text-xs text-gray-500 mb-2">Ningún afiliado está a cargo del seguimiento de este cliente.</p>
                                  <select id={`seller_${sol.id}`} className="bg-[#FAFAFA] border border-gray-300 text-xs p-2.5 rounded text-zinc-900 focus:border-yellow-500 w-full outline-none">
                                    <option value="">-- Asignar Afiliado --</option>
                                    {afiliadoesActivos.map(v => <option key={v as string} value={v as string}>{v as string}</option>)}
                                    <option value="NUEVO" className="font-bold text-yellow-500">+ Escribir correo manualmente...</option>
                                  </select>
                                  <button onClick={() => {
                                     const el = document.getElementById(`seller_${sol.id}`) as HTMLSelectElement;
                                     let email = el.value;
                                     if (email === "NUEVO") email = prompt("Escribe el correo exacto del afiliado:") || "";
                                     if (email) handleAsignarAfiliado(sol.id, email);
                                  }} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded text-xs font-bold transition-colors shadow-md w-full">Delegar Legajo</button>
                                </div>
                              )}
                           </div>
                        </div>

                        {/* COLUMNA 2: ADMINISTRACIÓN Y LOGÍSTICA */}
                        <div className="flex flex-col gap-6">
                           
                           {/* DICTAMEN CREDITICIO */}
                           <div className="bg-[#FAFAFA] border-2 border-yellow-500/30 p-5 rounded-xl shadow-lg">
                             <h3 className="text-sm font-black text-yellow-500 mb-4 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Dictamen Crediticio</h3>
                             <div className="space-y-4">
                               <div>
                                 <label className="block text-xs font-bold text-gray-500 mb-2">Resolución Oficial:</label>
                                 <select 
                                  value={currentEstado} 
                                  onChange={(e) => handleEstadoChange(sol.id, e.target.value)}
                                  className={`w-full bg-white border-2 rounded-lg p-3 text-sm font-bold focus:outline-none transition-colors ${
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
                               <div>
                                 <label className="block text-xs font-bold text-gray-500 mb-2">Devolución / Mensaje al Usuario:</label>
                                 <textarea 
                                  value={currentMensaje}
                                  onChange={(e) => handleMensajeChange(sol.id, e.target.value)}
                                  className="w-full bg-white border border-gray-300 rounded-lg p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none text-sm resize-none min-h-[80px]"
                                  placeholder="Escribe un comentario si rechazás o pedís más info..."
                                 />
                               </div>
                               <button 
                                onClick={() => guardarCambios(sol)}
                                disabled={guardandoId === sol.id || (currentEstado === sol.estado && currentMensaje === (sol.mensajeAdmin||""))}
                                className="w-full bg-yellow-500 text-black py-3 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-yellow-400 transition-colors shadow-lg disabled:opacity-50 disabled:shadow-none"
                               >
                                {guardandoId === sol.id ? "Guardando..." : "Registrar Dictamen"}
                               </button>
                             </div>
                           </div>

                           {/* LOGÍSTICA (SOLO SI ESTÁ APROBADO) */}
                           {(sol.estado === "APROBADO" || currentEstado === "APROBADO") && (
                             <div className="bg-blue-950/20 border-2 border-blue-500/30 p-5 rounded-xl shadow-lg relative overflow-hidden">
                               <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
                               <h3 className="text-sm font-black text-blue-400 mb-4 uppercase tracking-widest flex items-center gap-2"><Truck className="w-4 h-4"/> Logística y Entrega</h3>
                               
                               <div className="space-y-4 relative z-10">
                                 <div>
                                    <label className="block text-xs font-bold text-blue-300/70 mb-2">Ubicación Física del Inventario:</label>
                                    <select 
                                      value={sol.estadoProducto || "En depósito (Central)"}
                                      onChange={e => handleActualizarEstadoProducto(sol.id, e.target.value)}
                                      className="bg-white text-sm p-3 rounded-lg text-zinc-900 font-medium outline-none border border-blue-900 focus:border-blue-500 w-full"
                                    >
                                       <option value="En depósito (Central)">🏢 En depósito (Central)</option>
                                       <option value="En stock (Afiliado)">👤 En manos del Afiliado</option>
                                       <option value="En viaje">🚚 En viaje al Cliente</option>
                                       <option value="Encargado a proveedor">📦 Encargado a proveedor</option>
                                    </select>
                                    {sol.historialRecepcion && (
                                      <p className="text-[10px] text-green-400 mt-2 bg-green-900/20 px-2 py-1.5 rounded-md border border-green-500/30 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3"/> {sol.historialRecepcion}
                                      </p>
                                    )}
                                 </div>

                                 <div className="pt-2 border-t border-blue-900/50">
                                    <label className="block text-xs font-bold text-blue-300/70 mb-2">Estado Final de Entrega al Cliente:</label>
                                    {entregaActiva === sol.id ? (
                                      <div className="bg-white border border-blue-500 p-4 rounded-xl flex flex-col gap-3 shadow-2xl">
                                         <h4 className="text-blue-400 font-bold text-xs uppercase text-center border-b border-blue-900 pb-2 mb-1">Confirmar Cierre y Adelanto</h4>
                                         <div>
                                           <label className="block text-[10px] text-gray-500 mb-1 font-bold">Nº de Serie del Producto (Obligatorio)</label>
                                           <input type="text" value={nserie} onChange={e=>setNserie(e.target.value)} placeholder="Ej: SN-12345" className="bg-[#FAFAFA] text-zinc-900 px-3 py-2.5 rounded-lg text-sm border border-gray-300 w-full focus:border-blue-500 outline-none font-mono" />
                                         </div>
                                         <div className="grid grid-cols-2 gap-3">
                                           <div>
                                             <label className="block text-[10px] text-gray-500 mb-1 font-bold">Adelanto Abonado ($)</label>
                                             <input type="number" value={montoAbonado} onChange={e=>setMontoAbonado(e.target.value)} className="bg-[#FAFAFA] text-yellow-500 px-3 py-2.5 rounded-lg text-sm border border-gray-300 w-full focus:border-yellow-500 outline-none font-black" />
                                           </div>
                                           <div>
                                             <label className="block text-[10px] text-gray-500 mb-1 font-bold">Método Pago</label>
                                             <select value={metodoPago} onChange={e=>setMetodoPago(e.target.value)} className="bg-[#FAFAFA] text-zinc-900 px-3 py-2.5 rounded-lg text-sm border border-gray-300 w-full focus:border-blue-500 outline-none">
                                               <option value="Efectivo">💵 Efectivo</option>
                                               <option value="Transferencia">📱 Transf.</option>
                                             </select>
                                           </div>
                                         </div>
                                         <div>
                                           <label className="block text-[10px] text-gray-500 mb-1 font-bold">Nota Logística (Opcional)</label>
                                           <input type="text" value={comentarioEntrega} onChange={e=>setComentarioEntrega(e.target.value)} placeholder="..." className="bg-[#FAFAFA] text-zinc-900 px-3 py-2.5 rounded-lg text-sm border border-gray-300 w-full focus:border-blue-500 outline-none" />
                                         </div>
                                         <div className="flex gap-2 mt-3">
                                           <button onClick={() => setEntregaActiva(null)} className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-lg text-xs font-bold hover:bg-gray-200 transition">Cancelar</button>
                                           <button onClick={() => handleConfirmarEntregaAdmin(sol.id, "ENTREGADO")} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-xs font-black hover:bg-blue-500 transition shadow-lg">✓ GUARDAR CIERRE</button>
                                         </div>
                                      </div>
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
                                         className={`w-full text-sm p-3 rounded-lg font-bold outline-none transition-colors border-2 ${sol.estadoEntrega === 'ENTREGADO' ? 'bg-green-900/30 border-green-500/50 text-green-400' : 'bg-white border-blue-900 text-zinc-900 focus:border-blue-500'}`}
                                      >
                                         <option value="PENDIENTE_ENTREGA">⏳ Pendiente de entrega</option>
                                         <option value="ENTREGADO">✅ ENTREGADO Y CERRADO</option>
                                         <option value="ANULADO">❌ Anuló compra / Falló</option>
                                      </select>
                                    )}

                                    {sol.estadoEntrega === "ENTREGADO" && !entregaActiva && (
                                      <div className="bg-white/50 border border-green-500/30 p-3 rounded-lg mt-3">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <p className="text-gray-600"><span className="text-gray-500 font-bold block text-[10px]">Nº SERIE:</span> {sol.numeroSerie || "N/A"}</p>
                                          <p className="text-gray-600"><span className="text-gray-500 font-bold block text-[10px]">ANTICIPO ABONADO:</span> <span className="text-green-400 font-black">${sol.montoAbonado || 0}</span> ({sol.metodoPago || "N/A"})</p>
                                        </div>
                                        {sol.comentarioEntrega && <p className="text-[10px] text-gray-500 italic mt-2 border-t border-gray-200 pt-2">"{sol.comentarioEntrega}"</p>}
                                      </div>
                                    )}
                                 </div>
                               </div>
                             </div>
                           )}

                           {/* DOCUMENTACIÓN LEGAL */}
                           {(currentEstado === "APROBADO" || sol.estado === "APROBADO") && (
                             <div className="bg-[#FAFAFA] border border-gray-200 p-4 rounded-xl">
                               <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-3">Generación Legal (PDF)</h3>
                               <div className="grid grid-cols-2 gap-3">
                                 <button onClick={() => generarContrato(sol)} className="bg-[#FAFAFA] border border-gray-300 hover:border-yellow-500 text-gray-600 hover:text-yellow-400 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">📄 Contrato</button>
                                 <button onClick={() => generarPagare(sol)} className="bg-[#FAFAFA] border border-gray-300 hover:border-yellow-500 text-gray-600 hover:text-yellow-400 py-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">📄 Pagaré</button>
                               </div>
                             </div>
                           )}
                        </div>

                        {/* COLUMNA 3: COBRANZA Y CUOTAS (SOLO SI TIENE PLAN) */}
                        <div className="flex flex-col gap-6">
                          {sol.planPagos ? (
                            <div className="bg-green-950/10 border-2 border-green-500/20 p-5 rounded-xl shadow-lg h-full">
                              <h3 className="text-sm font-black text-green-500 mb-4 uppercase tracking-widest flex items-center gap-2"><DollarSign className="w-4 h-4"/> Auditoría de Cuotas</h3>
                              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {sol.planPagos.map((cuota: any, idx: number) => (
                                  <div key={idx} className="bg-white border border-green-900/50 p-4 rounded-lg flex flex-col gap-3">
                                    <div className="flex justify-between items-start border-b border-green-900/30 pb-2">
                                      <div>
                                        <p className="text-zinc-900 font-black text-sm">Cuota {cuota.numero} <span className="text-green-500">${cuota.montoOriginal}</span></p>
                                        <p className="text-[10px] text-gray-500 font-medium">Vence: {new Date(cuota.vencimiento).toLocaleDateString()}</p>
                                      </div>
                                      <div className="text-right">
                                        {cuota.estado === "PAGADO" && <span className="bg-green-500/20 text-green-400 px-2.5 py-1 rounded border border-green-500/30 text-[10px] font-black uppercase tracking-widest">Acreditado</span>}
                                        {cuota.estado === "PENDIENTE" && <span className="bg-orange-500/10 text-orange-500 px-2.5 py-1 rounded border border-orange-500/20 text-[10px] font-black uppercase tracking-widest">Pendiente</span>}
                                        {cuota.estado === "EN_REVISION" && <span className="bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded border border-blue-500/50 text-[10px] font-black uppercase tracking-widest animate-pulse">Revisar Pago</span>}
                                      </div>
                                    </div>
                                    
                                    {cuota.estado === "PAGADO" && cuota.comprobanteUrl && (
                                       <div className="flex justify-end">
                                          <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-zinc-900 transition-colors underline">Ver Recibo Guardado</a>
                                       </div>
                                    )}

                                    {cuota.estado === "EN_REVISION" && (
                                       <div className="bg-[#FAFAFA] p-3 rounded-lg border border-gray-300 flex flex-col gap-3">
                                          <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="bg-blue-600/20 text-blue-400 border border-blue-500/50 text-xs font-bold py-2 rounded text-center hover:bg-blue-600 hover:text-white transition-colors">📄 Abrir Comprobante Adjunto</a>
                                          <div className="flex gap-2">
                                            <button onClick={async () => {
                                                const m = prompt("Motivo de rechazo (Ej: borroso, falso):");
                                                if (m === null) return;
                                                const newPlan = [...(sol.planPagos || [])];
                                                newPlan[idx].estado = "PENDIENTE";
                                                newPlan[idx].comprobanteUrl = null;
                                                await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan });
                                                await fetchSolicitudes();
                                                alert("Pago Rechazado.");
                                            }} className="flex-1 bg-red-900/40 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white py-2 rounded text-xs font-bold transition">Rechazar</button>
                                            <button onClick={async () => {
                                                const newPlan = [...(sol.planPagos || [])];
                                                newPlan[idx].estado = "PAGADO";
                                                newPlan[idx].fechaPago = new Date().toISOString();
                                                await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan });
                                                if (sol.afiliadoEmail) {
                                                   await addDoc(collection(db, "notificaciones"), {
                                                      afiliadoEmail: sol.afiliadoEmail,
                                                      mensaje: '¡Excelente! Se aprobó el recibo de ' + (sol.datosPersonales?.nombreCompleto || 'cliente') + ' por $' + cuota.montoOriginal + '. Ya tenés la comisión ganada.',
                                                      fecha: new Date().toISOString(),
                                                      leida: false,
                                                      comisionAsociada: cuota.montoOriginal * 0.15
                                                   });
                                                }
                                                await fetchSolicitudes();
                                            }} className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded text-xs font-black transition shadow-lg">✓ Aprobar</button>
                                          </div>
                                       </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="bg-[#FAFAFA] border border-gray-200 p-6 rounded-xl flex items-center justify-center text-center h-full">
                               <p className="text-gray-500 text-sm">Aún no hay plan de cuotas o no se registró la entrega física.</p>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
}
