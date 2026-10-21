"use client";
import { AffiliateCommissionPanel } from '@/components/operations/AffiliateCommissionPanel';
import {LegacyPortalAction} from "@/components/LegacyPortalAction";

import {createAffiliateSolicitudSender} from "@/lib/affiliateSolicitudClient";
import { AffiliateOperationsV2 } from '@/components/operations/AffiliateOperationsV2';
import { isAdminEmail } from "@/lib/adminIdentity";

import { useAuth } from "@/components/AuthProvider";
import {legacyBlockedMessage,restoreLegacyDates} from "@/lib/legacyPortalClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchPublicCatalog } from "@/lib/publicCatalogClient";
import { publicCatalogSelection } from "@/lib/publicCatalogContract";
import type { CatalogReferencePublic } from "@/lib/catalogReference";
import { useEffect, useState, useRef } from "react";


function AfiliadoPortal() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const sender=useRef(createAffiliateSolicitudSender()),flight=useRef(false);
  const [requestError,setRequestError]=useState(""),[requestSuccess,setRequestSuccess]=useState("");

  const [activeTab, setActiveTab] = useState<"carga" | "seguimiento" | "clientes" | "comisiones">("seguimiento");
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [historyError,setHistoryError]=useState("");
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [productos, setProductos] = useState<CatalogReferencePublic[]>([]);
  const [catalogState, setCatalogState] = useState("loading");
  const [catalogError, setCatalogError] = useState("");
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  // Formulario - Datos Personales
  const [clienteEmail, setClienteEmail] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [numeroDni, setNumeroDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  
  // Producto y Cuotas
  const [entregaActiva, setEntregaActiva] = useState<string | null>(null);
  const [recepcionActiva, setRecepcionActiva] = useState<string | null>(null);
  const [expandedCarteraId, setExpandedCarteraId] = useState<string | null>(null);
  const [activeProductSolId, setActiveProductSolId] = useState<Record<string, string>>({});
  const [fechaRecepcion, setFechaRecepcion] = useState("");
  const [costoComisionista, setCostoComisionista] = useState("");
  const [nserie, setNserie] = useState("");
  const [montoAbonado, setMontoAbonado] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [comentarioEntrega, setComentarioEntrega] = useState("");

  const [productoId, setProductoId] = useState("");
  const [planElegido, setPlanElegido] = useState<string | null>(null);

  // Archivos





  const [correoEnviado, setCorreoEnviado] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (!isAdminEmail(user.email)) {
        try {
          const role = localStorage.getItem("userRole");
          if (role === "cliente") {
            router.push("/login-afiliado?error=unauthorized_role");
          } else if (!role) {
            localStorage.setItem("userRole", "afiliado");
          }
        } catch (e) {
          console.error("LocalStorage error:", e);
        }
      }
    }
  }, [user, authLoading, router]);

  const handleReenviarCorreo = async () => {
    if (!user) return;
    try {
      const { getAuth, sendEmailVerification } = await import("firebase/auth");
      const auth = getAuth();
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setCorreoEnviado(true);
      }
    } catch (error: any) {
      if (error.code === "auth/too-many-requests") {
        alert("Ya enviamos un correo recientemente. Por favor espera unos minutos y revisa la carpeta SPAM.");
      } else {
        alert("Error al intentar enviar el correo. Intenta de nuevo.");
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => {
    if (controller.signal.aborted) return;
    setCatalogState("loading"); setCatalogError("");
    return fetchPublicCatalog(controller.signal).then(items => {
      if (controller.signal.aborted) return;
      setProductos(items); setCatalogState(items.length ? "ready" : "empty");
    }).catch(error => { if (!controller.signal.aborted) { setCatalogState("error"); setCatalogError(error.message); } });
    });
    return () => controller.abort();
  }, [user]);

  const fetchData = async () => {if(!user)return;try{const r=await fetch('/api/afiliado/historial',{cache:'no-store',headers:{Authorization:'Bearer '+await user.getIdToken()}});const data=await r.json();if(!r.ok)throw Error(data.error);setSolicitudes(restoreLegacyDates(data.solicitudes));setNotificaciones(data.notificaciones);setHistoryError(data.warnings.join(' '));}catch(e){setHistoryError(e instanceof Error?e.message:'No se pudo consultar el historial.');}finally{setCargandoDatos(false);}};

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  
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







  const handleSubmit = async (e: React.FormEvent) => {e.preventDefault();if(!user||flight.current)return;flight.current=true;setSubiendo(true);setRequestError('');setRequestSuccess('');try{const reference=productos.find(p=>p.referenciaId===productoId);if(!reference)throw Error('La referencia ya no está disponible.');const selection=publicCatalogSelection(reference,planElegido||'');const result=await sender.current({nombreCompleto,numeroDni,whatsapp:telefono,direccion,localidad,email:clienteEmail,...selection},()=>user.getIdToken(),user.uid);setRequestSuccess('Solicitud registrada. No se creó presupuesto, aceptación ni contrato.');await fetchData();if(result.notificationPending)setRequestSuccess('Solicitud registrada; aviso administrativo pendiente.');}catch(error){setRequestError(error instanceof Error?error.message:'No se confirmó el registro. Reintentá el mismo envío.');}finally{flight.current=false;setSubiendo(false);}};

  const prodElegidoObj = productos.find(p => p.referenciaId === productoId);

  if (authLoading || cargandoDatos) return <div className="min-h-screen bg-[#121316] text-zinc-100 p-8 text-center mt-20 font-bold">Cargando panel comercial...</div>;
  if (!user) return null;

  // Forzar verificación de correo electrónico (excepto admin)
  if (!user.emailVerified && !isAdminEmail(user.email)) {
    return (
      <div className="min-h-screen bg-[#121316] text-zinc-100 p-4 flex flex-col items-center justify-center">
        <div className="bg-[#181920] border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] p-8 rounded-lg w-full max-w-md shadow-2xl shadow-black/90 text-center">
          <div className="text-6xl mb-6">📬</div>
          <h1 className="text-3xl font-black text-[#fe5000] mb-2">Portal de Afiliados</h1>
          <h2 className="text-xl font-bold text-white mb-4">Verifica tu correo electrónico</h2>
          <p className="text-zinc-500 mb-6 text-sm">
            Antes de poder cargar solicitudes y ver tus comisiones, debes comprobar que <strong>{user.email}</strong> es válido haciendo clic en el enlace de validación que te enviamos.
          </p>
          <p className="text-red-500 font-bold mb-8 text-xs italic">
            Importante: Si no lo encuentras en Recibidos, revisa la carpeta de Correo no deseado (SPAM).
          </p>
          
          <button 
            disabled={correoEnviado}
            onClick={handleReenviarCorreo}
            className="w-full bg-yellow-500 text-black py-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50"
          >
            {correoEnviado ? "✅ Correo Reenviado. Revisa tu buzón." : "No me llegó, reenviar correo de validación"}
          </button>

          <button onClick={() => window.location.reload()} className="w-full bg-transparent border border-[#fe5000] text-[#fe5000] py-2.5 mt-4 rounded-lg font-bold hover:bg-yellow-50 transition-colors">
            Ya lo validé, recargar página
          </button>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-[#121316] text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-zinc-800 pb-6">
          <div>
            <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-10 w-auto object-contain" /> <h1 className="text-2xl font-bold text-[#fe5000] mt-2">Portal del Afiliado</h1>
            <p className="text-zinc-500 text-sm mt-1">Usuario activo: {user.email}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="text-sm border border-[#fe5000]/50 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded transition-colors font-bold hidden sm:block">Catálogo</Link>
            <button onClick={() => { import("firebase/auth").then(({getAuth, signOut}) => signOut(getAuth())); router.push("/login"); }} className="text-sm border border-red-500/50 text-red-500 hover:bg-red-900/50 px-4 py-2 rounded transition-colors font-bold">
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* ALERTAS DE COBRANZA GLOBALES */}
        {promesasExigibles.length > 0 && (
           <div className="bg-red-900/30 border border-red-500/80 p-5 rounded-xl mb-6 flex flex-col gap-2 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <h3 className="text-red-400 font-black text-lg flex items-center gap-2">🚨 ALERTA: Tienes Promesas de Pago Vencidas o para Hoy</h3>
              <p className="text-sm text-zinc-500 mb-2">Comunícate urgentemente con estos clientes, sus promesas han madurado y siguen en mora.</p>
              <div className="flex flex-wrap gap-3">
                 {promesasExigibles.map(sol => {
                    const lProm = sol.historialContactos.find((c:any) => c.promesaPago);
                    return (
                       <div key={sol.recordKey || sol.id} onClick={() => { setActiveTab("clientes"); setExpandedCarteraId(sol.id); }} className="cursor-pointer bg-red-500/5 hover:bg-red-500/20 text-white px-4 py-2 rounded-lg border border-red-500/10 transition shadow-sm">
                          <p className="text-sm font-bold text-white">{sol.datosPersonales?.nombreCompleto}</p>
                          <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mt-1">Acuerdo: {new Date(lProm.promesaPago + "T12:00:00").toLocaleDateString()}</p>
                       </div>
                    )
                 })}
              </div>
           </div>
        )}

        <AffiliateCommissionPanel/><AffiliateOperationsV2 key={user.uid}/>
        <p data-testid="legacy-read-only" className="text-sm text-zinc-400">{legacyBlockedMessage}</p>{historyError&&<p role="alert">{historyError}</p>}
        {/* MENÚ DE SECCIONES (TABS) */}
        <div className="flex flex-col sm:flex-row gap-2 mb-8 bg-[#121316]/80 p-2 rounded-xl border border-zinc-800 shadow-2xl shadow-black/60">
           <button onClick={() => setActiveTab("carga")} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-center ${activeTab === 'carga' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/80'}`}>
              1. Carga de Solicitudes
           </button>
           <button onClick={() => setActiveTab("seguimiento")} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-center ${activeTab === 'seguimiento' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/80'}`}>
              2. Seguimiento / Logística
           </button>
           <button onClick={() => setActiveTab("clientes")} className={'flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-center ' + (activeTab === 'clientes' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/80')}>
              3. Gestión Clientes
           </button>
           <button onClick={() => setActiveTab("comisiones")} className={'flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-center flex items-center justify-center gap-2 ' + (activeTab === 'comisiones' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/80')}>
              4. Comisiones {notificaciones.filter(n=>!n.leida).length > 0 && <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[10px] animate-pulse">{notificaciones.filter(n=>!n.leida).length}</span>}
           </button>
        </div>

        <div className="w-full">
          
          {/* 1. SECCION: CARGA DE SOLICITUDES */}
          {activeTab === "carga" && (
            <div className="bg-[#121316] border border-zinc-800 rounded-xl p-6 md:p-10 shadow-2xl shadow-black/80 max-w-4xl mx-auto animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-2">Cargar nueva solicitud</h2>
            <p className="text-zinc-600 mb-8">Seleccioná una referencia publicada y un plan estimado para preparar la solicitud de gestión de compra del cliente.</p>
            
            <form data-testid="affiliate-request-p1" onSubmit={handleSubmit} className="space-y-8">
              
              {catalogState === "loading" && <p role="status">Cargando referencias…</p>}
              {catalogState === "error" && <p role="alert">{catalogError}</p>}
              {catalogState === "empty" && <p>No hay referencias publicadas en este momento.</p>}
              {/* SELECTOR DE PRODUCTO Y CUOTAS */}
              <div className="bg-[#181920] p-5 rounded-xl border border-zinc-800">
                <div className="mb-5">
                  <label className="block text-sm font-bold text-[#fe5000] mb-2">Seleccionar referencia de compra</label>
                  <select 
                    required aria-label="Referencia pública"
                    value={productoId} 
                    onChange={e => { setProductoId(e.target.value); setPlanElegido(null); }} 
                    className="w-full bg-zinc-800/80 border border-gray-700 rounded-lg p-3 text-white focus:border-[#fe5000] focus:outline-none font-semibold text-lg"
                  >
                    <option value="" disabled>-- Elegí una referencia publicada --</option>
                    {productos.map(p => (
                      <option key={p.referenciaId} value={p.referenciaId}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                {prodElegidoObj && <div data-public-reference={prodElegidoObj.referenciaId} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {prodElegidoObj.planesPublicados.map(plan => <button key={plan.cuotas} type="button" data-public-plan={plan.cuotas} onClick={() => setPlanElegido(String(plan.cuotas))} className={`min-h-11 border-2 rounded-xl p-4 ${planElegido === String(plan.cuotas) ? "border-[#fe5000] bg-[#fe5000]/5" : "border-zinc-800 hover:border-gray-500"}`}>
                    <span className="block font-bold">{plan.cuotas} cuotas estimadas</span><span className="text-2xl font-black text-[#fe5000]">{plan.cuotaEstimada.toLocaleString("es-AR", { style: "currency", currency: "ARS" })}</span>
                  </button>)}
                </div>}
              </div>

              {/* DATOS DEL CLIENTE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#181920] p-5 rounded-xl border border-zinc-800">
                <div>
                  <label className="block text-sm mb-2 text-zinc-400 font-bold">Email de Contacto (del Cliente)</label>
                  <input required aria-label="Email del cliente" value={clienteEmail} onChange={e=>setClienteEmail(e.target.value)} type="email" placeholder="cliente@correo.com" className="w-full bg-zinc-800/80 border border-gray-700 rounded-lg p-3 text-white focus:border-[#fe5000] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-[#fe5000] font-bold">Nombre Completo del Cliente</label>
                  <input required aria-label="Nombre del cliente" value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} type="text" placeholder="Juan Perez" className="w-full bg-zinc-800/80 border border-gray-700 rounded-lg p-3 text-white focus:border-[#fe5000] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-[#fe5000] font-bold">Número de DNI</label>
                  <input required aria-label="DNI del cliente" value={numeroDni} onChange={e=>setNumeroDni(e.target.value)} type="number" placeholder="Ej: 32444555" className="w-full bg-zinc-800/80 border border-gray-700 rounded-lg p-3 text-white focus:border-[#fe5000] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-[#fe5000] font-bold">Teléfono / Celular</label>
                  <input required aria-label="Teléfono del cliente" value={telefono} onChange={e=>setTelefono(e.target.value)} type="tel" placeholder="Ej: +54 9 11 1234-5678" className="w-full bg-zinc-800/80 border border-gray-700 rounded-lg p-3 text-white focus:border-[#fe5000] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-[#fe5000] font-bold">Dirección</label>
                  <input required aria-label="Domicilio del cliente" value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" placeholder="Ej: Av. San Martin 123" className="w-full bg-zinc-800/80 border border-gray-700 rounded-lg p-3 text-white focus:border-[#fe5000] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-[#fe5000] font-bold">Localidad</label>
                  <input required aria-label="Localidad del cliente" value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" placeholder="Ej: Córdoba" className="w-full bg-zinc-800/80 border border-gray-700 rounded-lg p-3 text-white focus:border-[#fe5000] focus:outline-none" />
                </div>
              </div>

              <p className="text-sm text-zinc-400">La documentación se gestiona con Administración mediante el circuito privado. No se suben archivos ni se crean enlaces públicos desde este formulario.</p>
              {requestError&&<p role="alert">{requestError}</p>}{requestSuccess&&<p role="status">{requestSuccess}</p>}
              <button disabled={subiendo || !planElegido || !productoId} type="submit" className="w-full bg-yellow-500 text-black py-4 rounded-xl font-black text-lg hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:shadow-none mt-8 tracking-wide">
                {subiendo ? "Registrando solicitud…" : "Ingresar solicitud"}
              </button>
            </form>
          </div>
          )}

          
          {/* 2. SECCION: SEGUIMIENTO Y LOGISTICA */}
          {activeTab === "seguimiento" && (
          <div className="flex flex-col gap-8 max-w-5xl mx-auto animate-fade-in">
            <div className="bg-[#121316] border border-zinc-800 p-6 rounded-xl shadow-2xl shadow-black/60">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">🚚 Módulo de Entregas</h2>
              
              {solicitudes.filter(s => s.estado === "APROBADO" && s.estadoEntrega !== "ENTREGADO" && s.estadoEntrega !== "ANULADO").length === 0 ? (
                <p className="text-zinc-500 text-sm italic">No tienes equipos pendientes de entrega.</p>
              ) : (
                <div className="space-y-4">
                  {solicitudes.filter(s => s.estado === "APROBADO" && s.estadoEntrega !== "ENTREGADO" && s.estadoEntrega !== "ANULADO").map((sol: any) => (
                     <div key={sol.recordKey || sol.id} className="bg-[#181920] border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] p-4 rounded-lg flex flex-col gap-2 relative">
                        <span className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                        
                        <p className="text-sm font-bold text-[#fe5000]">{sol.productoDeseado}</p>
                        <p className="text-xs text-zinc-400">Cliente: <span className="text-white font-bold">{sol.datosPersonales?.nombreCompleto}</span></p>
                        <p className="text-xs text-zinc-400 mb-2">DNI: {sol.datosPersonales?.numeroDni}</p>
                        <p className="text-xs text-zinc-500 italic bg-[#121316] p-2 rounded border border-zinc-800 break-words mb-2">Notas Admin: {sol.mensajeAdmin || 'Sin observaciones'}</p>
                        
                        <LegacyPortalAction kind="NOTE" id={sol.id} source={sol.sourceCollection} onSaved={()=>void fetchData()}/>
                        {entregaActiva === sol.id ? (
                          <div className="bg-[#121316] border border-[#fe5000]/50 p-4 rounded-lg mt-2 flex flex-col gap-3 shadow-md w-full relative z-10">
                             <h4 className="text-[#fe5000] font-bold text-xs uppercase text-center border-b border-zinc-800 pb-2">Confirmar Entrega</h4>
                             <div>
                               <label className="block text-[10px] text-zinc-500 mb-1">Nº de Serie del Producto (Oblig.)</label>
                               <input type="text" value={nserie} onChange={e=>setNserie(e.target.value)} placeholder="Ej: SN-928374928" className="bg-[#181920]/80 text-zinc-100 px-3 py-2 rounded text-xs border border-zinc-800 w-full focus:border-[#fe5000] outline-none" />
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               <div>
                                 <label className="block text-[10px] text-zinc-500 mb-1">Monto Cobrado ($)</label>
                                 <input type="number" value={montoAbonado} onChange={e=>setMontoAbonado(e.target.value)} className="bg-[#181920]/80 text-zinc-100 px-3 py-2 rounded text-xs border border-zinc-800 w-full focus:border-[#fe5000] outline-none font-bold" />
                               </div>
                               <div>
                                 <label className="block text-[10px] text-zinc-500 mb-1">Medio de Pago</label>
                                 <select value={metodoPago} onChange={e=>setMetodoPago(e.target.value)} className="bg-[#181920]/80 text-zinc-100 px-3 py-2 rounded text-xs border border-zinc-800 w-full focus:border-[#fe5000] outline-none font-bold">
                                   <option value="Efectivo">💵 Efectivo</option>
                                   <option value="Transferencia">📱 Transferencia</option>
                                 </select>
                               </div>
                             </div>
                             <div>
                               <label className="block text-[10px] text-zinc-500 mb-1">Comentario Opcional</label>
                               <input type="text" value={comentarioEntrega} onChange={e=>setComentarioEntrega(e.target.value)} placeholder="..." className="bg-[#181920]/80 text-zinc-100 px-3 py-2 rounded text-xs border border-zinc-800 w-full focus:border-[#fe5000] outline-none" />
                             </div>
                             <div className="flex gap-2 mt-2">
                               <button onClick={() => setEntregaActiva(null)} className="flex-1 bg-zinc-800/80 text-zinc-400 py-2 rounded text-xs font-bold hover:bg-gray-200">Cancelar</button>
                               <button onClick={()=>alert(legacyBlockedMessage)} className="flex-1 bg-yellow-500 text-black py-2 rounded text-xs font-bold hover:bg-yellow-400 shadow-md" disabled aria-disabled="true" style={{opacity:0.5,cursor:"not-allowed"}} title={legacyBlockedMessage}>✓ GUARDAR</button>
                             </div>
                          </div>
                        ) : (
                          <>
                            {sol.estadoProducto === "En stock (Afiliado)" ? (
                               <>
                                 <label className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Marcar Estado de Logística:</label>
                                 <select 
                                    value={sol.estadoEntrega || "PENDIENTE_ENTREGA"} 
                                    onChange={()=>alert(legacyBlockedMessage)}
                                    className="bg-zinc-800/80 border border-gray-600 text-xs p-2 rounded text-white focus:border-[#fe5000] outline-none w-full font-bold" disabled aria-disabled="true" style={{opacity:0.5,cursor:"not-allowed"}} title={legacyBlockedMessage}
                                 >
                                    <option value="PENDIENTE_ENTREGA">📦 Equipo pendiente de entrega</option>
                                    <option value="ENTREGADO">✅ Equipo Entregado al Cliente</option>
                                    <option value="ANULADO">❌ Anuló compra / Falló entrega</option>
                                 </select>
                               </>
                            ) : (
                               <div className="bg-orange-500/10 border border-orange-500/30 p-2 rounded flex flex-col gap-1 mt-1">
                                 <p className="text-[10px] text-orange-400 font-black uppercase tracking-wider">⚠️ Entrega Bloqueada</p>
                                 <p className="text-[10px] text-zinc-500">Debes tener el producto en stock físico para entregarlo. Estado actual: <strong className="text-zinc-400">{sol.estadoProducto || "A la espera..."}</strong></p>
                               </div>
                            )}
                          </>
                        )}
                        {recepcionActiva === sol.id ? (
                           <div className="bg-blue-900/20 border border-blue-500/50 p-4 rounded-lg mt-2 flex flex-col gap-3 shadow-md w-full relative z-10">
                              <h4 className="text-blue-400 font-bold text-xs uppercase text-center border-b border-blue-500/20 pb-2">📦 Confirmar Recepción Física</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] text-zinc-500 mb-1">Fecha de Ingreso</label>
                                  <input type="date" value={fechaRecepcion} onChange={e=>setFechaRecepcion(e.target.value)} className="bg-[#181920]/80 text-zinc-100 px-3 py-2 rounded text-xs border border-zinc-800 w-full focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-zinc-500 mb-1">Costo Flete ($)</label>
                                  <input type="number" placeholder="Ej: 5000" value={costoComisionista} onChange={e=>setCostoComisionista(e.target.value)} className="bg-[#181920]/80 text-zinc-100 px-3 py-2 rounded text-xs border border-zinc-800 w-full focus:border-blue-500 outline-none font-bold text-blue-400" />
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => setRecepcionActiva(null)} className="flex-1 bg-zinc-800/80 text-zinc-400 py-2 rounded text-xs font-bold hover:bg-gray-200">Cancelar</button>
                                <button onClick={()=>alert(legacyBlockedMessage)} className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-500 shadow-md" disabled aria-disabled="true" style={{opacity:0.5,cursor:"not-allowed"}} title={legacyBlockedMessage}>✓ CONFIRMAR</button>
                              </div>
                           </div>
                        ) : sol.estadoProducto === "En viaje" && (
                          <button 
                            onClick={() => {
                               setRecepcionActiva(sol.id);
                               setFechaRecepcion(new Date().toISOString().split('T')[0]);
                               setCostoComisionista("");
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded w-full mt-2 text-xs shadow-[0_0_15px_rgba(37,99,235,0.5)] animate-pulse border border-blue-400"
                          >
                            📦 ACUSAR RECIBO DE MERCADERÍA Y FLETE
                          </button>
                        )}
                        {sol.estadoEntrega === "ENTREGADO" && !entregaActiva && (
                                <div className="bg-green-500/5 border border-green-500/10 p-2 rounded mt-2 flex flex-col gap-1 w-full">
                                  <p className="text-xs text-green-400"><strong className="text-green-400">Nº SERIE:</strong> {sol.numeroSerie || "No registrado"}</p>
                                  <p className="text-xs text-green-400"><strong className="text-green-400">PAGO:</strong> ${sol.montoAbonado || 0} ({sol.metodoPago || "N/A"})</p>
                                </div>
                        )}
                     </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTORIAL RECIENTE */}
          
            <h2 className="text-xl font-bold text-white mb-6">Mis Solicitudes Cargadas</h2>
            {solicitudes.length === 0 ? (
              <p className="text-zinc-500 text-sm">Aún no has cargado ninguna solicitud.</p>
            ) : (
              <div className="space-y-4">
                {solicitudes.slice(0, 10).map((sol) => (
                  <div key={sol.recordKey || sol.id} className="bg-[#121316] border border-zinc-800 p-4 rounded-xl flex flex-col gap-2">
                     <p className="text-sm font-bold text-white leading-tight">{sol.productoDeseado}</p>

                        {sol.estadoProducto === "En viaje" && (
                          <button 
                            onClick={()=>alert(legacyBlockedMessage)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded w-full mt-2 text-xs shadow-[0_0_15px_rgba(37,99,235,0.5)]  border border-blue-400" disabled aria-disabled="true" style={{opacity:0.5,cursor:"not-allowed"}} title={legacyBlockedMessage}
                          >
                            📦 ACUSAR RECIBO (FLETE)
                          </button>
                        )}
                     
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 sm:gap-0">
                       <span className="text-zinc-500">Cliente: {sol.datosPersonales?.nombreCompleto}</span>
                       <span className={`px-2 py-1 rounded font-bold ${
                          sol.estado === 'APROBADO' ? 'bg-green-500/20 text-green-400' :
                          sol.estado === 'RECHAZADO' ? 'bg-red-500/20 text-red-500' :
                          'bg-[#fe5000]/20 text-[#fe5000]'
                       }`}>{sol.estado}</span>
                     </div>
                     {sol.estadoEntrega === "ENTREGADO" && (
                       <div className="mt-2 border-t border-zinc-800 pt-2 flex justify-between items-center text-xs">
                         <span className="text-zinc-500 font-bold">Estado del Adelanto:</span>
                         {sol.estadoRendicion === "CONFIRMADO" ? (
                           <span className="bg-green-500/5 text-green-400 border border-green-500/10 px-2 py-1 rounded font-bold">✅ CONFIRMADO POR CAJA</span>
                         ) : sol.estadoRendicion === "PENDIENTE" ? (
                           <span className="bg-[#fe5000]/5 text-[#fe5000] border border-zinc-800 px-2 py-1 rounded font-bold animate-pulse">⏳ PENDIENTE DE CAJA</span>
                         ) : (
                           <span className="text-zinc-500">Sin rendir</span>
                         )}
                       </div>
                     )}
                     {sol.planElegido && (
                       <span className="bg-zinc-800/80 text-[#fe5000] w-fit px-2 py-1 rounded text-xs font-bold mt-1">
                          {sol.planElegido} Cuotas
                       </span>
                     )}
                  </div>
                ))}
              </div>
            )}
          </div>
          )}


          {/* 4. SECCION: COMISIONES */}
          {activeTab === "comisiones" && (
             <div className="bg-[#181920] border border-zinc-800 p-6 rounded-xl animate-fade-in max-w-6xl mx-auto">
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3"><span className="bg-[#fe5000]/5 p-2 rounded-lg">💰</span> Mis Comisiones y Avisos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                   <div className="bg-[#121316] border border-[#fe5000]/50 p-6 rounded-xl md:col-span-1 shadow-[0_0_15px_rgba(234,179,8,0.1)] text-center flex flex-col justify-center">
                      <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-2">Comisión Histórica Total</p>
                      <p className="text-4xl font-black text-[#fe5000]">${solicitudes.reduce((acc, sol) => {
                         if (!sol.planPagos) return acc;
                         const sumaPagos = sol.planPagos.reduce((accCuota: number, cuota: any) => {
                           if (cuota.estado === "PAGADO") {
                             return accCuota + Number(cuota.montoOriginal || 0);
                           }
                           return accCuota;
                         }, 0);
                         return acc + (sumaPagos * 0.15);
                      }, 0).toLocaleString()}</p>
                      <p className="text-[9px] text-zinc-500 mt-2">15% s/Transferencias Registradas</p>
                   </div>
                   <div className="md:col-span-2 space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                       {notificaciones.length === 0 ? (
                           <p className="text-zinc-500 text-sm">No tienes notificaciones de pago confirmadas aún.</p>
                       ) : (
                           notificaciones.map(n => (
                               <div key={n.id} className={'p-4 rounded-xl border flex flex-col gap-1 ' + (!n.leida ? 'bg-zinc-800/80/80 border-[#fe5000]/50 relative' : 'bg-[#181920] border-zinc-800')}>
                                   {!n.leida && <span className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span></span>}
                                   <div className="flex justify-between items-center text-[10px] text-zinc-500 mb-1">
                                       <div className="flex items-center gap-2">
                                          <span className="font-bold">{new Date(n.fecha).toLocaleString()}</span>
                                          {n.comisionAsociada && (
                                             n.estadoPago === "PAGADA" 
                                               ? <span className="bg-green-500 text-white px-2 py-0.5 rounded font-black text-[9px] uppercase">COBRADA</span>
                                               : <span className="bg-red-500 text-white px-2 py-0.5 rounded font-black text-[9px] uppercase animate-pulse">PENDIENTE DE PAGO</span>
                                          )}
                                       </div>
                                       {n.comisionAsociada && <span className="text-green-600 bg-green-500/5 px-2 py-0.5 rounded font-black border border-green-500/10">COMISIÓN: ${n.comisionAsociada.toLocaleString()}</span>}
                                   </div>
                                   <p className={'text-sm ' + (!n.leida ? 'text-white font-bold' : 'text-zinc-400')}>{n.mensaje}</p>
                                   {!n.leida && (
                                       <LegacyPortalAction kind="READ" id={n.id} onSaved={()=>void fetchData()}/>
                                   )}
                               </div>
                           ))
                       )}
                   </div>
                </div>
             </div>
          )}

            {/* 3. SECCION: GESTION DE CLIENTES ACTIVOS */}
            {activeTab === "clientes" && (
            <div className="bg-[#181920] border border-zinc-800 p-6 rounded-xl animate-fade-in max-w-6xl mx-auto">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3"><span className="bg-[#fe5000]/5 p-2 rounded-lg">💰</span> Cartera Activa de Clientes</h2>
            {solicitudes.filter(s => s.estadoEntrega === "ENTREGADO").length === 0 ? (
               <p className="text-zinc-500 text-sm">No tienes clientes con financiación activa asignados a ti.</p>
            ) : (
               <div className="grid grid-cols-1 gap-6">
                  {(() => {
                    const delivered = solicitudes.filter(s => s.estadoEntrega === "ENTREGADO");
                    const groups: Record<string, { key: string; name: string; items: any[] }> = {};
                    delivered.forEach(item => {
                       const dni = (item.datosPersonales?.numeroDni || item.numeroDni || item.dni || "").trim().replace(/\D/g, "");
                       const cuil = (item.cuil || item.datosPersonales?.cuil || "").trim().replace(/\D/g, "");
                       const key = dni || cuil || item.id;
                       if (!groups[key]) {
                          groups[key] = { key, name: item.datosPersonales?.nombreCompleto || "Cliente", items: [] };
                       }
                       groups[key].items.push(item);
                    });
                    
                    return Object.values(groups).map((group: any) => {
                       const activeId = activeProductSolId[group.key] || group.items[0].id;
                       const sol = group.items.find((x: any) => x.id === activeId) || group.items[0];
                       const est = calcularEstadoCuotas(sol.planPagos);
                       if (est.restantes === 0 && est.pagadas > 0) return null;
                       
                       return (
                          <div key={group.key} className="bg-[#121316] border border-zinc-800 p-6 rounded-2xl flex flex-col gap-3 relative shadow-2xl shadow-black/80 overflow-hidden hover:border-zinc-800 transition-all">
                             {est.atrasadas > 0 && <span className="absolute top-0 right-0 bg-red-600 text-[10px] text-white font-black px-4 py-1.5 rounded-bl-xl uppercase shadow-md animate-pulse tracking-widest text-shadow">🛑 MOROSO ({est.atrasadas})</span>}
                             
                             <div className="flex flex-col border-b border-zinc-800 pb-3">
                               <h3 className="text-xl font-black text-white mb-1">{group.name}</h3>
                               {group.items.length > 1 ? (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                     {group.items.map((item: any) => (
                                        <button
                                           key={item.id}
                                           onClick={() => setActiveProductSolId(prev => ({ ...prev, [group.key]: item.id }))}
                                           className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${item.id === sol.id ? 'bg-yellow-500 text-black' : 'bg-[#181920] text-zinc-400 border border-zinc-800'}`}
                                        >
                                           📺 {item.productoDeseado || "Producto"}
                                        </button>
                                     ))}
                                  </div>
                               ) : (
                                  <p className="text-zinc-500 text-xs flex items-center gap-2">📱 {sol.datosPersonales?.telefono} <span className="text-[#fe5000]/50">|</span> 📺 {sol.productoDeseado}</p>
                               )}
                             </div>

                         {/* RESUMEN DEUDA REDISEÑADO */}
                         <div className="grid grid-cols-3 gap-3 text-center my-1 rounded-xl p-1">
                             <div className="bg-green-500/5 border border-green-500/20 p-2 rounded-xl flex flex-col justify-center items-center shadow-inner">
                                <p className="text-2xl font-black text-green-400">{est.pagadas}</p>
                                <p className="text-[9px] text-green-400/80 uppercase font-bold tracking-wider">Pagadas</p>
                             </div>
                             <div className="bg-[#fe5000]/5 border border-zinc-800 p-2 rounded-xl flex flex-col justify-center items-center shadow-inner">
                                <p className="text-2xl font-black text-[#fe5000]">{est.restantes}</p>
                                <p className="text-[9px] text-[#fe5000]/60 uppercase font-bold tracking-wider">Restantes</p>
                             </div>
                             <div className={'p-2 rounded-xl flex flex-col justify-center items-center border ' + (est.atrasadas > 0 ? 'bg-red-500/5 border-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-[#121316] border-zinc-800 shadow-inner')}>
                                <p className={'text-2xl font-black ' + (est.atrasadas > 0 ? 'text-red-500' : 'text-zinc-500')}>{est.atrasadas}</p>
                                <p className={'text-[9px] uppercase font-bold tracking-wider ' + (est.atrasadas > 0 ? 'text-red-400' : 'text-zinc-500')}>Vencidas</p>
                             </div>
                         </div>
                         {est.atrasadas > 0 && (
                            <p className="text-xs text-red-500 font-bold bg-red-900/20 py-2 px-3 rounded-lg flex items-center gap-2 border border-red-500/20">
                               🔥 Deuda Inmediata: ${est.montcAtrasado}
                            </p>
                         )}

                         <button onClick={() => setExpandedCarteraId(expandedCarteraId === sol.id ? null : sol.id)} className="w-full bg-zinc-800/80 text-white font-bold py-3 rounded-lg text-xs hover:bg-gray-200 transition border border-zinc-800 mt-2 shadow-sm flex justify-center items-center gap-2">
                            {expandedCarteraId === sol.id ? "Ocultar Panel de Gestión" : "Abrir Panel y Pagos 💳"}
                         </button>

                         {expandedCarteraId === sol.id && (
                           <div className="mt-4 pt-4 border-t border-zinc-800 animate-fade-in flex flex-col gap-4">
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* PAGOS REALIZADOS */}
                                  <div className="bg-green-950/20 p-3 rounded-xl border border-green-500/20 shadow-inner">
                                     <h4 className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-3 flex items-center gap-2">✓ Últimos Pagos Registrados</h4>
                                     {!sol.planPagos ? <p className="text-[10px] text-zinc-500">Sin vector</p> : sol.planPagos.filter((c: any) => c.estado === "PAGADO").length === 0 ? (
                                        <p className="text-xs text-zinc-500 italic text-center py-2">Ningún pago aportado aún.</p>
                                     ) : (
                                        <div className="space-y-2">
                                           {sol.planPagos.filter((c: any) => c.estado === "PAGADO").slice(-3).map((cuota: any, idx: number) => (
                                              <div key={idx} className="bg-[#181920] border border-green-500/10 p-2 rounded-lg flex justify-between items-center text-[10px]">
                                                 <div className="flex flex-col">
                                                    <span className="text-white font-bold text-[11px]">Cuota {cuota.numero} - ${cuota.montoRealmenteCobrado || cuota.montoAbonadoReal || cuota.montoAbonado || cuota.montoOriginal}</span>
                                                    <span className="text-zinc-500">Acordada orig: ${cuota.montoOriginal}</span>
                                                 </div>
                                                 <div className="flex flex-col items-end">
                                                    <span className="text-green-400 font-black uppercase text-[9px] bg-green-500/20 px-2 py-0.5 rounded">Rendido</span>
                                                    {cuota.fechaPago && <span className="text-zinc-500 mt-1">{new Date(cuota.fechaPago).toLocaleDateString()}</span>}
                                                 </div>
                                              </div>
                                           ))}
                                        </div>
                                     )}
                                  </div>

                                  {/* CUOTAS A VENCER */}
                                  <div className="bg-yellow-950/20 p-3 rounded-xl border border-zinc-800 shadow-inner">
                                     <h4 className="text-[10px] font-bold text-[#fe5000] uppercase tracking-widest mb-3 flex items-center gap-2">⏳ Agendadas a Vencer</h4>
                                     {!sol.planPagos ? <p className="text-[10px] text-red-500">Plan no regenerado.</p> : sol.planPagos.filter((c: any) => c.estado !== "PAGADO").slice(0, 3).map((cuota: any, idx: number) => {
                                          const isAtrasada = new Date(cuota.vencimiento) < new Date();
                                          return (
                                            <div key={idx} className={'p-2 rounded-lg flex justify-between items-center text-[10px] mb-2 border ' + (isAtrasada ? 'bg-red-950/50 border-red-500/10' : 'bg-[#181920] border-zinc-800')}>
                                               <div className="flex flex-col">
                                                  <span className={'font-bold text-[11px] ' + (isAtrasada ? 'text-red-400' : 'text-zinc-300')}>Cuota {cuota.numero} - ${cuota.montoOriginal}</span>
                                                  <span className="text-zinc-500 mt-0.5">Venc: {new Date(cuota.vencimiento).toLocaleDateString()}</span>
                                               </div>
                                               <span className={'px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ' + (isAtrasada ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800/80 text-zinc-500')}>
                                                  {isAtrasada ? 'Expirada' : 'Pendiente'}
                                               </span>
                                            </div>
                                          )
                                     })}
                                  </div>
                              </div>

                              <div className="bg-[#121316]/50 p-4 rounded-xl border border-zinc-800 mt-2">
                                 <h4 className="text-white font-bold text-xs mb-3 flex items-center gap-2"><span className="bg-zinc-800/80 p-1.5 rounded">📞</span> Historial Gst. Cobranza</h4>
                                 {(!sol.historialContactos || sol.historialContactos.length === 0) ? (
                                     <p className="text-xs text-zinc-500 italic py-2">Sin gestiones previas registradas.</p>
                                 ) : (
                                     <div className="space-y-3 max-h-40 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                                        {sol.historialContactos.map((log: any) => (
                                           <div key={log.id} className="bg-[#181920] p-3 text-xs rounded-lg border border-zinc-800 hover:border-zinc-800 transition-colors">
                                               <div className="flex justify-between items-center mb-1">
                                                 <span className="text-[10px] text-zinc-500 font-bold">{new Date(log.fecha).toLocaleString()}</span>
                                                 <span className="text-[9px] bg-zinc-800/80 text-zinc-500 px-2 py-0.5 rounded uppercase">{log.usuario}</span>
                                               </div>
                                               <p className="text-zinc-400 mt-1">{log.nota}</p>
                                               {log.promesaPago && <p className="text-[#fe5000] text-[10px] font-bold mt-2 bg-[#fe5000]/5 w-fit px-2 py-1 rounded">📅 Promesa al {new Date(log.promesaPago + "T12:00:00").toLocaleDateString()}</p>}
                                           </div>
                                        ))}
                                     </div>
                                 )}

                                 <LegacyPortalAction kind="NOTE" id={sol.id} source={sol.sourceCollection} onSaved={()=>void fetchData()}/>
                                 <p className="text-xs text-zinc-400">La gestión no registra una promesa financiera. Para agendarla, contactá a Administración.</p>
                              </div>
                           </div>
                         )}
                      </div>
                       )
                    })
                 })()}
               </div>
            )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AfiliadoPage(){const {user}=useAuth();return <AfiliadoPortal key={user?.uid||'anonymous'}/>;}
