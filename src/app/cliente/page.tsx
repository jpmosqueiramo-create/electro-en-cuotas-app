"use client";

import { useAuth } from "@/components/AuthProvider";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, getDocs, query, where, Timestamp, updateDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, sendEmailVerification } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

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

  // Formulario - Datos Personales
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [numeroDni, setNumeroDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [email, setEmail] = useState("");
  const [antiguedadLaboral, setAntiguedadLaboral] = useState("");
  
  // Archivos
  const [producto, setProducto] = useState("");
  const [productoId, setProductoId] = useState("");
  const [planElegido, setPlanElegido] = useState("");
  const [montoCuota, setMontoCuota] = useState(0);
  const [productoObj, setProductoObj] = useState<any>(null);

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
  }, [productoId]);
  const [dniFrente, setDniFrente] = useState<File | null>(null);
  const [dniDorso, setDniDorso] = useState<File | null>(null);
  const [reciboSueldo, setReciboSueldo] = useState<File | null>(null);
  const [servicio, setServicio] = useState<File | null>(null);

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
          // Auto-abrir el formulario porque viene del Catálogo
          setMostrarFormulario(true);
        }
      }
    } catch(e) {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      // 1. Fetch requests linked to this UID
      const q = query(collection(db, "solicitudes"), where("clienteId", "==", user.uid));
      const snap = await getDocs(q);
      const results: Solicitud[] = [];
      snap.forEach(doc => results.push({ id: doc.id, ...doc.data() } as Solicitud));
      setSolicitudes(results);

      // Get customer DNI if they already have linked requests
      let knownDni = "";
      results.forEach(r => {
        const dni = (r.datosPersonales?.numeroDni || r.numeroDni || "").toString().replace(/\D/g, "");
        if (dni) knownDni = dni;
      });

      // 2. Fetch requests matching their email case-insensitively to see if there are unlinked ones
      const emailLower = (user.email || "").trim().toLowerCase();
      const emailRaw = (user.email || "").trim();
      
      const queries = [
        query(collection(db, "solicitudes"), where("clienteEmail", "==", emailRaw)),
        query(collection(db, "solicitudes"), where("clienteEmail", "==", emailLower))
      ];
      
      const unlinkedSols: any[] = [];
      const processedIds = new Set<string>();
      for (const qObj of queries) {
        const snapEmail = await getDocs(qObj);
        snapEmail.forEach(docSnap => {
          if (processedIds.has(docSnap.id)) return;
          processedIds.add(docSnap.id);
          const data = docSnap.data();
          if (data.clienteId !== user.uid) {
            unlinkedSols.push({ id: docSnap.id, ...data });
          }
        });
      }

      // If we have a known DNI, we can auto-link unlinked requests that match email + DNI!
      let newlyLinked = 0;
      if (knownDni && unlinkedSols.length > 0) {
        for (const sol of unlinkedSols) {
          const solDni = (sol.datosPersonales?.numeroDni || sol.numeroDni || "").toString().replace(/\D/g, "");
          if (solDni === knownDni) {
            await updateDoc(doc(db, "solicitudes", sol.id), {
              clienteId: user.uid
            });
            newlyLinked++;
          }
        }
      }

      if (newlyLinked > 0) {
        // Reload if we auto-linked anything
        const qReload = query(collection(db, "solicitudes"), where("clienteId", "==", user.uid));
        const snapReload = await getDocs(qReload);
        const reloadResults: Solicitud[] = [];
        snapReload.forEach(doc => reloadResults.push({ id: doc.id, ...doc.data() } as Solicitud));
        setSolicitudes(reloadResults);
        setTieneUnlinked(false);
      } else {
        setTieneUnlinked(unlinkedSols.length > 0);
      }
    } catch (e) {
      console.error(e);
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

  const handleReenviarCorreo = async () => {
    if (!user) return;
    try {
      const auth = getAuth();
      if(auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setCorreoEnviado(true);
      }
    } catch (error: any) {
      if(error.code === 'auth/too-many-requests') {
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
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-yellow-50 text-amber-600 font-bold text-xl animate-pulse">Estamos cargando tu Cuenta Hogar. Esto puede demorar unos segundos.</div>;
  }

  if (!user) return null;

  // VERIFICACIÓN ESTRICTA DE CORREO: Bloquear UI si no verificó el mail (excepto admin jpmosqueira)
  if (!user.emailVerified && user.email !== "jpmosqueiramo@gmail.com") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-8 flex flex-col items-center justify-center">
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white p-10 rounded-3xl text-center max-w-lg shadow-2xl shadow-amber-500/10 transition-all duration-500">
          <div className="text-6xl mb-6">📬</div>
          <h1 className="text-3xl font-black text-white mb-4">Verifica tu correo electrónico</h1>
          <p className="text-zinc-700 mb-6">
            Por estrictos motivos de seguridad y análisis de crédito, antes de poder cargar tus recibos debes comprobar que <strong>{user.email}</strong> es válido haciéndole clic al enlace que te acabamos de enviar a tu casilla.
          </p>
          <p className="text-red-400 font-bold mb-8 italic">
            Importante: Si no lo encuentras en Recibidos, revisa atentamente la carpeta de Correo no deseado (SPAM) o Promociones.
          </p>
          
          <button 
            disabled={correoEnviado}
            onClick={handleReenviarCorreo}
            className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black py-4 rounded-xl font-black hover:from-amber-500 hover:to-yellow-600 hover:-translate-y-1 hover:shadow-2xl shadow-black/60 transition-all duration-300 disabled:opacity-50"
          >
            {correoEnviado ? "✅ Correo Reenviado. Revisa tu buzón." : "No me llegó, reenviar correo de validación"}
          </button>

          <button onClick={() => window.location.reload()} className="w-full bg-transparent border-2 border-yellow-500 text-yellow-400 py-3 mt-4 rounded-xl font-bold hover:bg-yellow-500/10 transition-all duration-300">
            Ya lo validé, recargar página
          </button>
          
          <button onClick={() => getAuth().signOut()} className="w-full bg-transparent border-none text-red-500/80 hover:text-red-400 py-3 mt-2 text-sm font-bold transition-colors">
            ⬅️ Me equivoqué de correo (Cambiar de cuenta)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 text-zinc-100 p-4 sm:p-8 selection:bg-yellow-500/30 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40 backdrop-blur-md p-6 rounded-3xl border border-zinc-800/80 shadow-2xl">
          <div className="flex items-center gap-4">
            <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Cuenta Hogar Logo" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 tracking-tight">Portal de Créditos</h1>
              <p className="text-zinc-500 text-xs mt-0.5 font-bold font-mono">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Link href="/" className="flex-1 sm:flex-initial text-center text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 px-5 py-3 rounded-xl font-bold transition-all duration-300 hover:-translate-y-0.5 shadow-md">
              🛒 Catálogo
            </Link>
            <button onClick={() => { import("firebase/auth").then(({getAuth, signOut}) => signOut(getAuth())); router.push("/login"); }} className="flex-1 sm:flex-initial text-xs bg-red-950/20 border border-red-900/50 text-red-400 hover:bg-red-900/20 px-5 py-3 rounded-xl font-bold transition-all duration-300 hover:-translate-y-0.5 shadow-md">
              Cerrar Sesión
            </button>
          </div>
        </header>

        {tieneUnlinked && (
           <div className="bg-yellow-950/20 border-2 border-yellow-500/20 p-6 md:p-8 rounded-3xl shadow-2xl text-center space-y-4 max-w-lg mx-auto animate-pulse-slow">
              <span className="text-4xl">🔗</span>
              <h3 className="text-lg font-black text-yellow-400 uppercase tracking-widest">Vincular Solicitud Existente</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                 Hemos encontrado solicitudes ingresadas con tu correo electrónico. Por seguridad, ingresa tu número de DNI para vincularlas a tu cuenta:
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                 <input
                    type="text"
                    placeholder="Ingresa tu DNI"
                    value={dniVincular}
                    onChange={e => setDniVincular(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-white text-center font-bold font-mono outline-none focus:border-yellow-500 transition-all text-sm"
                 />
                 <button
                    onClick={async () => {
                       if (!dniVincular.trim()) return alert("Por favor ingresa tu DNI.");
                       setVinculando(true);
                       try {
                          const emailLower = (user.email || "").trim().toLowerCase();
                          const emailRaw = (user.email || "").trim();
                          
                          const queries = [
                            query(collection(db, "solicitudes"), where("clienteEmail", "==", emailRaw)),
                            query(collection(db, "solicitudes"), where("clienteEmail", "==", emailLower))
                          ];
                          
                          let vinculadas = 0;
                          const processedDocIds = new Set<string>();
                          
                          for (const qObj of queries) {
                             const snap = await getDocs(qObj);
                             for (const d of snap.docs) {
                                if (processedDocIds.has(d.id)) continue;
                                processedDocIds.add(d.id);
                                
                                const data = d.data();
                                const requestDni = (data.datosPersonales?.numeroDni || data.numeroDni || "").toString().replace(/\D/g, "");
                                const inputDniClean = dniVincular.replace(/\D/g, "");
                                
                                if (requestDni === inputDniClean && data.clienteId !== user.uid) {
                                   await updateDoc(doc(db, "solicitudes", d.id), {
                                      clienteId: user.uid
                                   });
                                   vinculadas++;
                                }
                             }
                          }
                          
                          if (vinculadas > 0) {
                             alert(`¡Se han vinculado con éxito ${vinculadas} solicitud(es) a tu cuenta!`);
                             setDniVincular("");
                             await fetchSolicitudes();
                          } else {
                             alert("El DNI ingresado no coincide con ninguna solicitud bajo tu correo.");
                          }
                       } catch(e) {
                          console.error(e);
                          alert("Error al vincular cuentas.");
                       } finally {
                          setVinculando(false);
                       }
                    }}
                    disabled={vinculando}
                    className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 hover:shadow-lg"
                 >
                    {vinculando ? "Vinculando..." : "Confirmar"}
                 </button>
              </div>
           </div>
        )}

        {/* Centro de Asistencia */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={abrirFormDatos}
            className="bg-zinc-900/30 backdrop-blur-md border border-zinc-850 p-6 rounded-3xl flex items-center gap-4 hover:border-yellow-500/40 hover:-translate-y-1 hover:shadow-2xl hover:shadow-yellow-500/5 active:scale-95 transition-all duration-300 group text-left"
          >
             <div className="text-4xl p-3 bg-zinc-900 rounded-2xl border border-zinc-800">📝</div>
             <div>
               <h3 className="font-black text-yellow-400 text-base group-hover:text-yellow-300 transition-colors">Actualizar mis Datos</h3>
               <p className="text-xs text-zinc-400 mt-1">Avisar si cambiaste de número o de domicilio.</p>
             </div>
          </button>
        </div>

        {mostrarFormDatos && (
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 lg:p-10 relative shadow-2xl animate-fade-in space-y-6">
            <button onClick={() => setMostrarFormDatos(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white font-bold text-sm transition-colors">✕ Cancelar</button>
            <div>
              <h2 className="text-xl font-black text-white">Actualizar Mis Datos Personal</h2>
              <p className="text-xs text-zinc-500 mt-1">Mantené tu teléfono y domicilio al día para facilitar las entregas y cobranzas.</p>
            </div>
            <form onSubmit={handleActualizarDatos} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Teléfono / Celular</label>
                <input required value={telefono} onChange={e=>setTelefono(e.target.value)} type="tel" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Dirección</label>
                <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Localidad</label>
                <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
              </div>
              <div className="md:col-span-2 pt-2">
                <button disabled={subiendo} type="submit" className="w-full bg-yellow-500 text-black py-4 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-yellow-400 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:transform-none">
                  {subiendo ? "Guardando..." : "Guardar Nuevos Datos"}
                </button>
              </div>
            </form>
          </div>
        )}

        {solicitudes.length > 0 && !mostrarFormulario && !mostrarFormDatos && (
          <div className="flex justify-end">
            <button onClick={() => setMostrarFormulario(true)} className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold py-3.5 px-8 rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-xs uppercase tracking-wider font-black">
               + Solicitar un nuevo crédito
             </button>
          </div>
        )}

        {(solicitudes.length > 0 && !mostrarFormulario && !mostrarFormDatos) ? (
          <div className="space-y-6">
            <h2 className="text-lg font-black uppercase tracking-wider text-zinc-400">Mis Solicitudes Activas</h2>
            {solicitudes.map(sol => (
              <div key={sol.id} className="bg-zinc-900/30 backdrop-blur-xl border border-zinc-850 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white">{sol.productoDeseado}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500">Enviado el {sol.fechaCreacion?.toDate().toLocaleDateString("es-AR")}</span>
                      {sol.planElegido && (
                        <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded font-bold">{sol.planElegido} Cuotas x $ {sol.montoCuota}</span>
                      )}
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase ${
                    sol.estado === "PENDIENTE" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                    sol.estado === "APROBADO" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                    sol.estado === "RECHAZADO" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                  }`}>
                    {sol.estado}
                  </span>
                </div>
                
                {(sol as any).estadoEntrega === "ENTREGADO" && (
                  <div className="p-5 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">🏷️ Entrega y Anticipo</h4>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                       <span className="text-lg font-black text-white">$ {(sol as any).montoAbonado || "0"} <span className="text-xs text-zinc-500 uppercase font-normal ml-1">({(sol as any).metodoPago || "Efectivo"})</span></span>
                       {(sol as any).estadoRendicion === "CONFIRMADO" ? (
                          <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-xl text-xs font-bold w-fit">✅ PAGO CONFIRMADO POR CENTRAL</span>
                       ) : (
                          <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded-xl text-xs font-bold w-fit">⌛ AUDITANDO COBRO CON AFILIADO</span>
                       )}
                    </div>
                  </div>
                )}
                
                {(sol as any).estadoEntrega === "ENTREGADO" && (sol as any).planPagos && (
                  <div className="space-y-4">
                    <div className="border-t border-zinc-850 pt-4">
                      <h4 className="text-md font-black text-zinc-300 flex items-center gap-2">💳 Mi Planilla de Pagos</h4>
                      <p className="text-xs text-zinc-500 mt-1">Aquí puedes subir y reportar las transferencias o recibos mensuales de tus cuotas.</p>
                    </div>
                    <div className="space-y-3">
                      {(sol as any).planPagos.map((cuota: any, idx: number) => {
                        const isEligibleToPay = !(sol as any).planPagos.slice(0, idx).some((c:any) => c.estado === "PENDIENTE");
                        return (
                        <div key={idx} className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-zinc-800 transition-colors">
                          <div className="space-y-1">
                            <p className="font-black text-zinc-200 text-base">Cuota {cuota.numero} de {(sol as any).planElegido || ((sol as any).planPagos.length)}</p>
                            <p className="text-zinc-500 text-xs font-bold">Vencimiento: {new Date(cuota.vencimiento).toLocaleDateString("es-AR")}</p>
                            <p className="text-yellow-400 font-mono font-black text-lg">$ {cuota.montoOriginal}</p>
                            {cuota.notaAcumulacion && <p className="text-xs text-orange-400 font-bold mt-1 bg-orange-950/30 border border-orange-900/30 px-2.5 py-1 rounded w-fit">{cuota.notaAcumulacion}</p>}
                          </div>
                          
                          <div className="text-right">
                            {cuota.estado === "PAGADO" && (
                              <div className="flex flex-col items-end gap-2">
                                <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider w-fit">✅ VERIFICADO Y PAGADO</span>
                                {cuota.comprobanteUrl && <a href={cuota.comprobanteUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline font-bold">📄 Ver Recibo Enviado</a>}
                              </div>
                            )}
                            
                            {cuota.estado === "EN_REVISION" && (
                              <div className="flex flex-col items-end gap-1.5 bg-blue-950/15 p-4 rounded-xl border border-blue-900/30">
                                <span className="text-blue-400 font-black text-xs uppercase tracking-wider flex items-center gap-1">⌛ Auditando pago...</span>
                                <p className="text-[10px] text-zinc-500 max-w-xs text-right">El administrador de Cuenta Hogar está revisando el recibo en la cuenta bancaria.</p>
                              </div>
                            )}
                            
                            {cuota.estado === "PENDIENTE" && (
                              <div className="flex flex-col items-end gap-3 bg-zinc-900/30 border border-zinc-850 p-4 rounded-2xl">
                                <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">PENDIENTE</span>
                                {isEligibleToPay ? (
                                  <>
                                    <div className="w-full max-w-xs mb-1 text-left">
                                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Monto pagado ($):</label>
                                      <input type="number" id={`monto_${sol.id}_${idx}`} defaultValue={cuota.montoOriginal} min="1" className="w-full text-xs font-bold bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-lg px-3 py-2 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all" />
                                    </div>
                                    <input type="file" id={`comprobante_${sol.id}_${idx}`} accept="image/*,application/pdf" className="text-[10px] w-full max-w-xs text-zinc-400 file:bg-yellow-500 file:text-black file:border-0 file:rounded-lg file:px-3 file:py-1.5 file:font-bold hover:file:bg-yellow-400 file:transition-colors file:cursor-pointer outline-none" />
                                    <button 
                                      onClick={async () => {
                                        const el = document.getElementById(`comprobante_${sol.id}_${idx}`) as HTMLInputElement;
                                        if(!el.files || el.files.length === 0) return alert("Selecciona el comprobante/foto primero desde tu dispositivo.");
                                        const montoInput = document.getElementById(`monto_${sol.id}_${idx}`) as HTMLInputElement;
                                        const montoReportado = Number(montoInput.value) || 0;
                                        if (montoReportado <= 0) return alert("Ingresa el monto válido del pago.");

                                        const btn = document.getElementById(`btn_${sol.id}_${idx}`) as HTMLButtonElement;
                                        btn.innerText = "Enviando...";
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
                                          } else if (diferencia < 0) {
                                              alert("Estás reportando un pago mayor al de la cuota. Se registrará este monto para la cuota actual.");
                                              newPlan[idx].montoOriginal = montoReportado;
                                          }

                                          newPlan[idx].comprobanteUrl = url;
                                          newPlan[idx].estado = "EN_REVISION";
                                          await updateDoc(doc(db, "solicitudes", sol.id), { planPagos: newPlan });
                                          alert("Comprobante enviado exitosamente. Aguardando validación de la administración.");
                                          fetchSolicitudes();
                                        } catch(e) { alert("Error de conexión al subir. Chequea tu internet."); btn.innerText="📨 Reportar Pago"; btn.disabled=false; }
                                      }}
                                      id={`btn_${sol.id}_${idx}`}
                                      className="w-full bg-yellow-500 text-black px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-yellow-400 hover:-translate-y-0.5 transition-all shadow-md"
                                    >
                                      📨 Reportar Pago
                                    </button>
                                  </>
                                ) : (
                                  <div className="w-full text-center bg-zinc-900 p-3 rounded text-[10px] text-zinc-500 border border-zinc-800/80">
                                    <p>Debes reportar y abonar las cuotas anteriores antes de poder pagar esta.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                )}

                {sol.estado === "REQUIERE_INFO" && (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-300 text-xs">
                    <p className="font-bold flex items-center gap-1.5 mb-1 text-sm">⚠️ Acción Requerida por el Administrador:</p>
                    <p className="mb-3 font-semibold">{sol.mensajeAdmin || "Por favor, vuelve a subir tus archivos."}</p>
                    <button className="bg-orange-500 text-black px-4 py-2 rounded-lg font-black hover:bg-orange-400 text-xs uppercase tracking-wide">Actualizar Documentación</button>
                  </div>
                )}
                
                {sol.estado === "RECHAZADO" && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs">
                    <p className="font-bold mb-1 text-sm">Motivo de rechazo:</p>
                    <p className="font-semibold">{sol.mensajeAdmin || "No cumples con los requisitos crediticios actuales."}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/30 backdrop-blur-xl border border-zinc-850 rounded-3xl p-6 lg:p-10 relative shadow-2xl">
            {solicitudes.length > 0 && (
               <button onClick={() => setMostrarFormulario(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white font-bold text-sm transition-colors">
                 ✕ Cancelar
               </button>
            )}
            <div>
              <h2 className="text-xl font-black text-white">Solicitar Nuevo Crédito</h2>
              <p className="text-xs text-zinc-500 mt-1">Completa el formulario biográfico y adjunta la documentación para que evaluemos tu perfil crediticio.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/40 backdrop-blur-sm p-6 rounded-3xl border border-zinc-800/80 shadow-sm">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Nombre Completo</label>
                  <input required value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} type="text" placeholder="Juan Perez" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Número de DNI</label>
                  <input required value={numeroDni} onChange={e=>setNumeroDni(e.target.value)} type="number" placeholder="Ej: 32444555" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Teléfono / Celular</label>
                  <input required value={telefono} onChange={e=>setTelefono(e.target.value)} type="tel" placeholder="Ej: +54 9 11 1234-5678" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Dirección</label>
                  <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" placeholder="Ej: Av. San Martin 123" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Localidad</label>
                  <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" placeholder="Ej: Córdoba Capital" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Correo Electrónico (Obligatorio)</label>
                  <input required value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Ej: juanperez@gmail.com" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Antigüedad Laboral (Fecha de Ingreso)</label>
                  <input required value={antiguedadLaboral} onChange={e=>setAntiguedadLaboral(e.target.value)} type="date" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">¿Qué producto deseas financiar?</label>
                  <input required value={producto} onChange={e=>setProducto(e.target.value)} type="text" placeholder="Ej: Heladera Samsung 400L" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all text-sm font-bold" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Plan de Financiación</label>
                  <select 
                    value={planElegido || "12"} 
                    onChange={e => {
                      const selPlan = e.target.value;
                      setPlanElegido(selPlan);
                      if (productoObj) {
                        setMontoCuota(selPlan === "8" ? productoObj.cuota8 : productoObj.cuota12);
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white outline-none focus:border-yellow-500 transition-colors text-sm font-bold"
                  >
                    <option value="12">Financiación en 12 Cuotas</option>
                    <option value="8">Financiación en 8 Cuotas</option>
                  </select>
                </div>

                {montoCuota > 0 && (
                  <div className="md:col-span-2 bg-yellow-500/5 border border-yellow-500/10 p-5 rounded-2xl flex justify-between items-center">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Valor de la cuota elegida:</span>
                    <span className="text-lg font-black text-yellow-400 font-mono">$ {montoCuota} / mes</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/40 backdrop-blur-sm p-6 rounded-3xl border border-zinc-800/80 shadow-sm">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Foto DNI - Frente</label>
                  <input required type="file" accept="image/*" onChange={e => {if (e.target.files) setDniFrente(e.target.files[0])}} className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-950 file:border file:border-zinc-800 file:text-zinc-300 hover:file:text-white file:transition-colors file:font-bold file:cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Foto DNI - Dorso</label>
                  <input required type="file" accept="image/*" onChange={e => {if (e.target.files) setDniDorso(e.target.files[0])}} className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-950 file:border file:border-zinc-800 file:text-zinc-300 hover:file:text-white file:transition-colors file:font-bold file:cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Último Recibo de Sueldo</label>
                  <input required type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setReciboSueldo(e.target.files[0])}} className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-950 file:border file:border-zinc-800 file:text-zinc-300 hover:file:text-white file:transition-colors file:font-bold file:cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wide">Impuesto o Servicio (Verificar Domicilio)</label>
                  <input required type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setServicio(e.target.files[0])}} className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-950 file:border file:border-zinc-800 file:text-zinc-300 hover:file:text-white file:transition-colors file:font-bold file:cursor-pointer" />
                </div>
              </div>

              <button disabled={subiendo} type="submit" className="w-full bg-yellow-500 text-black py-4 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-yellow-400 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:transform-none mt-8">
                {subiendo ? "Subiendo archivos, por favor no cierres la ventana..." : "Enviar Solicitud de Crédito"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}