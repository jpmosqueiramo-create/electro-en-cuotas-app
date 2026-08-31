"use client";

import { useAuth } from "@/components/AuthProvider";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, getDocs, query, where, Timestamp, updateDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { 
  Package, CreditCard, Calendar, CheckCircle2, Clock, AlertTriangle, 
  UserCheck, ShieldCheck, LogOut, ShoppingBag, Edit3, Link2, Upload, 
  ChevronRight, Phone, MapPin, FileText, Sparkles, Filter
} from "lucide-react";

type Solicitud = {
  id: string;
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

export default function ClientePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [tieneUnlinked, setTieneUnlinked] = useState(false);
  const [dniVincular, setDniVincular] = useState("");
  const [vinculando, setVinculando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
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
  const [antiguedadLaboral, setAntiguedadLaboral] = useState("");
  
  // Archivos Formulario Nuevo Credito
  const [producto, setProducto] = useState("");
  const [productoId, setProductoId] = useState("");
  const [planElegido, setPlanElegido] = useState("");
  const [montoCuota, setMontoCuota] = useState(0);
  const [productoObj, setProductoObj] = useState<any>(null);

  const [dniFrente, setDniFrente] = useState<File | null>(null);
  const [dniDorso, setDniDorso] = useState<File | null>(null);
  const [reciboSueldo, setReciboSueldo] = useState<File | null>(null);
  const [servicio, setServicio] = useState<File | null>(null);

  useEffect(() => {
    if (productoId && productoId !== "sin-id") {
      const fetchProd = async () => {
        try {
          const d = await getDoc(doc(db, "productos", productoId));
          if (d.exists()) {
            const pData = d.data();
            setProductoObj({ id: d.id, ...pData });
            const plan = planElegido || "12";
            setPlanElegido(plan);
            setMontoCuota(plan === "8" ? pData.cuota8 : pData.cuota12);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchProd();
    }
  }, [productoId, planElegido]);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const mem = localStorage.getItem("datosPreliminares");
        if (mem) {
          const data = JSON.parse(mem);
          if(data.productoNombre && !producto) setProducto(data.productoNombre);
          if(data.productoId) setProductoId(data.productoId);
          if(data.planElegido) setPlanElegido(data.planElegido);
          if(data.montoCuota) setMontoCuota(data.montoCuota);
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
      } else if (user.email !== "jpmosqueiramo@gmail.com") {
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

  const fetchSolicitudes = async () => {
    if (!user) return;
    try {
      const processedIds = new Set<string>();
      const allMatching: Solicitud[] = [];
      const knownDnis = new Set<string>();
      const knownCuils = new Set<string>();

      const emailLower = (user.email || "").trim().toLowerCase();
      const emailRaw = (user.email || "").trim();

      // 1. Query by clienteId
      const qUid = query(collection(db, "solicitudes"), where("clienteId", "==", user.uid));
      const snapUid = await getDocs(qUid);
      snapUid.forEach(docSnap => {
        processedIds.add(docSnap.id);
        const data = docSnap.data();
        allMatching.push({ id: docSnap.id, ...data } as Solicitud);
        
        const dni = (data.datosPersonales?.numeroDni || data.numeroDni || data.dni || "").toString().replace(/\D/g, "");
        if (dni) knownDnis.add(dni);
        
        const cuil = (data.datosPersonales?.cuil || data.cuil || "").toString().replace(/\D/g, "");
        if (cuil) knownCuils.add(cuil);
      });

      // 2. Query by Email
      const emailQueries = [
        query(collection(db, "solicitudes"), where("clienteEmail", "==", emailRaw)),
        query(collection(db, "solicitudes"), where("clienteEmail", "==", emailLower)),
        query(collection(db, "solicitudes"), where("datosPersonales.email", "==", emailRaw)),
        query(collection(db, "solicitudes"), where("datosPersonales.email", "==", emailLower))
      ];

      for (const qObj of emailQueries) {
        try {
          const snapEmail = await getDocs(qObj);
          snapEmail.forEach(docSnap => {
            const data = docSnap.data();
            const dni = (data.datosPersonales?.numeroDni || data.numeroDni || data.dni || "").toString().replace(/\D/g, "");
            if (dni) knownDnis.add(dni);
            const cuil = (data.datosPersonales?.cuil || data.cuil || "").toString().replace(/\D/g, "");
            if (cuil) knownCuils.add(cuil);

            if (!processedIds.has(docSnap.id)) {
              processedIds.add(docSnap.id);
              allMatching.push({ id: docSnap.id, ...data } as Solicitud);
            }
          });
        } catch (e) {}
      }

      if (numeroDni) {
        const cleanStateDni = numeroDni.replace(/\D/g, "");
        if (cleanStateDni) knownDnis.add(cleanStateDni);
      }

      // 3. Query by DNI & CUIL
      const dniArray = Array.from(knownDnis);
      const cuilArray = Array.from(knownCuils);

      for (const dniClean of dniArray) {
        if (!dniClean) continue;
        const dniQueries = [
          query(collection(db, "solicitudes"), where("datosPersonales.numeroDni", "==", dniClean)),
          query(collection(db, "solicitudes"), where("numeroDni", "==", dniClean)),
          query(collection(db, "solicitudes"), where("dni", "==", dniClean))
        ];
        for (const qDni of dniQueries) {
          try {
            const snapDni = await getDocs(qDni);
            snapDni.forEach(docSnap => {
              const data = docSnap.data();
              if (!processedIds.has(docSnap.id)) {
                processedIds.add(docSnap.id);
                allMatching.push({ id: docSnap.id, ...data } as Solicitud);
              }
            });
          } catch (e) {}
        }
      }

      for (const cuilClean of cuilArray) {
        if (!cuilClean) continue;
        const cuilQueries = [
          query(collection(db, "solicitudes"), where("datosPersonales.cuil", "==", cuilClean)),
          query(collection(db, "solicitudes"), where("cuil", "==", cuilClean))
        ];
        for (const qCuil of cuilQueries) {
          try {
            const snapCuil = await getDocs(qCuil);
            snapCuil.forEach(docSnap => {
              const data = docSnap.data();
              if (!processedIds.has(docSnap.id)) {
                processedIds.add(docSnap.id);
                allMatching.push({ id: docSnap.id, ...data } as Solicitud);
              }
            });
          } catch (e) {}
        }
      }

      // 4. Auto-unify in Firestore for all matched solicitudes!
      for (const sol of allMatching) {
        const solData = sol as any;
        if (solData.clienteId !== user.uid || solData.clienteEmail !== user.email) {
          try {
            await updateDoc(doc(db, "solicitudes", sol.id), {
              clienteId: user.uid,
              clienteEmail: user.email
            });
            solData.clienteId = user.uid;
            solData.clienteEmail = user.email;
          } catch (err) {
            console.error("Error auto-linking solicitud:", err);
          }
        }
      }

      allMatching.sort((a, b) => {
        const dateA = a.fechaCreacion?.toDate ? a.fechaCreacion.toDate().getTime() : 0;
        const dateB = b.fechaCreacion?.toDate ? b.fechaCreacion.toDate().getTime() : 0;
        return dateB - dateA;
      });

      setSolicitudes(allMatching);
      setTieneUnlinked(false);
      if (allMatching.length > 0) {
        setMostrarFormulario(false);
      }
    } catch (e) {
      console.error("Error in fetchSolicitudes:", e);
    } finally {
      setCargandoDatos(false);
    }
  };

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
            } else if (!proximoVencimiento || new Date(c.vencimiento) < new Date(proximoVencimiento)) {
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

  const handleSubirArchivo = async (archivo: File, tipo: string) => {
    if (!user) return "";
    const storageRef = ref(storage, `comprobantes/${user.uid}/${Date.now()}_${tipo}_${archivo.name}`);
    await uploadBytes(storageRef, archivo);
    return await getDownloadURL(storageRef);
  };

  const abrirFormDatos = () => {
    if (solicitudes.length > 0 && (solicitudes[0] as any).datosPersonales) {
      const d = (solicitudes[0] as any).datosPersonales;
      if (d.telefono) setTelefono(d.telefono);
      if (d.direccion) setDireccion(d.direccion);
      if (d.localidad) setLocalidad(d.localidad);
      if (d.nombreCompleto) setNombreCompleto(d.nombreCompleto);
    }
    setMostrarFormDatos(true);
  };

  const handleActualizarDatos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubiendo(true);
    try {
      for (const sol of solicitudes) {
        const d = (sol as any).datosPersonales || {};
        const nuevosDatos = { ...d, telefono, direccion, localidad };
        await updateDoc(doc(db, "solicitudes", sol.id), { datosPersonales: nuevosDatos });
      }
      
      await addDoc(collection(db, "alertas_admin"), {
        tipo: "MODIFICACION_DATOS",
        clienteEmail: user.email,
        mensaje: `El cliente ${nombreCompleto || user.email} actualizó sus datos: Tel ${telefono}, Dir ${direccion}, Loc ${localidad}`,
        fechaCreacion: Timestamp.now(),
        leida: false
      });

      alert("¡Tus datos han sido actualizados exitosamente!");
      setMostrarFormDatos(false);
      await fetchSolicitudes();
    } catch(err) {
      console.error(err);
      alert("Hubo un error al actualizar tus datos.");
    } finally {
      setSubiendo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dniFrente || !dniDorso || !reciboSueldo || !servicio) {
      return alert("Por favor selecciona todos los documentos obligatorios.");
    }
    setSubiendo(true);

    try {
      const [urlFrente, urlDorso, urlSueldo, urlServicio] = await Promise.all([
        handleSubirArchivo(dniFrente, "dniFrente"),
        handleSubirArchivo(dniDorso, "dniDorso"),
        handleSubirArchivo(reciboSueldo, "sueldo"),
        handleSubirArchivo(servicio, "servicio")
      ]);

      let tna = 0;
      let mora = 0;
      let precioContado = 0;
      if (productoId && productoId !== "sin-id") {
        try {
          const prodSnap = await getDoc(doc(db, "productos", productoId));
          if (prodSnap.exists()) {
            const prodData = prodSnap.data();
            tna = prodData.tasaInteresTna || 0;
            mora = prodData.tasaMora || 0;
            precioContado = prodData.precioContado || 0;
          }
        } catch (e) {
          console.error("Error al obtener tasas del producto:", e);
        }
      }

      await addDoc(collection(db, "solicitudes"), {
        clienteId: user.uid,
        clienteEmail: user.email,
        datosPersonales: { nombreCompleto, numeroDni, telefono, direccion, localidad, email, antiguedadLaboral },
        productoDeseado: producto,
        productoId: productoId || "sin-id",
        planElegido: planElegido || "no-indicado",
        montoCuota: montoCuota || 0,
        precioContado: precioContado,
        tasaInteresTna: tna,
        tasaMora: mora,
        documentos: {
          dniFrente: urlFrente,
          dniDorso: urlDorso,
          reciboSueldo: urlSueldo,
          servicio: urlServicio
        },
        estado: "PENDIENTE",
        mensajeAdmin: "",
        fechaCreacion: Timestamp.now()
      });

      localStorage.removeItem("datosPreliminares");
      alert("¡Tu solicitud de crédito ha sido enviada con éxito! La revisaremos pronto.");
      setProducto(""); setNombreCompleto(""); setNumeroDni(""); setTelefono(""); setDireccion(""); setLocalidad("");
      setDniFrente(null); setDniDorso(null); setReciboSueldo(null); setServicio(null);
      setMostrarFormulario(false);
      await fetchSolicitudes();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al enviar la solicitud.");
    } finally {
      setSubiendo(false);
    }
  };

  if (loading || cargandoDatos) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-zinc-400 animate-pulse">Cargando tu Portal de Créditos Cuenta Hogar...</p>
      </div>
    );
  }

  if (!user) return null;

  if (!user.emailVerified && user.email !== "jpmosqueiramo@gmail.com") {
    return (
      <div className="min-h-screen bg-[#121316] text-white p-8 flex flex-col items-center justify-center">
        <div className="bg-[#181920] border border-zinc-800 p-8 md:p-10 rounded-3xl text-center max-w-lg shadow-2xl space-y-6">
          <div className="text-5xl">📬</div>
          <h1 className="text-2xl font-black text-white">Verificá tu correo electrónico</h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Para continuar revisando tus productos y cuotas, hacé clic en el enlace que enviamos a <strong className="text-white">{user.email}</strong>.
          </p>
          <p className="text-amber-400 font-bold text-xs bg-amber-950/30 p-3 rounded-xl border border-amber-500/20">
            💡 Si no lo encontrás, revisá tu carpeta de SPAM o Promociones.
          </p>

          <button 
            disabled={correoEnviado}
            onClick={handleReenviarCorreo}
            className="w-full bg-[#fe5000] hover:bg-[#fe5000]/90 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-50"
          >
            {correoEnviado ? "✅ Correo Reenviado. Revisá tu casilla." : "Reenviar correo de validación"}
          </button>

          <button onClick={() => window.location.reload()} className="w-full bg-[#121316] border border-zinc-700 text-zinc-300 py-3 rounded-xl font-bold text-xs hover:border-zinc-500 transition-all">
            Ya lo validé, recargar página
          </button>
          
          <button onClick={() => getAuth().signOut()} className="text-xs text-zinc-500 hover:text-red-400 font-bold transition-colors">
            ⬅️ Cerrar Sesión / Cambiar Cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121316] text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header Principal */}
        <header className="bg-[#181920] border border-zinc-800 p-5 md:p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                Portal de Créditos <Sparkles className="w-4 h-4 text-amber-400" />
              </h1>
              <p className="text-zinc-400 text-xs mt-0.5 flex items-center gap-2">
                <span>{datosClienteGlobal.nombre}</span>
                {datosClienteGlobal.dni !== "N/A" && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-amber-400 font-bold">DNI: {datosClienteGlobal.dni}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Link href="/" className="flex-1 md:flex-initial text-center bg-[#121316] hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" /> Ver Catálogo
            </Link>

            <button onClick={abrirFormDatos} className="flex-1 md:flex-initial text-center bg-[#121316] hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md">
              <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Mis Datos
            </button>

            <button onClick={() => { import("firebase/auth").then(({getAuth, signOut}) => signOut(getAuth())); router.push("/login"); }} className="bg-red-950/30 border border-red-800/40 text-red-400 hover:bg-red-900/30 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </header>

        {/* Resumen Ejecutivo de la Cuenta (Tarjetas Métricas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#181920] border border-zinc-800 p-4 rounded-2xl shadow-lg flex items-center gap-3.5">
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-amber-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-white font-mono">{solicitudes.length}</p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Productos Unificados</p>
            </div>
          </div>

          <div className="bg-[#181920] border border-zinc-800 p-4 rounded-2xl shadow-lg flex items-center gap-3.5">
            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl text-green-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-green-400 font-mono">{metricasCuenta.cuotasPagadas}</p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Cuotas Abonadas</p>
            </div>
          </div>

          <div className="bg-[#181920] border border-zinc-800 p-4 rounded-2xl shadow-lg flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border ${metricasCuenta.cuotasVencidas > 0 ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
              {metricasCuenta.cuotasVencidas > 0 ? <AlertTriangle className="w-6 h-6 animate-pulse" /> : <Clock className="w-6 h-6" />}
            </div>
            <div>
              <p className={`text-2xl font-black font-mono ${metricasCuenta.cuotasVencidas > 0 ? "text-red-400" : "text-white"}`}>
                {metricasCuenta.cuotasVencidas > 0 ? metricasCuenta.cuotasVencidas : metricasCuenta.cuotasPendientes}
              </p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                {metricasCuenta.cuotasVencidas > 0 ? "Cuotas Vencidas" : "Cuotas Restantes"}
              </p>
            </div>
          </div>

          <div className="bg-[#181920] border border-zinc-800 p-4 rounded-2xl shadow-lg flex items-center gap-3.5">
            <div className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl text-purple-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-white truncate">
                {metricasCuenta.proximoVencimiento ? new Date(metricasCuenta.proximoVencimiento).toLocaleDateString("es-AR") : "Al Día 🟢"}
              </p>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                {metricasCuenta.proximoMonto > 0 ? `$${metricasCuenta.proximoMonto.toLocaleString("es-AR")}` : "Próximo Vencimiento"}
              </p>
            </div>
          </div>
        </div>

        {/* Modal / Formulario Actualizar Datos */}
        {mostrarFormDatos && (
          <div className="bg-[#181920] border border-zinc-800 p-6 rounded-3xl shadow-2xl space-y-4 relative animate-fade-in">
            <button onClick={() => setMostrarFormDatos(false)} className="absolute top-5 right-5 text-zinc-500 hover:text-white font-bold text-sm">✕ Cerrar</button>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-blue-400" /> Actualizar Mis Datos Personales
            </h3>
            <form onSubmit={handleActualizarDatos} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Teléfono / WhatsApp</label>
                <input required value={telefono} onChange={e=>setTelefono(e.target.value)} type="tel" className="w-full bg-[#121316] border border-zinc-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Dirección Exacta</label>
                <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" className="w-full bg-[#121316] border border-zinc-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Localidad</label>
                <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" className="w-full bg-[#121316] border border-zinc-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-blue-500 font-bold" />
              </div>
              <div className="md:col-span-3 pt-2">
                <button disabled={subiendo} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider shadow-md transition-all">
                  {subiendo ? "Guardando..." : "✓ Guardar Cambios de Contacto"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal / Formulario Solicitar Nuevo Crédito */}
        {mostrarFormulario && (
          <div className="bg-[#181920] border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 relative animate-fade-in">
            <button onClick={() => setMostrarFormulario(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white font-bold text-sm">✕ Cancelar</button>
            
            <div className="border-b border-zinc-800 pb-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" /> Solicitud de Nuevo Crédito
              </h2>
              <p className="text-xs text-zinc-400 mt-1">Completá tus datos y adjuntá las fotos para evaluar tu nuevo producto.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Producto Deseado</label>
                  <input required value={producto} onChange={e=>setProducto(e.target.value)} type="text" placeholder="Ej: Smart TV 50 pulg, Motorola G55..." className="w-full bg-[#121316] border border-zinc-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Nombre Completo</label>
                  <input required value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} type="text" className="w-full bg-[#121316] border border-zinc-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Número de DNI</label>
                  <input required value={numeroDni} onChange={e=>setNumeroDni(e.target.value.replace(/\D/g, ""))} type="text" className="w-full bg-[#121316] border border-zinc-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-500 font-bold font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Teléfono / WhatsApp</label>
                  <input required value={telefono} onChange={e=>setTelefono(e.target.value)} type="tel" className="w-full bg-[#121316] border border-zinc-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Dirección</label>
                  <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" className="w-full bg-[#121316] border border-zinc-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-500 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Localidad</label>
                  <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" className="w-full bg-[#121316] border border-zinc-700 p-2.5 rounded-xl text-xs text-white outline-none focus:border-amber-500 font-bold" />
                </div>
              </div>

              {/* Adjuntos */}
              <div className="bg-[#121316] p-4 rounded-2xl border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">📎 Documentación Obligatoria</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#181920] p-3 rounded-xl border border-zinc-800 text-center">
                    <label className="block text-[10px] font-bold text-zinc-300 mb-1 cursor-pointer">DNI Frente</label>
                    <input type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setDniFrente(e.target.files[0])}} className="text-[9px] w-full text-zinc-400" />
                  </div>
                  <div className="bg-[#181920] p-3 rounded-xl border border-zinc-800 text-center">
                    <label className="block text-[10px] font-bold text-zinc-300 mb-1 cursor-pointer">DNI Dorso</label>
                    <input type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setDniDorso(e.target.files[0])}} className="text-[9px] w-full text-zinc-400" />
                  </div>
                  <div className="bg-[#181920] p-3 rounded-xl border border-zinc-800 text-center">
                    <label className="block text-[10px] font-bold text-zinc-300 mb-1 cursor-pointer">Recibo Sueldo</label>
                    <input type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setReciboSueldo(e.target.files[0])}} className="text-[9px] w-full text-zinc-400" />
                  </div>
                  <div className="bg-[#181920] p-3 rounded-xl border border-zinc-800 text-center">
                    <label className="block text-[10px] font-bold text-zinc-300 mb-1 cursor-pointer">Servicio / Factura</label>
                    <input type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setServicio(e.target.files[0])}} className="text-[9px] w-full text-zinc-400" />
                  </div>
                </div>
              </div>

              <button disabled={subiendo} type="submit" className="w-full bg-[#fe5000] hover:bg-[#fe5000]/90 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-wider shadow-lg transition-all">
                {subiendo ? "Enviando Solicitud..." : "Enviar Solicitud a Evaluación"}
              </button>
            </form>
          </div>
        )}

        {/* Barra de Filtros de Productos y Botón Nuevo Crédito */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#181920] p-4 rounded-2xl border border-zinc-800 shadow-md">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFiltroVista("TODOS")} 
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${filtroVista === "TODOS" ? "bg-[#fe5000] text-white shadow-md" : "bg-[#121316] text-zinc-400 hover:text-white"}`}
            >
              Todos los Productos ({solicitudes.length})
            </button>
            <button 
              onClick={() => setFiltroVista("ENTREGADOS")} 
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${filtroVista === "ENTREGADOS" ? "bg-green-600 text-white shadow-md" : "bg-[#121316] text-zinc-400 hover:text-white"}`}
            >
              🟢 En Curso / Entregados
            </button>
            <button 
              onClick={() => setFiltroVista("EN_TRAMITE")} 
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${filtroVista === "EN_TRAMITE" ? "bg-amber-500 text-black shadow-md" : "bg-[#121316] text-zinc-400 hover:text-white"}`}
            >
              ⌛ En Trámite
            </button>
          </div>

          {!mostrarFormulario && (
            <button 
              onClick={() => setMostrarFormulario(true)} 
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all uppercase tracking-wider"
            >
              + Solicitar Nuevo Crédito
            </button>
          )}
        </div>

        {/* Lista de Solicitudes y Productos */}
        {solicitudesVisibles.length === 0 ? (
          <div className="bg-[#181920] border border-zinc-800 p-12 rounded-3xl text-center space-y-4 shadow-xl max-w-lg mx-auto">
            <div className="bg-[#121316] w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl border border-zinc-800">
              📦
            </div>
            <h3 className="text-lg font-bold text-white">No tenés productos en esta vista</h3>
            <p className="text-xs text-zinc-400">Si tenés compras o créditos en marcha, podés unificarlos con tu número de DNI.</p>
            <button onClick={() => setMostrarFormulario(true)} className="bg-[#fe5000] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md">
              Solicitar Crédito Ahora
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {solicitudesVisibles.map((sol) => {
              const est = sol.estado;
              const estEntrega = sol.estadoEntrega;
              const fechaCreacionStr = sol.fechaCreacion?.toDate ? sol.fechaCreacion.toDate().toLocaleDateString("es-AR") : "Reciente";

              return (
                <div key={sol.id} className="bg-[#181920] border border-zinc-800 rounded-3xl p-5 md:p-7 shadow-xl space-y-5 transition-all hover:border-zinc-700">
                  
                  {/* Header de Producto */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="bg-[#121316] border border-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center text-xl text-amber-400 font-bold shadow-inner">
                        📦
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
                              <span className="bg-[#121316] border border-amber-500/40 text-amber-400 font-mono font-bold px-2 py-0.5 rounded text-[10px]">
                                📜 Contrato N° {sol.nroContrato || sol.numeroContrato}
                              </span>
                            </>
                          )}
                          {sol.planElegido && (
                            <>
                              <span>•</span>
                              <span className="text-amber-400 font-bold">{sol.planElegido} Cuotas x ${sol.montoCuota || 0}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {estEntrega === "ENTREGADO" ? (
                        <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          🟢 ENTREGADO / EN CURSO
                        </span>
                      ) : est === "APROBADO" ? (
                        <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          💙 CRÉDITO APROBADO
                        </span>
                      ) : est === "RECHAZADO" ? (
                        <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                          🔴 NO APROBADO
                        </span>
                      ) : (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse">
                          ⌛ EN EVALUACIÓN
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detalle de Entrega si aplica */}
                  {estEntrega === "ENTREGADO" && (
                    <div className="bg-[#121316] p-4 rounded-2xl border border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase">🏷️ Retiro / Entrega Confirmada</p>
                        <p className="text-white font-bold mt-0.5">Anticipo abonado: <strong className="text-green-400 font-mono">${sol.montoAbonado || 0}</strong> ({sol.metodoPago || "Efectivo"})</p>
                      </div>
                      <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-lg font-bold">
                        ✓ PAGO VERIFICADO POR CENTRAL
                      </span>
                    </div>
                  )}

                  {/* Planilla de Cuotas */}
                  {sol.planPagos && sol.planPagos.length > 0 && (
                    <div className="bg-[#121316] rounded-2xl border border-zinc-800 p-4 md:p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                        <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          💳 Planilla de Pagos del Producto
                        </h4>
                        <span className="text-[10px] text-zinc-400 font-mono font-bold">
                          {sol.planPagos.filter((c:any) => c.estado === "PAGADO").length} de {sol.planPagos.length} pagadas
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                        {sol.planPagos.map((cuota: any, idx: number) => {
                          const isEligibleToPay = !sol.planPagos!.slice(0, idx).some((c:any) => c.estado === "PENDIENTE");
                          const isVencida = cuota.estado !== "PAGADO" && new Date(cuota.vencimiento) < new Date();

                          return (
                            <div key={idx} className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${cuota.estado === "PAGADO" ? "bg-green-950/20 border-green-500/20" : cuota.estado === "EN_REVISION" ? "bg-blue-950/30 border-blue-500/30" : isVencida ? "bg-red-950/30 border-red-500/30" : "bg-[#181920] border-zinc-800"}`}>
                              <div>
                                <p className="font-bold text-white flex items-center gap-2">
                                  <span>Cuota {cuota.numero} de {sol.planPagos!.length}</span>
                                  <span className="text-amber-400 font-mono font-black">${cuota.montoOriginal}</span>
                                </p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  Vencimiento: {new Date(cuota.vencimiento).toLocaleDateString("es-AR")}
                                </p>
                                {cuota.notaAcumulacion && (
                                  <p className="text-[10px] text-orange-400 font-bold mt-1 bg-orange-950/40 border border-orange-500/30 px-2 py-0.5 rounded w-fit">
                                    {cuota.notaAcumulacion}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col md:items-end gap-2">
                                {cuota.estado === "PAGADO" && (
                                  <div className="flex items-center gap-2">
                                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase">✓ PAGADA</span>
                                    {cuota.comprobanteUrl && (
                                      <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-md">
                                        📄 Ver Recibo
                                      </a>
                                    )}
                                  </div>
                                )}

                                {cuota.estado === "EN_REVISION" && (
                                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse">
                                    ⌛ AUDITANDO PAGO CON CENTRAL...
                                  </span>
                                )}

                                {cuota.estado === "PENDIENTE" && (
                                  <div className="flex flex-col md:items-end gap-2 bg-[#121316] p-3 rounded-xl border border-zinc-800 w-full md:w-auto">
                                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${isVencida ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>
                                      {isVencida ? "🔴 VENCIDA" : "PENDIENTE DE PAGO"}
                                    </span>

                                    {isEligibleToPay ? (
                                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <input 
                                          type="number" 
                                          id={`monto_${sol.id}_${idx}`} 
                                          defaultValue={cuota.montoOriginal} 
                                          min="1" 
                                          className="w-24 bg-[#181920] border border-zinc-700 text-white p-1.5 rounded-lg text-xs font-mono font-bold outline-none focus:border-amber-500" 
                                        />
                                        <input 
                                          type="file" 
                                          id={`comprobante_${sol.id}_${idx}`} 
                                          accept="image/*,application/pdf" 
                                          className="text-[9px] text-zinc-400 file:bg-amber-500 file:text-black file:border-0 file:rounded file:px-2 file:py-1 file:font-bold hover:file:bg-amber-400" 
                                        />
                                        <button 
                                          id={`btn_${sol.id}_${idx}`}
                                          onClick={async () => {
                                            const el = document.getElementById(`comprobante_${sol.id}_${idx}`) as HTMLInputElement;
                                            if(!el.files || el.files.length === 0) return alert("Selecciona el comprobante o foto del recibo primero.");
                                            const montoInput = document.getElementById(`monto_${sol.id}_${idx}`) as HTMLInputElement;
                                            const montoReportado = Number(montoInput.value) || 0;
                                            if (montoReportado <= 0) return alert("Ingresa el monto abonado.");

                                            const btn = document.getElementById(`btn_${sol.id}_${idx}`) as HTMLButtonElement;
                                            btn.innerText = "Subiendo...";
                                            btn.disabled = true;

                                            try {
                                              const url = await handleSubirArchivo(el.files[0], `cuota_${cuota.numero}_${sol.id}`);
                                              const newPlan = [...(sol as any).planPagos];
                                              const diferencia = cuota.montoOriginal - montoReportado;
                                              
                                              if (diferencia > 0) {
                                                  newPlan[idx].montoOriginal = montoReportado;
                                                  if (idx + 1 < newPlan.length) {
                                                      newPlan[idx + 1].montoOriginal += diferencia;
                                                      newPlan[idx + 1].notaAcumulacion = `+ $${diferencia} adeudado de cuota ${cuota.numero}`;
                                                  } else {
                                                      const vencOriginal = new Date(cuota.vencimiento);
                                                      vencOriginal.setMonth(vencOriginal.getMonth() + 1);
                                                      newPlan.push({
                                                          numero: cuota.numero + 1,
                                                          montoOriginal: diferencia,
                                                          montoAbonado: 0,
                                                          estado: "PENDIENTE",
                                                          vencimiento: vencOriginal.toISOString(),
                                                          fechaPago: null,
                                                          metodoPago: null,
                                                          comprobanteUrl: null,
                                                          notaAcumulacion: `Saldo pendiente de la cuota ${cuota.numero}`
                                                      });
                                                  }
                                              }
                                              
                                              newPlan[idx] = {
                                                ...newPlan[idx],
                                                estado: "EN_REVISION",
                                                comprobanteUrl: url,
                                                montoAbonadoReportado: montoReportado,
                                                fechaReporte: new Date().toISOString()
                                              };

                                              await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan });
                                              
                                              await addDoc(collection(db, "alertas_admin"), {
                                                tipo: "PAGO_CUOTA",
                                                clienteEmail: user.email,
                                                mensaje: `El cliente ${datosClienteGlobal.nombre} subió recibo para la Cuota ${cuota.numero} ($${montoReportado}) de ${sol.productoDeseado}.`,
                                                fechaCreacion: Timestamp.now(),
                                                leida: false
                                              });

                                              alert("¡Recibo subido con éxito! La central verificará el importe.");
                                              fetchSolicitudes();
                                            } catch(err) {
                                              console.error(err);
                                              alert("Error al subir el comprobante.");
                                              btn.innerText = "Subir Recibo";
                                              btn.disabled = false;
                                            }
                                          }}
                                          className="bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-md transition-all"
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
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #52525b; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #f59e0b; }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}
