"use client";

import { ClientServicesV2 } from '@/components/operations/ClientServicesV2';
import { isAdminEmail } from "@/lib/adminIdentity";

import { useAuth } from "@/components/AuthProvider";
import {legacyBlockedMessage,restoreLegacyDates} from "@/lib/legacyPortalClient";
import { getAuth, sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchPublicCatalogReference } from "@/lib/publicCatalogClient";
import { selectPublishedPlan } from "@/lib/publicCatalogContract";
import type { CatalogReferencePublic } from "@/lib/catalogReference";
import { useEffect, useState, useMemo } from "react";
import { 
  Package, CreditCard, Calendar, CheckCircle2, Clock, AlertTriangle, 
  UserCheck, ShieldCheck, LogOut, ShoppingBag, Edit3, Link2, Upload, 
  ChevronRight, Phone, MapPin, FileText, Sparkles, Filter, Truck, FileCheck
} from "lucide-react";

type Solicitud = {
  id: string;
  recordKey?:string;
  estado: "PENDIENTE" | "APROBADO" | "RECHAZADO" | "REQUIERE_INFO";
  mensajeAdmin?: string;
  fechaCreacion: any;
  productoDeseado: string;
  planElegido?: string;
  montoCuota?: number;
  planPagos?: any[];
  estadoEntrega?: string;
  montoAbonado?: number;
  metodoPago?: string;
  estadoRendicion?: string;
  datosPersonales?: any;
  numeroDni?: string;
  cuil?: string;
  nroContrato?: string;
  numeroContrato?: string;
};

function ClientePortal() {
  const formatFechaVencimiento = (str: string | undefined | null) => {
    if (!str) return "-";
    try {
      const dStr = str.includes("T") ? str : str + "T12:00:00";
      return new Date(dStr).toLocaleDateString("es-AR");
    } catch (e) {
      return str;
    }
  };

  const { user, loading } = useAuth();
  const router = useRouter();

  const [historyError,setHistoryError]=useState("");
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [tieneUnlinked, setTieneUnlinked] = useState(false);
  const [dniVincular, setDniVincular] = useState("");
  const [vinculando, setVinculando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [subiendo] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarFormDatos, setMostrarFormDatos] = useState(false);
  const [filtroVista, setFiltroVista] = useState<"TODOS" | "ENTREGADOS" | "EN_TRAMITE">("TODOS");

  // Formulario - Datos Personales
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [numeroDni, setNumeroDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [email, setEmail] = useState("");
  
  // Archivos Formulario Nueva Solicitud
  const [producto, setProducto] = useState("");
  const [productoId, setProductoId] = useState("");
  const [planElegido, setPlanElegido] = useState("");

  const [productoObj, setProductoObj] = useState<CatalogReferencePublic | null>(null);
  const [referenceState, setReferenceState] = useState("empty");
  const [referenceError, setReferenceError] = useState("");

  const [, setDniFrente] = useState<File | null>(null);
  const [, setDniDorso] = useState<File | null>(null);
  const [, setReciboSueldo] = useState<File | null>(null);
  const [, setServicio] = useState<File | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
    if (controller.signal.aborted) return;
    setProductoObj(null); setReferenceError("");
    if (!productoId || productoId === "sin-id") { setReferenceState("empty"); return; }
    setReferenceState("loading");
    return fetchPublicCatalogReference(productoId, controller.signal).then(reference => {
      if (controller.signal.aborted) return;
      setProductoObj(reference); setReferenceState(reference ? "ready" : "not_found");
      if (reference) { setProducto(reference.nombre); setPlanElegido(value => selectPublishedPlan(reference, value)); }
    }).catch(error => { if (!controller.signal.aborted) { setReferenceState("error"); setReferenceError(error.message); } });
    });
    return () => controller.abort();
  }, [productoId]);

  const publicPlan = productoObj?.planesPublicados.find(plan => String(plan.cuotas) === planElegido);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const mem = localStorage.getItem("datosPreliminares");
        if (mem) {
          const data = JSON.parse(mem);
          if(data.productoNombre && !producto) setProducto(data.productoNombre);
          if(data.productoId) setProductoId(data.productoId);
          if(data.planElegido) setPlanElegido(data.planElegido);

          if(data.producto && !producto) setProducto(data.producto);
          if(data.nombreCompleto && !nombreCompleto) setNombreCompleto(data.nombreCompleto);
          if(data.numeroDni && !numeroDni) setNumeroDni(data.numeroDni);
          if(data.telefono && !telefono) setTelefono(data.telefono);
          if(data.direccion && !direccion) setDireccion(data.direccion);
          if(data.localidad && !localidad) setLocalidad(data.localidad);
          setMostrarFormulario(true);
        }
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (!isAdminEmail(user.email)) {
        try {
          const role = localStorage.getItem("userRole");
          if (role === "afiliado") {
            router.push("/login?error=unauthorized_role");
          } else if (!role) {
            localStorage.setItem("userRole", "cliente");
          }
        } catch (e) {
          console.error("LocalStorage error:", e);
        }
      }
    }
  }, [user, loading, router]);

  const fetchSolicitudes = async () => {if(!user)return;try{const r=await fetch('/api/cliente/historial',{cache:'no-store',headers:{Authorization:'Bearer '+await user.getIdToken()}});const data=await r.json();if(!r.ok)throw Error(data.error);setSolicitudes(restoreLegacyDates(data.solicitudes));setHistoryError(data.warnings.join(' '));setTieneUnlinked(false);if(data.solicitudes.length)setMostrarFormulario(false);}catch(e){setHistoryError(e instanceof Error?e.message:'No se pudo consultar el historial.');}finally{setCargandoDatos(false);}};

  useEffect(() => {
    if (user) {
      fetchSolicitudes();
      if (user.email && !email) {
        setEmail(user.email);
      }
    }
  }, [user]);

  const datosClienteGlobal = useMemo(() => {
    if (solicitudes.length === 0) return { nombre: "", dni: "", tel: "", dir: "", loc: "" };
    const s0 = solicitudes[0] as any;
    const d = s0.datosPersonales || {};
    return {
      nombre: d.nombreCompleto || s0.nombreCompleto || s0.clienteNombre || "Cliente",
      dni: d.numeroDni || s0.numeroDni || s0.dni || "N/A",
      tel: d.telefono || s0.whatsapp || "",
      dir: d.direccion || s0.direccion || "",
      loc: d.localidad || s0.localidad || ""
    };
  }, [solicitudes]);

  const primerNombre = useMemo(() => {
    if (!datosClienteGlobal.nombre || datosClienteGlobal.nombre === "Cliente") return "";
    return datosClienteGlobal.nombre.trim().split(" ")[0];
  }, [datosClienteGlobal.nombre]);

  const dniMasked = useMemo(() => {
    const raw = (datosClienteGlobal.dni || "").replace(/\D/g, "");
    if (!raw || raw.length < 4) return "";
    return `DNI terminado en ${raw.slice(-4)}`;
  }, [datosClienteGlobal.dni]);

  const metricasCuenta = useMemo(() => {
    let cuotasPagadas = 0;
    let cuotasPendientes = 0;
    let cuotasVencidas = 0;
    let proximoVencimiento: string | null = null;
    let proximoMonto = 0;

    const hoy = new Date();

    solicitudes.forEach(s => {
      if (s.planPagos && Array.isArray(s.planPagos)) {
        s.planPagos.forEach(c => {
          if (c.estado === "PAGADO") {
            cuotasPagadas++;
          } else {
            cuotasPendientes++;
            if (new Date(c.vencimiento) < hoy) {
              cuotasVencidas++;
            }
            if (!proximoVencimiento || new Date(c.vencimiento) < new Date(proximoVencimiento)) {
              proximoVencimiento = c.vencimiento;
              proximoMonto = c.montoOriginal || 0;
            }
          }
        });
      }
    });

    return { cuotasPagadas, cuotasPendientes, cuotasVencidas, proximoVencimiento, proximoMonto };
  }, [solicitudes]);

  const solicitudesVisibles = useMemo(() => {
    if (filtroVista === "ENTREGADOS") {
      return solicitudes.filter(s => s.estadoEntrega === "ENTREGADO");
    }
    if (filtroVista === "EN_TRAMITE") {
      return solicitudes.filter(s => s.estadoEntrega !== "ENTREGADO");
    }
    return solicitudes;
  }, [solicitudes, filtroVista]);

  const handleReenviarCorreo = async () => {
    if (!user) return;
    try {
      const auth = getAuth();
      if(auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setCorreoEnviado(true);
      }
    } catch (error: any) {
      if(error.code === "auth/too-many-requests") {
        alert("Ya enviamos un correo recientemente. Por favor espera unos minutos y revisa la carpeta SPAM.");
      } else {
        alert("Error al intentar enviar el correo. Intenta de nuevo.");
      }
    }
  };





  const handleActualizarDatos = async (e: React.FormEvent) => {e.preventDefault();alert(legacyBlockedMessage);};

  const handleSubmit = async (e: React.FormEvent) => {e.preventDefault();alert(legacyBlockedMessage);};

  if (loading || cargandoDatos) {
    return (
      <div className="min-h-screen bg-[#111318] flex flex-col items-center justify-center text-white space-y-4 font-sans">
        <div className="w-12 h-12 border-4 border-[#FFD21A] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-zinc-400 animate-pulse">Cargando tu Portal del Cliente...</p>
      </div>
    );
  }

  if (!user) return null;

  if (!user.emailVerified && !isAdminEmail(user.email)) {
    return (
      <div className="min-h-screen bg-[#111318] text-white p-6 md:p-8 flex flex-col items-center justify-center font-sans">
        <div className="bg-[#1B2027] border border-[#252A32] p-8 md:p-10 rounded-3xl text-center max-w-lg shadow-2xl space-y-6">
          <div className="text-5xl">📬</div>
          <h1 className="text-2xl font-black text-white">Verificá tu correo electrónico</h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Para continuar revisando tus operaciones y cuotas, hacé clic en el enlace que enviamos a <strong className="text-white">{user.email}</strong>.
          </p>
          <p className="text-[#FFD21A] font-bold text-xs bg-[#111318] p-3.5 rounded-xl border border-[#FFD21A]/20">
            Si no lo encontrás, revisá tu carpeta de SPAM o Promociones.
          </p>

          <button 
            disabled={correoEnviado}
            onClick={handleReenviarCorreo}
            className="w-full bg-[#FFD21A] hover:bg-[#E8B900] text-[#111318] py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50"
          >
            {correoEnviado ? "Correo Reenviado. Revisá tu casilla." : "Reenviar correo de validación"}
          </button>

          <button onClick={() => window.location.reload()} className="w-full bg-[#111318] border border-[#252A32] text-zinc-300 py-3 rounded-xl font-bold text-xs hover:border-zinc-500 transition-all">
            Ya lo validé, recargar página
          </button>
          
          <button onClick={() => getAuth().signOut()} className="text-xs text-zinc-500 hover:text-red-400 font-bold transition-colors">
            Cerrar Sesión / Cambiar Cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111318] text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Encabezado Principal del Portal */}
        <header className="bg-[#1B2027] border border-[#252A32] p-5 md:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[#111318] border border-[#FFD21A]/30 rounded-2xl shadow-inner shrink-0">
              <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar" className="h-10 sm:h-12 w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Portal del Cliente
              </h1>
              <p className="text-zinc-400 text-xs mt-1 leading-normal flex items-center gap-2 flex-wrap">
                <span>{primerNombre ? `Hola, ${primerNombre} · ` : ""}Tus compras, cuotas y operaciones con Cuenta Hogar</span>
                {dniMasked && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-400 font-mono text-[11px]">{dniMasked}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-[#252A32]">
            <Link href="/" className="flex-1 md:flex-initial text-center bg-[#111318] hover:bg-[#252A32] border border-[#252A32] text-zinc-200 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md">
              <ShoppingBag className="w-3.5 h-3.5 text-[#FFD21A]" /> Ver opciones
            </Link>

            <button onClick={()=>alert(legacyBlockedMessage)} className="flex-1 md:flex-initial text-center bg-[#111318] hover:bg-[#252A32] border border-[#252A32] text-zinc-200 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md" disabled aria-disabled="true" style={{opacity:0.5,cursor:"not-allowed"}} title={legacyBlockedMessage}>
              <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Mis datos
            </button>

            <button onClick={() => { import("firebase/auth").then(({getAuth, signOut}) => signOut(getAuth())); router.push("/login"); }} className="bg-[#181920] border border-red-900/40 text-red-400 hover:bg-red-950/40 hover:border-red-700 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
            </button>
          </div>
        </header>

        <ClientServicesV2 key={user.uid}/>
        <p className="text-sm text-zinc-400">Resumen del circuito anterior. No incluye los servicios V2 ni informa sus cuotas, recibos o saldos.</p>
        {/* Bloques de Resumen Ejecutivo (4 Tarjetas) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Tarjeta 1: Operaciones activas */}
          <div className="bg-[#1B2027] border border-[#252A32] p-4.5 rounded-2xl shadow-lg flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-[#FFD21A]">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-white font-mono">{solicitudes.length}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">Operaciones activas</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-0.5 leading-tight">
                {solicitudes.length === 0 ? "Todavía no tenés operaciones activas" : "Solicitudes y compras en curso"}
              </p>
            </div>
          </div>

          {/* Tarjeta 2: Cuotas abonadas */}
          <div className="bg-[#1B2027] border border-[#252A32] p-4.5 rounded-2xl shadow-lg flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="bg-green-500/10 border border-green-500/20 p-2.5 rounded-xl text-green-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-green-400 font-mono">{metricasCuenta.cuotasPagadas}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">Cuotas abonadas</p>
              <p className="text-[11px] text-zinc-400 font-medium mt-0.5 leading-tight">
                {metricasCuenta.cuotasPagadas === 0 ? "Sin pagos registrados todavía" : "Cuotas confirmadas"}
              </p>
            </div>
          </div>

          {/* Tarjeta 3: Cuotas pendientes */}
          <div className="bg-[#1B2027] border border-[#252A32] p-4.5 rounded-2xl shadow-lg flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl border ${metricasCuenta.cuotasVencidas > 0 ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
                {metricasCuenta.cuotasVencidas > 0 ? <AlertTriangle className="w-5 h-5 animate-pulse" /> : <Clock className="w-5 h-5" />}
              </div>
              <span className={`text-2xl font-black font-mono ${metricasCuenta.cuotasVencidas > 0 ? "text-red-400" : "text-white"}`}>
                {metricasCuenta.cuotasVencidas > 0 ? metricasCuenta.cuotasVencidas : metricasCuenta.cuotasPendientes}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight">
                {metricasCuenta.cuotasVencidas > 0 ? "Cuotas vencidas" : "Cuotas pendientes"}
              </p>
              <p className="text-[11px] text-zinc-400 font-medium mt-0.5 leading-tight">
                {metricasCuenta.cuotasPendientes === 0 ? "No tenés cuotas pendientes" : metricasCuenta.cuotasVencidas > 0 ? "Requiere pago urgente" : "Pagos programados"}
              </p>
            </div>
          </div>

          {/* Tarjeta 4: Próximo vencimiento */}
          <div className="bg-[#1B2027] border border-[#252A32] p-4.5 rounded-2xl shadow-lg flex flex-col justify-between space-y-3 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <div className="bg-purple-500/10 border border-purple-500/20 p-2.5 rounded-xl text-purple-400">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-zinc-400 font-mono">
                {solicitudes.length === 0 ? "--" : metricasCuenta.proximoMonto > 0 ? `$${metricasCuenta.proximoMonto.toLocaleString("es-AR")}` : "--"}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight truncate">
                {solicitudes.length === 0 ? "Sin vencimientos próximos" : metricasCuenta.proximoVencimiento ? formatFechaVencimiento(metricasCuenta.proximoVencimiento) : "Sin vencimientos próximos"}
              </p>
              <p className="text-[11px] text-zinc-400 font-medium mt-0.5 leading-tight">
                {solicitudes.length === 0 ? "No tenés cuotas pendientes" : metricasCuenta.proximoMonto > 0 ? "Próximo importe a abonar" : "Sin vencimientos próximos"}
              </p>
            </div>
          </div>

        </div>

        {/* Modal / Formulario Actualizar Datos */}
        {mostrarFormDatos && (
          <div className="bg-[#1B2027] border border-[#252A32] p-6 rounded-3xl shadow-2xl space-y-4 relative animate-fade-in">
            <button onClick={() => setMostrarFormDatos(false)} className="absolute top-5 right-5 text-zinc-500 hover:text-white font-bold text-sm">✕ Cerrar</button>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-400" /> Actualizar Mis Datos Personales
            </h3>
            <form onSubmit={handleActualizarDatos} className="grid grid-cols-1 md:grid-cols-3 gap-4"><p role="status">{legacyBlockedMessage} <Link href="/solicitar" className="underline">Ir a solicitud pública</Link></p><fieldset disabled className="contents">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Teléfono / WhatsApp</label>
                <input required value={telefono} onChange={e=>setTelefono(e.target.value)} type="tel" className="w-full bg-[#111318] border border-[#252A32] p-2.5 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Dirección Exacta</label>
                <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" className="w-full bg-[#111318] border border-[#252A32] p-2.5 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Localidad</label>
                <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" className="w-full bg-[#111318] border border-[#252A32] p-2.5 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-bold" />
              </div>
              <div className="md:col-span-3 pt-2">
                <button disabled={subiendo} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider shadow-md transition-all">
                  {subiendo ? "Guardando..." : "✓ Guardar Cambios de Contacto"}
                </button>
              </div>
            </fieldset></form>
          </div>
        )}

        {/* Modal / Formulario Solicitar Nueva Compra */}
        {mostrarFormulario && (
          <div className="bg-[#1B2027] border border-[#252A32] p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 relative animate-fade-in">
            <button onClick={() => setMostrarFormulario(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white font-bold text-sm">✕ Cancelar</button>
            
            <div className="border-b border-[#252A32] pb-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FFD21A]" /> Solicitud de Compra
              </h2>
              <p className="text-xs text-zinc-400 mt-1">Completá tus datos y la información del bien para preparar tu propuesta.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6"><p role="status">{legacyBlockedMessage} <Link href="/solicitar" className="underline">Ir a solicitud pública</Link></p><fieldset disabled className="contents">
              {referenceState === "loading" && <p role="status">Cargando referencia…</p>}
              {referenceState === "error" && <p role="alert">{referenceError}</p>}
              {referenceState === "not_found" && <p role="alert">Esta referencia ya no está disponible.</p>}
              {productoObj && <div data-public-reference={productoObj.referenciaId} className="rounded-xl border border-[#252A32] p-4 space-y-3">
                <p>Referencia de compra: {productoObj.nombre}</p>
                <label className="block">Plan publicado<select aria-label="Plan publicado" required className="block min-h-11 w-full rounded-xl border border-[#252A32] bg-[#111318] p-3 text-sm text-white" value={planElegido} onChange={event => setPlanElegido(event.target.value)}>
                  <option value="">Elegí un plan publicado</option>{productoObj.planesPublicados.map(plan => <option key={plan.cuotas} value={String(plan.cuotas)}>{plan.cuotas} cuotas estimadas</option>)}
                </select></label>
                <p data-public-amount>Cuota estimada: {publicPlan ? publicPlan.cuotaEstimada.toLocaleString("es-AR", { style: "currency", currency: "ARS" }) : "Elegí un plan disponible"}</p>
              </div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Producto o Bien Deseado</label>
                  <input required value={producto} onChange={e=>setProducto(e.target.value)} type="text" placeholder="Ej: Heladera No Frost 380 L, Smart TV 50 pulg..." className="w-full bg-[#111318] border border-[#252A32] p-2.5 rounded-xl text-xs text-white outline-none focus:border-[#FFD21A] font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nombre Completo</label>
                  <input required value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} type="text" className="w-full bg-[#111318] border border-[#252A32] p-2.5 rounded-xl text-xs text-white outline-none focus:border-[#FFD21A] font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Número de DNI</label>
                  <input required value={numeroDni} onChange={e=>setNumeroDni(e.target.value.replace(/\D/g, ""))} type="text" className="w-full bg-[#111318] border border-[#252A32] p-2.5 rounded-xl text-xs text-white outline-none focus:border-[#FFD21A] font-bold font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Teléfono / WhatsApp</label>
                  <input required value={telefono} onChange={e=>setTelefono(e.target.value)} type="tel" className="w-full bg-[#111318] border border-[#252A32] p-2.5 rounded-xl text-xs text-white outline-none focus:border-[#FFD21A] font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Dirección</label>
                  <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" className="w-full bg-[#111318] border border-[#252A32] p-2.5 rounded-xl text-xs text-white outline-none focus:border-[#FFD21A] font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Localidad</label>
                  <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" className="w-full bg-[#111318] border border-[#252A32] p-2.5 rounded-xl text-xs text-white outline-none focus:border-[#FFD21A] font-bold" />
                </div>
              </div>

              {/* Adjuntos */}
              <div className="bg-[#111318] p-4 rounded-2xl border border-[#252A32] space-y-3">
                <h4 className="text-xs font-bold text-[#FFD21A] uppercase tracking-wider">📎 Documentación de Verificación</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#1B2027] p-3 rounded-xl border border-[#252A32] text-center">
                    <label className="block text-[10px] font-bold text-zinc-300 mb-1 cursor-pointer">DNI Frente</label>
                    <input type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setDniFrente(e.target.files[0])}} className="text-[9px] w-full text-zinc-400" />
                  </div>
                  <div className="bg-[#1B2027] p-3 rounded-xl border border-[#252A32] text-center">
                    <label className="block text-[10px] font-bold text-zinc-300 mb-1 cursor-pointer">DNI Dorso</label>
                    <input type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setDniDorso(e.target.files[0])}} className="text-[9px] w-full text-zinc-400" />
                  </div>
                  <div className="bg-[#1B2027] p-3 rounded-xl border border-[#252A32] text-center">
                    <label className="block text-[10px] font-bold text-zinc-300 mb-1 cursor-pointer">Recibo Sueldo</label>
                    <input type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setReciboSueldo(e.target.files[0])}} className="text-[9px] w-full text-zinc-400" />
                  </div>
                  <div className="bg-[#1B2027] p-3 rounded-xl border border-[#252A32] text-center">
                    <label className="block text-[10px] font-bold text-zinc-300 mb-1 cursor-pointer">Servicio / Factura</label>
                    <input type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setServicio(e.target.files[0])}} className="text-[9px] w-full text-zinc-400" />
                  </div>
                </div>
              </div>

              <button disabled={subiendo} type="submit" className="w-full bg-[#FFD21A] hover:bg-[#E8B900] text-[#111318] font-black text-xs py-3.5 rounded-xl uppercase tracking-wider shadow-lg transition-all">
                {subiendo ? "Enviando Solicitud..." : "Enviar Solicitud de Compra"}
              </button>
            </fieldset></form>
          </div>
        )}

        <p data-testid="legacy-read-only" className="text-sm text-zinc-400">{legacyBlockedMessage}</p>{historyError&&<p role="alert">{historyError}</p>}
        {/* Barra de Filtros y CTA Principal */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#1B2027] p-4 rounded-2xl border border-[#252A32] shadow-md">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <button 
              onClick={() => setFiltroVista("TODOS")} 
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filtroVista === "TODOS" ? "bg-[#FFD21A] text-[#111318] shadow-md" : "bg-[#111318] text-zinc-400 hover:text-white"}`}
            >
              Todas las operaciones ({solicitudes.length})
            </button>
            <button 
              onClick={() => setFiltroVista("ENTREGADOS")} 
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filtroVista === "ENTREGADOS" ? "bg-green-600 text-white shadow-md" : "bg-[#111318] text-zinc-400 hover:text-white"}`}
            >
              Activas / entregadas
            </button>
            <button 
              onClick={() => setFiltroVista("EN_TRAMITE")} 
              className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filtroVista === "EN_TRAMITE" ? "bg-amber-500 text-black shadow-md" : "bg-[#111318] text-zinc-400 hover:text-white"}`}
            >
              En evaluación
            </button>
          </div>

          {!mostrarFormulario && (
            <button 
              onClick={() => setMostrarFormulario(true)} 
              className="w-full sm:w-auto bg-[#FFD21A] hover:bg-[#E8B900] text-[#111318] font-extrabold text-xs px-5 py-3 rounded-xl shadow-md transition-all uppercase tracking-wider min-h-[44px] shrink-0"
            >
              + SOLICITAR UNA COMPRA
            </button>
          )}
        </div>

        {/* Lista de Operaciones / Empty State */}
        {solicitudesVisibles.length === 0 ? (
          <div className="bg-[#1B2027] border border-[#252A32] p-6 sm:p-10 md:p-12 rounded-3xl text-center space-y-6 shadow-xl w-full mx-auto animate-fade-in">
            <div className="bg-[#111318] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-amber-400 border border-[#252A32] shadow-inner">
              <ShoppingBag className="w-8 h-8 text-[#FFD21A]" />
            </div>
            
            <div className="space-y-2 max-w-xl mx-auto">
              <h3 className="text-xl font-black text-white">Todavía no tenés operaciones activas</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Desde acá vas a poder seguir tus solicitudes, compras gestionadas, cuotas y entregas con Cuenta Hogar.
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                Si necesitás resolver una nueva compra, contanos qué estás buscando y te ayudamos a preparar una propuesta.
              </p>
            </div>

            {/* Microbeneficios en fila discreta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto py-2 text-left sm:text-center">
              <div className="bg-[#111318] border border-[#252A32] p-3 rounded-xl flex sm:flex-col items-center sm:justify-center gap-2.5 text-xs text-zinc-300">
                <FileText className="w-4 h-4 text-[#FFD21A] shrink-0" />
                <span className="font-bold text-[11px]">Seguir tus solicitudes</span>
              </div>
              <div className="bg-[#111318] border border-[#252A32] p-3 rounded-xl flex sm:flex-col items-center sm:justify-center gap-2.5 text-xs text-zinc-300">
                <CreditCard className="w-4 h-4 text-green-400 shrink-0" />
                <span className="font-bold text-[11px]">Consultar tus cuotas</span>
              </div>
              <div className="bg-[#111318] border border-[#252A32] p-3 rounded-xl flex sm:flex-col items-center sm:justify-center gap-2.5 text-xs text-zinc-300">
                <Truck className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-bold text-[11px]">Ver el estado de tus entregas</span>
              </div>
            </div>

            {/* CTAs del Empty State */}
            <div className="pt-2 space-y-3 max-w-md mx-auto">
              <button 
                onClick={() => setMostrarFormulario(true)} 
                className="w-full bg-[#FFD21A] hover:bg-[#E8B900] text-[#111318] px-6 py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-lg transition-all min-h-[44px]"
              >
                QUIERO RECIBIR UNA PROPUESTA
              </button>
              
              <p className="text-[11px] text-zinc-400 font-medium">
                Podés consultar sin compromiso.
              </p>

              <div className="pt-1">
                <Link 
                  href="/" 
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white font-bold underline decoration-[#FFD21A]/50 transition-colors"
                >
                  <span>Ver opciones de compra</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#FFD21A]" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {solicitudesVisibles.map((sol) => {
              const est = sol.estado;
              const estEntrega = sol.estadoEntrega;
              const fechaCreacionStr = sol.fechaCreacion?.toDate ? sol.fechaCreacion.toDate().toLocaleDateString("es-AR") : "Sin fecha registrada";

              return (
                <div key={sol.recordKey || sol.id} className="bg-[#1B2027] border border-[#252A32] rounded-3xl p-5 md:p-7 shadow-xl space-y-5 transition-all hover:border-zinc-700">
                  
                  {/* Encabezado de la Operación */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#252A32] pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="bg-[#111318] border border-[#252A32] w-12 h-12 rounded-2xl flex items-center justify-center text-xl text-[#FFD21A] font-bold shadow-inner shrink-0">
                        <Package className="w-6 h-6 text-[#FFD21A]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          {sol.productoDeseado}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Solicitado el <strong className="text-white">{fechaCreacionStr}</strong></span>
                          {(sol.nroContrato || sol.numeroContrato) && (
                            <>
                              <span>•</span>
                              <span className="bg-[#111318] border border-[#FFD21A]/40 text-[#FFD21A] font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                                Legajo N° {sol.nroContrato || sol.numeroContrato}
                              </span>
                            </>
                          )}
                          {sol.planElegido && (
                            <>
                              <span>•</span>
                              <span className="text-[#FFD21A] font-bold">Plan de {sol.planElegido} cuotas x ${sol.montoCuota || 0}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {estEntrega === "ENTREGADO" ? (
                        <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-400"></span> ENTREGADA / EN CURSO
                        </span>
                      ) : est === "APROBADO" ? (
                        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400"></span> COMPRA CONFIRMADA
                        </span>
                      ) : est === "RECHAZADO" ? (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          NO PROCEDE
                        </span>
                      ) : (
                        <span className="bg-amber-500/20 text-[#FFD21A] border border-amber-500/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span> EN EVALUACIÓN
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalle de Entrega si aplica */}
                  {estEntrega === "ENTREGADO" && (
                    <div className="bg-[#111318] p-4 rounded-2xl border border-[#252A32] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Entrega Confirmada</p>
                        <p className="text-white font-bold mt-0.5">Anticipo abonado: <strong className="text-green-400 font-mono">${sol.montoAbonado || 0}</strong> ({sol.metodoPago || "Efectivo"})</p>
                      </div>
                      <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-lg font-bold">
                        ✓ PAGO VERIFICADO POR CENTRAL
                      </span>
                    </div>
                  )}

                  {/* Planilla de Cuotas */}
                  {sol.planPagos && sol.planPagos.length > 0 && (
                    <div className="bg-[#111318] rounded-2xl border border-[#252A32] p-4 md:p-5 space-y-4">
                      <div className="flex flex-wrap justify-between items-center border-b border-[#252A32] pb-3 gap-2">
                        <h4 className="text-xs font-black text-[#FFD21A] uppercase tracking-wider flex items-center gap-1.5">
                          💳 Plan de cuotas de la operación
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={()=>alert(legacyBlockedMessage)}
                            className="bg-amber-500/10 hover:bg-amber-500/20 text-[#FFD21A] border border-amber-500/30 px-3 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 shadow-sm" disabled aria-disabled="true" style={{opacity:0.5,cursor:"not-allowed"}} title={legacyBlockedMessage}
                          >
                            📊 Estado de Cuenta PDF
                          </button>
                          <span className="text-[10px] text-zinc-400 font-mono font-bold">
                            {sol.planPagos.filter((c:any) => c.estado === "PAGADO").length} de {sol.planPagos.length} pagadas
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                        {sol.planPagos.map((cuota: any, idx: number) => {
                          const isEligibleToPay = !sol.planPagos!.slice(0, idx).some((c:any) => c.estado === "PENDIENTE");
                          const isVencida = cuota.estado !== "PAGADO" && new Date(cuota.vencimiento) < new Date();

                          return (
                            <div key={idx} className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${cuota.estado === "PAGADO" ? "bg-green-950/20 border-green-500/20" : cuota.estado === "EN_REVISION" ? "bg-blue-950/30 border-blue-500/30" : isVencida ? "bg-red-950/30 border-red-500/30" : "bg-[#1B2027] border-[#252A32]"}`}>
                              <div>
                                <p className="font-bold text-white flex items-center gap-2">
                                  <span>Cuota {cuota.numero} de {sol.planPagos!.length}</span>
                                  <span className="text-[#FFD21A] font-mono font-black">${cuota.montoOriginal}</span>
                                </p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  Vencimiento: {formatFechaVencimiento(cuota.vencimiento)}
                                </p>
                                {cuota.notaAcumulacion && (
                                  <p className="text-[10px] text-orange-400 font-bold mt-1 bg-orange-950/40 border border-orange-500/30 px-2 py-0.5 rounded w-fit">
                                    {cuota.notaAcumulacion}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col md:items-end gap-2">
                                {cuota.estado === "PAGADO" && (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase">✓ PAGADA</span>
                                    {cuota.comprobanteUrl && (
                                      <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="bg-blue-600/30 border border-blue-500/30 hover:bg-blue-600 text-blue-300 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition">
                                        📄 Adjunto
                                      </a>
                                    )}
                                    <button
                                      onClick={()=>alert(legacyBlockedMessage)}
                                      className="bg-green-600 hover:bg-green-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-md transition flex items-center gap-1" disabled aria-disabled="true" style={{opacity:0.5,cursor:"not-allowed"}} title={legacyBlockedMessage}
                                    >
                                      📥 Recibo PDF
                                    </button>
                                  </div>
                                )}

                                {cuota.estado === "EN_REVISION" && (
                                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse">
                                    ⌛ AUDITANDO PAGO CON CENTRAL...
                                  </span>
                                )}

                                {cuota.estado === "PENDIENTE" && (
                                  <div className="flex flex-col md:items-end gap-2 bg-[#111318] p-3 rounded-xl border border-[#252A32] w-full md:w-auto">
                                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${isVencida ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-[#FFD21A]"}`}>
                                      {isVencida ? "🔴 VENCIDA" : "PENDIENTE DE PAGO"}
                                    </span>

                                    {isEligibleToPay ? (
                                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <input 
                                          type="number" 
                                          id={`monto_${sol.id}_${idx}`} 
                                          defaultValue={cuota.montoOriginal} 
                                          min="1" 
                                          className="w-24 bg-[#111318] border border-zinc-700 text-white p-1.5 rounded-lg text-xs font-mono font-bold outline-none focus:border-[#FFD21A]" 
                                        />
                                        <input 
                                          type="file" 
                                          id={`comprobante_${sol.id}_${idx}`} 
                                          accept="image/*,application/pdf" 
                                          className="text-[9px] text-zinc-300 file:bg-[#FFD21A] file:text-[#111318] file:border-0 file:rounded file:px-2 file:py-1 file:font-bold hover:file:bg-[#E8B900]" 
                                        />
                                        <button 
                                          id={`btn_${sol.id}_${idx}`}
                                          onClick={()=>alert(legacyBlockedMessage)}
                                          className="bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-md transition-all" disabled aria-disabled="true" style={{opacity:0.5,cursor:"not-allowed"}} title={legacyBlockedMessage}
                                        >
                                          Subir Recibo
                                        </button>
                                      </div>
                                    ) : (
                                      <p className="text-[10px] text-zinc-500 italic">Debes abonar la cuota anterior primero.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #FFD21A; }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}

export default function ClientePage(){const {user}=useAuth();return <ClientePortal key={user?.uid||'anonymous'}/>;}
