"use client";

import { useAuth } from "@/components/AuthProvider";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, updateDoc, doc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Producto = {
  id: string;
  nombre: string;
  cuota12: number;
  cuota8: number;
  precioContado: number | null;
};

export default function AfiliadoPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"carga" | "seguimiento" | "clientes" | "comisiones">("seguimiento");
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
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
  const [nuevaNota, setNuevaNota] = useState("");
  const [fechaPromesa, setFechaPromesa] = useState("");
  const [fechaRecepcion, setFechaRecepcion] = useState("");
  const [costoComisionista, setCostoComisionista] = useState("");
  const [nserie, setNserie] = useState("");
  const [montoAbonado, setMontoAbonado] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [comentarioEntrega, setComentarioEntrega] = useState("");

  const [productoId, setProductoId] = useState("");
  const [planElegido, setPlanElegido] = useState<"12"|"8"|null>(null);

  // Archivos
  const [dniFrente, setDniFrente] = useState<File | null>(null);
  const [dniDorso, setDniDorso] = useState<File | null>(null);
  const [reciboSueldo, setReciboSueldo] = useState<File | null>(null);
  const [servicio, setServicio] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    if (!user) return;
    try {
      // 1. Traer historial del afiliado
      const q = query(collection(db, "solicitudes"), where("afiliadoEmail", "==", user.email));
      const snapSols = await getDocs(q);
      const results: any[] = [];
      snapSols.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
      setSolicitudes(results.sort((a,b) => b.fechaCreacion.toMillis() - a.fechaCreacion.toMillis()));

      // 2. Traer catálogo de productos para el Select
      const snapProds = await getDocs(collection(db, "productos"));
      const prods: Producto[] = [];
      snapProds.forEach(doc => prods.push({ id: doc.id, ...doc.data() } as Producto));
      setProductos(prods);

      const qNotif = query(collection(db, "notificaciones"), where("afiliadoEmail", "==", user.email));
      const snapNotif = await getDocs(qNotif);
      const notifs: any[] = [];
      snapNotif.forEach(doc => notifs.push({ id: doc.id, ...doc.data() }));
      setNotificaciones(notifs.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));

    } catch (e) {
      console.error(e);
    } finally {
      setCargandoDatos(false);
    }
  };

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

  const handleAgregarNotaCartera = async (sol: any) => {
    if (!nuevaNota.trim()) return alert("Debes escribir una nota de gestión.");
    try {
      const historial = sol.historialContactos || [];
      const nuevoRegistro = {
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
        usuario: user?.email || "Afiliado",
        nota: nuevaNota.trim(),
        promesaPago: fechaPromesa || null
      };

      await updateDoc(doc(db, "solicitudes", sol.id), {
        historialContactos: [nuevoRegistro, ...historial]
      });

      alert("¡Nota de cobranza guardada exitosamente!");
      setNuevaNota("");
      setFechaPromesa("");
      fetchData();
    } catch (e) {
      alert("Error al guardar la nota.");
    }
  };

  const handleConfirmarEntrega = async (id: string, nuevoEstado: string, skipPrompt?: boolean) => {
    try {
      let dataToUpdate: any = { estadoEntrega: nuevoEstado };
      
      if (nuevoEstado === "ENTREGADO") {
        if (!nserie || nserie.trim().length < 3) {
          return alert("Debes ingresar un número de serie válido.");
        }
        dataToUpdate.numeroSerie = nserie.trim();
        dataToUpdate.montoAbonado = Number(montoAbonado);
        dataToUpdate.metodoPago = metodoPago;
        dataToUpdate.comentarioEntrega = comentarioEntrega;
        dataToUpdate.estadoRendicion = "PENDIENTE";

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
      } else if (!skipPrompt) {
        const coment = prompt("Agregar un comentario adicional (Opcional):");
        if (coment) dataToUpdate.comentarioEntrega = coment;
      }

      await updateDoc(doc(db, "solicitudes", id), dataToUpdate);
      alert("Estado actualizado exitosamente");
      setEntregaActiva(null);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Error al actualizar la entrega.");
    }
  };

  const handleSubirArchivo = async (archivo: File, tipo: string) => {
    if (!user) return "";
    const storageRef = ref(storage, "comprobantes/afiliados/" + user.uid + "/" + Date.now() + "_" + tipo + "_" + archivo.name);
    await uploadBytes(storageRef, archivo);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !dniFrente || !dniDorso || !reciboSueldo || !servicio) {
      return alert("Por favor selecciona todos los documentos obligatorios.");
    }
    if (!productoId || !planElegido) {
      return alert("Debes seleccionar el producto y el esquema de cuotas.");
    }

    setSubiendo(true);

    try {
      const prodSeleccionado = productos.find(p => p.id === productoId);
      if (!prodSeleccionado) throw new Error("Producto no encontrado");

      const [urlFrente, urlDorso, urlSueldo, urlServicio] = await Promise.all([
        handleSubirArchivo(dniFrente, "dniFrente"),
        handleSubirArchivo(dniDorso, "dniDorso"),
        handleSubirArchivo(reciboSueldo, "sueldo"),
        handleSubirArchivo(servicio, "servicio")
      ]);

      await addDoc(collection(db, "solicitudes"), {
        cargadoPorAfiliado: true,
        afiliadoEmail: user.email,
        clienteId: "CargaManual", // El cliente no tiene UID propio al cargarlo el afiliado a menos que luego se registre
        clienteEmail: clienteEmail,
        datosPersonales: { nombreCompleto, numeroDni, telefono, direccion, localidad },
        
        productoId: prodSeleccionado.id,
        productoDeseado: prodSeleccionado.nombre,
        planElegido: planElegido,
        montoCuota: planElegido === "12" ? prodSeleccionado.cuota12 : prodSeleccionado.cuota8,

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

      alert("¡La venta/solicitud ha sido ingresada al sistema con éxito!");
      setClienteEmail(""); setNombreCompleto(""); setNumeroDni(""); setTelefono(""); setDireccion(""); setLocalidad("");
      setProductoId(""); setPlanElegido(null);
      setDniFrente(null); setDniDorso(null); setReciboSueldo(null); setServicio(null);
      setActiveTab("seguimiento"); // Auto return to tracking so they see it
      await fetchData();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al cargar la venta.");
    } finally {
      setSubiendo(false);
    }
  };

  const prodElegidoObj = productos.find(p => p.id === productoId);

  if (authLoading || cargandoDatos) return <div className="min-h-screen bg-[#FAFAFA] text-yellow-500 p-8 text-center mt-20 font-bold">Cargando panel comercial...</div>;
  if (!user) return null;

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
    <div className="min-h-screen bg-[#FAFAFA] text-yellow-500 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-yellow-500/30 pb-6">
          <div>
            <img src="https://storage.googleapis.com/negocio-facil-page.firebasestorage.app/Logos/LOGO%20SIN%20NOMBRE%20-%20CUENTA%20HOGAR.png" alt="Electro en Cuotas Logo" className="h-10 w-auto object-contain" /> <h1 className="text-2xl font-bold text-yellow-400 mt-2">Portal del Afiliado</h1>
            <p className="text-gray-500 text-sm mt-1">Usuario activo: {user.email}</p>
          </div>
          <div className="flex gap-3">
            <a href="/" className="text-sm border border-yellow-500/50 hover:bg-yellow-500 hover:text-black px-4 py-2 rounded transition-colors font-bold hidden sm:block">Catálogo</a>
            <button onClick={() => { import("firebase/auth").then(({getAuth, signOut}) => signOut(getAuth())); router.push("/login"); }} className="text-sm border border-red-500/50 text-red-500 hover:bg-red-900/50 px-4 py-2 rounded transition-colors font-bold">
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* ALERTAS DE COBRANZA GLOBALES */}
        {promesasExigibles.length > 0 && (
           <div className="bg-red-900/30 border border-red-500/80 p-5 rounded-xl mb-6 flex flex-col gap-2 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <h3 className="text-red-400 font-black text-lg flex items-center gap-2">🚨 ALERTA: Tienes Promesas de Pago Vencidas o para Hoy</h3>
              <p className="text-sm text-gray-500 mb-2">Comunícate urgentemente con estos clientes, sus promesas han madurado y siguen en mora.</p>
              <div className="flex flex-wrap gap-3">
                 {promesasExigibles.map(sol => {
                    const lProm = sol.historialContactos.find((c:any) => c.promesaPago);
                    return (
                       <div key={sol.id} onClick={() => { setActiveTab("clientes"); setExpandedCarteraId(sol.id); }} className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-zinc-900 px-4 py-2 rounded-lg border border-red-500/30 transition shadow-sm">
                          <p className="text-sm font-bold text-zinc-900">{sol.datosPersonales?.nombreCompleto}</p>
                          <p className="text-[10px] text-red-300 font-black uppercase tracking-widest mt-1">Acuerdo: {new Date(lProm.promesaPago + "T12:00:00").toLocaleDateString()}</p>
                       </div>
                    )
                 })}
              </div>
           </div>
        )}

        {/* MENÚ DE SECCIONES (TABS) */}
        <div className="flex flex-col sm:flex-row gap-2 mb-8 bg-[#FAFAFA]/80 p-2 rounded-xl border border-gray-200 shadow-lg">
           <button onClick={() => setActiveTab("carga")} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-center ${activeTab === 'carga' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-zinc-900 hover:bg-gray-100'}`}>
              1. Carga de Solicitudes
           </button>
           <button onClick={() => setActiveTab("seguimiento")} className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-center ${activeTab === 'seguimiento' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-zinc-900 hover:bg-gray-100'}`}>
              2. Seguimiento / Logística
           </button>
           <button onClick={() => setActiveTab("clientes")} className={'flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-center ' + (activeTab === 'clientes' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-zinc-900 hover:bg-gray-100')}>
              3. Gestión Clientes
           </button>
           <button onClick={() => setActiveTab("comisiones")} className={'flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all text-center flex items-center justify-center gap-2 ' + (activeTab === 'comisiones' ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-zinc-900 hover:bg-gray-100')}>
              4. Comisiones {notificaciones.filter(n=>!n.leida).length > 0 && <span className="bg-red-500 text-zinc-900 rounded-full px-2 py-0.5 text-[10px] animate-pulse">{notificaciones.filter(n=>!n.leida).length}</span>}
           </button>
        </div>

        <div className="w-full">
          
          {/* 1. SECCION: CARGA DE SOLICITUDES */}
          {activeTab === "carga" && (
            <div className="bg-[#FAFAFA] border border-yellow-500/20 rounded-xl p-6 md:p-10 shadow-xl max-w-4xl mx-auto animate-fade-in">
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Cargar Nueva Venta (Presencial)</h2>
            <p className="text-yellow-200/60 mb-8">Selecciona el producto del inventario activo y carga los documentos del cliente que tienes enfrente para pasarlo a evaluación crediticia de la mesa chica.</p>
            
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* SELECTOR DE PRODUCTO Y CUOTAS */}
              <div className="bg-white p-5 rounded-xl border border-yellow-500/30">
                <div className="mb-5">
                  <label className="block text-sm font-bold text-yellow-400 mb-2">Seleccionar Producto del Catálogo</label>
                  <select 
                    required 
                    value={productoId} 
                    onChange={e => { setProductoId(e.target.value); setPlanElegido(null); }} 
                    className="w-full bg-gray-100 border border-gray-700 rounded-lg p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none font-semibold text-lg"
                  >
                    <option value="" disabled>-- Haz clic para elegir del inventario --</option>
                    {productos.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                {prodElegidoObj && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div 
                      onClick={() => setPlanElegido("12")}
                      className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all \${planElegido === "12" ? "border-yellow-500 bg-yellow-500/10" : "border-gray-300 hover:border-gray-500"}`}
                    >
                      <span className="text-zinc-900 font-bold">12 Cuotas Ex.</span>
                      <span className="text-2xl font-black text-yellow-500">${prodElegidoObj.cuota12}</span>
                    </div>
                    <div 
                      onClick={() => setPlanElegido("8")}
                      className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center justify-center transition-all \${planElegido === "8" ? "border-yellow-600 bg-yellow-600/10" : "border-gray-300 hover:border-gray-500"}`}
                    >
                      <span className="text-zinc-900 font-bold">8 Cuotas Dir.</span>
                      <span className="text-2xl font-black text-yellow-600">${prodElegidoObj.cuota8}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* DATOS DEL CLIENTE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-sm mb-2 text-gray-600 font-bold">Email de Contacto (del Cliente)</label>
                  <input required value={clienteEmail} onChange={e=>setClienteEmail(e.target.value)} type="email" placeholder="cliente@correo.com" className="w-full bg-gray-100 border border-gray-700 rounded-lg p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-bold">Nombre Completo del Cliente</label>
                  <input required value={nombreCompleto} onChange={e=>setNombreCompleto(e.target.value)} type="text" placeholder="Juan Perez" className="w-full bg-gray-100 border border-gray-700 rounded-lg p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-bold">Número de DNI</label>
                  <input required value={numeroDni} onChange={e=>setNumeroDni(e.target.value)} type="number" placeholder="Ej: 32444555" className="w-full bg-gray-100 border border-gray-700 rounded-lg p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-bold">Teléfono / Celular</label>
                  <input required value={telefono} onChange={e=>setTelefono(e.target.value)} type="tel" placeholder="Ej: +54 9 11 1234-5678" className="w-full bg-gray-100 border border-gray-700 rounded-lg p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-bold">Dirección</label>
                  <input required value={direccion} onChange={e=>setDireccion(e.target.value)} type="text" placeholder="Ej: Av. San Martin 123" className="w-full bg-gray-100 border border-gray-700 rounded-lg p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-yellow-400 font-bold">Localidad</label>
                  <input required value={localidad} onChange={e=>setLocalidad(e.target.value)} type="text" placeholder="Ej: Córdoba" className="w-full bg-gray-100 border border-gray-700 rounded-lg p-3 text-zinc-900 focus:border-yellow-500 focus:outline-none" />
                </div>
              </div>

              {/* ARCHIVOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-sm mb-2 text-gray-600">Foto DNI - Frente (Cámara)</label>
                  <input required type="file" accept="image/*" onChange={e => {if (e.target.files) setDniFrente(e.target.files[0])}} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-yellow-500/20 file:font-semibold file:text-yellow-500 hover:file:bg-yellow-500/30" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-600">Foto DNI - Dorso</label>
                  <input required type="file" accept="image/*" onChange={e => {if (e.target.files) setDniDorso(e.target.files[0])}} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-yellow-500/20 file:font-semibold file:text-yellow-500 hover:file:bg-yellow-500/30" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-600">Último Recibo de Sueldo</label>
                  <input required type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setReciboSueldo(e.target.files[0])}} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-yellow-500/20 file:font-semibold file:text-yellow-500 hover:file:bg-yellow-500/30" />
                </div>
                <div>
                  <label className="block text-sm mb-2 text-gray-600">Impuesto / Servicio Telefónico</label>
                  <input required type="file" accept="image/*,application/pdf" onChange={e => {if (e.target.files) setServicio(e.target.files[0])}} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-yellow-500/20 file:font-semibold file:text-yellow-500 hover:file:bg-yellow-500/30" />
                </div>
              </div>

              <button disabled={subiendo || !planElegido || !productoId} type="submit" className="w-full bg-yellow-500 text-black py-4 rounded-xl font-black text-lg hover:bg-yellow-400 transition-colors shadow-[0_0_20px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:shadow-none mt-8 tracking-wide">
                {subiendo ? "Subiendo legajo pesado, no cierres..." : "Ingresar Expediente de Venta"}
              </button>
            </form>
          </div>
          )}

          
          {/* 2. SECCION: SEGUIMIENTO Y LOGISTICA */}
          {activeTab === "seguimiento" && (
          <div className="flex flex-col gap-8 max-w-5xl mx-auto animate-fade-in">
            <div className="bg-[#FAFAFA] border border-yellow-500/20 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-zinc-900 mb-4 flex items-center gap-2">🚚 Módulo de Entregas</h2>
              
              {solicitudes.filter(s => s.estado === "APROBADO" && s.estadoEntrega !== "ENTREGADO" && s.estadoEntrega !== "ANULADO").length === 0 ? (
                <p className="text-gray-500 text-sm italic">No tienes equipos pendientes de entrega.</p>
              ) : (
                <div className="space-y-4">
                  {solicitudes.filter(s => s.estado === "APROBADO" && s.estadoEntrega !== "ENTREGADO" && s.estadoEntrega !== "ANULADO").map((sol: any) => (
                     <div key={sol.id} className="bg-white border border-yellow-500/30 p-4 rounded-lg flex flex-col gap-2 relative">
                        <span className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                        
                        <p className="text-sm font-bold text-yellow-500">{sol.productoDeseado}</p>
                        <p className="text-xs text-gray-600">Cliente: <span className="text-zinc-900 font-bold">{sol.datosPersonales?.nombreCompleto}</span></p>
                        <p className="text-xs text-gray-600 mb-2">DNI: {sol.datosPersonales?.numeroDni}</p>
                        <p className="text-xs text-gray-500 italic bg-[#FAFAFA] p-2 rounded border border-gray-200 break-words mb-2">Notas Admin: {sol.mensajeAdmin || 'Sin observaciones'}</p>
                        
                        {entregaActiva === sol.id ? (
                          <div className="bg-[#FAFAFA] border border-yellow-500/50 p-4 rounded-lg mt-2 flex flex-col gap-3 shadow-md w-full relative z-10">
                             <h4 className="text-yellow-500 font-bold text-xs uppercase text-center border-b border-yellow-500/20 pb-2">Confirmar Entrega</h4>
                             <div>
                               <label className="block text-[10px] text-gray-500 mb-1">Nº de Serie del Producto (Oblig.)</label>
                               <input type="text" value={nserie} onChange={e=>setNserie(e.target.value)} placeholder="Ej: SN-928374928" className="bg-white text-zinc-900 px-3 py-2 rounded text-xs border border-gray-300 w-full focus:border-yellow-500 outline-none" />
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               <div>
                                 <label className="block text-[10px] text-gray-500 mb-1">Monto Cobrado ($)</label>
                                 <input type="number" value={montoAbonado} onChange={e=>setMontoAbonado(e.target.value)} className="bg-white text-zinc-900 px-3 py-2 rounded text-xs border border-gray-300 w-full focus:border-yellow-500 outline-none font-bold" />
                               </div>
                               <div>
                                 <label className="block text-[10px] text-gray-500 mb-1">Medio de Pago</label>
                                 <select value={metodoPago} onChange={e=>setMetodoPago(e.target.value)} className="bg-white text-zinc-900 px-3 py-2 rounded text-xs border border-gray-300 w-full focus:border-yellow-500 outline-none font-bold">
                                   <option value="Efectivo">💵 Efectivo</option>
                                   <option value="Transferencia">📱 Transferencia</option>
                                 </select>
                               </div>
                             </div>
                             <div>
                               <label className="block text-[10px] text-gray-500 mb-1">Comentario Opcional</label>
                               <input type="text" value={comentarioEntrega} onChange={e=>setComentarioEntrega(e.target.value)} placeholder="..." className="bg-white text-zinc-900 px-3 py-2 rounded text-xs border border-gray-300 w-full focus:border-yellow-500 outline-none" />
                             </div>
                             <div className="flex gap-2 mt-2">
                               <button onClick={() => setEntregaActiva(null)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded text-xs font-bold hover:bg-gray-200">Cancelar</button>
                               <button onClick={() => handleConfirmarEntrega(sol.id, "ENTREGADO")} className="flex-1 bg-yellow-500 text-black py-2 rounded text-xs font-bold hover:bg-yellow-400 shadow-md">✓ GUARDAR</button>
                             </div>
                          </div>
                        ) : (
                          <>
                            {sol.estadoProducto === "En stock (Afiliado)" ? (
                               <>
                                 <label className="text-[10px] text-gray-500 font-bold uppercase mt-1">Marcar Estado de Logística:</label>
                                 <select 
                                    value={sol.estadoEntrega || "PENDIENTE_ENTREGA"} 
                                    onChange={e => {
                                       const val = e.target.value;
                                       if (val === "ENTREGADO") {
                                          setNserie(""); setMontoAbonado(sol.montoCuota?.toString() || ""); setMetodoPago("Efectivo"); setComentarioEntrega("");
                                          setEntregaActiva(sol.id);
                                       } else { handleConfirmarEntrega(sol.id, val, true); }
                                    }}
                                    className="bg-gray-100 border border-gray-600 text-xs p-2 rounded text-zinc-900 focus:border-yellow-500 outline-none w-full font-bold"
                                 >
                                    <option value="PENDIENTE_ENTREGA">📦 Equipo pendiente de entrega</option>
                                    <option value="ENTREGADO">✅ Equipo Entregado al Cliente</option>
                                    <option value="ANULADO">❌ Anuló compra / Falló entrega</option>
                                 </select>
                               </>
                            ) : (
                               <div className="bg-orange-500/10 border border-orange-500/30 p-2 rounded flex flex-col gap-1 mt-1">
                                 <p className="text-[10px] text-orange-400 font-black uppercase tracking-wider">⚠️ Entrega Bloqueada</p>
                                 <p className="text-[10px] text-gray-500">Debes tener el producto en stock físico para entregarlo. Estado actual: <strong className="text-gray-600">{sol.estadoProducto || "A la espera..."}</strong></p>
                               </div>
                            )}
                          </>
                        )}
                        {recepcionActiva === sol.id ? (
                           <div className="bg-blue-900/20 border border-blue-500/50 p-4 rounded-lg mt-2 flex flex-col gap-3 shadow-md w-full relative z-10">
                              <h4 className="text-blue-400 font-bold text-xs uppercase text-center border-b border-blue-500/20 pb-2">📦 Confirmar Recepción Física</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] text-gray-500 mb-1">Fecha de Ingreso</label>
                                  <input type="date" value={fechaRecepcion} onChange={e=>setFechaRecepcion(e.target.value)} className="bg-white text-zinc-900 px-3 py-2 rounded text-xs border border-gray-300 w-full focus:border-blue-500 outline-none" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-500 mb-1">Costo Flete ($)</label>
                                  <input type="number" placeholder="Ej: 5000" value={costoComisionista} onChange={e=>setCostoComisionista(e.target.value)} className="bg-white text-zinc-900 px-3 py-2 rounded text-xs border border-gray-300 w-full focus:border-blue-500 outline-none font-bold text-blue-400" />
                                </div>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => setRecepcionActiva(null)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded text-xs font-bold hover:bg-gray-200">Cancelar</button>
                                <button onClick={async () => {
                                   try {
                                      const { doc, updateDoc } = await import("firebase/firestore");
                                      const fd = fechaRecepcion ? new Date(fechaRecepcion + "T12:00:00").toLocaleDateString() : new Date().toLocaleDateString();
                                      const histo = `Recibido flete el ${fd} | Costo Comisionista: $${costoComisionista || 0} (Recepcionado por ${user?.email})`;
                                      await updateDoc(doc(db, "solicitudes", sol.id), { 
                                        estadoProducto: "En stock (Afiliado)",
                                        costoFleteAfiliado: Number(costoComisionista || 0),
                                        fechaLlegadaLocal: fechaRecepcion || new Date().toISOString(),
                                        historialRecepcion: histo
                                      });
                                      alert("¡Acuse de recibo y costos financieros registrados!");
                                      setRecepcionActiva(null);
                                      fetchData();
                                   } catch(e) { alert("Error al confirmar"); }
                                }} className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-500 shadow-md">✓ CONFIRMAR</button>
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
                                <div className="bg-green-500/10 border border-green-500/30 p-2 rounded mt-2 flex flex-col gap-1 w-full">
                                  <p className="text-xs text-green-400"><strong className="text-green-500">Nº SERIE:</strong> {sol.numeroSerie || "No registrado"}</p>
                                  <p className="text-xs text-green-400"><strong className="text-green-500">PAGO:</strong> ${sol.montoAbonado || 0} ({sol.metodoPago || "N/A"})</p>
                                </div>
                        )}
                     </div>
                  ))}
                </div>
              )}
            </div>

            {/* HISTORIAL RECIENTE */}
          
            <h2 className="text-xl font-bold text-zinc-900 mb-6">Mis Solicitudes Cargadas</h2>
            {solicitudes.length === 0 ? (
              <p className="text-gray-500 text-sm">Aún no has gestionado ninguna venta.</p>
            ) : (
              <div className="space-y-4">
                {solicitudes.slice(0, 10).map((sol) => (
                  <div key={sol.id} className="bg-[#FAFAFA] border border-gray-200 p-4 rounded-xl flex flex-col gap-2">
                     <p className="text-sm font-bold text-zinc-900 leading-tight">{sol.productoDeseado}</p>

                        {sol.estadoProducto === "En viaje" && (
                          <button 
                            onClick={async () => {
                              const fecha = window.prompt("Ingresa la fecha de recepción (ej. DD/MM/AAAA) o déjalo en blanco para usar la fecha de hoy:");
                              if (fecha === null) return; // User cancelled
                              const flete = window.prompt("Ingresa el costo del flete/comisionista en $: (Ingresa solo números)", "0");
                              if (flete === null) return;
                              try {
                                const { doc, updateDoc } = await import("firebase/firestore");
                                const fd = fecha?.trim() ? fecha : new Date().toLocaleDateString();
                                await updateDoc(doc(db, "solicitudes", sol.id), { 
                                  estadoProducto: "En stock (Afiliado)",
                                  costoFleteAfiliado: Number(flete || 0),
                                  historialRecepcion: `Recibido el ${fd} | Flete: $${flete || 0}`
                                });
                                alert("¡Acuse de recibo guardado exitosamente!");
                                fetchData();
                              } catch(e) { alert("Error al confirmar"); }
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded w-full mt-2 text-xs shadow-[0_0_15px_rgba(37,99,235,0.5)]  border border-blue-400"
                          >
                            📦 ACUSAR RECIBO (FLETE)
                          </button>
                        )}
                     
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 sm:gap-0">
                       <span className="text-gray-500">Cliente: {sol.datosPersonales?.nombreCompleto}</span>
                       <span className={`px-2 py-1 rounded font-bold ${
                          sol.estado === 'APROBADO' ? 'bg-green-500/20 text-green-400' :
                          sol.estado === 'RECHAZADO' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                       }`}>{sol.estado}</span>
                     </div>
                     {sol.estadoEntrega === "ENTREGADO" && (
                       <div className="mt-2 border-t border-gray-200 pt-2 flex justify-between items-center text-xs">
                         <span className="text-gray-500 font-bold">Estado del Adelanto:</span>
                         {sol.estadoRendicion === "CONFIRMADO" ? (
                           <span className="bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-1 rounded font-bold">✅ CONFIRMADO POR CAJA</span>
                         ) : sol.estadoRendicion === "PENDIENTE" ? (
                           <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2 py-1 rounded font-bold animate-pulse">⏳ PENDIENTE DE CAJA</span>
                         ) : (
                           <span className="text-gray-500">Sin rendir</span>
                         )}
                       </div>
                     )}
                     {sol.planElegido && (
                       <span className="bg-gray-100 text-yellow-500 w-fit px-2 py-1 rounded text-xs font-bold mt-1">
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
             <div className="bg-white border border-gray-200 p-6 rounded-xl animate-fade-in max-w-6xl mx-auto">
                <h2 className="text-2xl font-black text-zinc-900 mb-6 flex items-center gap-3"><span className="bg-yellow-500/10 p-2 rounded-lg">💰</span> Mis Comisiones y Avisos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                   <div className="bg-[#FAFAFA] border border-yellow-500/50 p-6 rounded-xl md:col-span-1 shadow-[0_0_15px_rgba(234,179,8,0.1)] text-center flex flex-col justify-center">
                      <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mb-2">Comisión Histórica Total</p>
                      <p className="text-4xl font-black text-yellow-500">${solicitudes.reduce((acc, sol) => {
                         if (!sol.planPagos) return acc;
                         const sumaPagos = sol.planPagos.reduce((accCuota: number, cuota: any) => {
                           if (cuota.estado === "PAGADO") {
                             return accCuota + Number(cuota.montoOriginal || 0);
                           }
                           return accCuota;
                         }, 0);
                         return acc + (sumaPagos * 0.15);
                      }, 0).toLocaleString()}</p>
                      <p className="text-[9px] text-gray-500 mt-2">15% s/Transferencias Registradas</p>
                   </div>
                   <div className="md:col-span-2 space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                       {notificaciones.length === 0 ? (
                           <p className="text-gray-500 text-sm">No tienes notificaciones de pago confirmadas aún.</p>
                       ) : (
                           notificaciones.map(n => (
                               <div key={n.id} className={'p-4 rounded-xl border flex flex-col gap-1 ' + (!n.leida ? 'bg-gray-100/80 border-yellow-500/50 relative' : 'bg-white border-gray-200')}>
                                   {!n.leida && <span className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span></span>}
                                   <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1">
                                       <span className="font-bold">{new Date(n.fecha).toLocaleString()}</span>
                                       {n.comisionAsociada && <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded font-black border border-green-500/20">COMISIÓN: ${n.comisionAsociada.toLocaleString()}</span>}
                                   </div>
                                   <p className={'text-sm ' + (!n.leida ? 'text-zinc-900 font-bold' : 'text-gray-600')}>{n.mensaje}</p>
                                   {!n.leida && (
                                       <button onClick={async () => {
                                           try {
                                              await updateDoc(doc(db, "notificaciones", n.id), { leida: true });
                                              setNotificaciones(prev => prev.map(p => p.id === n.id ? {...p, leida:true} : p));
                                           }catch(e){}
                                       }} className="text-[10px] text-yellow-500 hover:text-yellow-400 underline mt-2 w-fit">Marcar como leída</button>
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
            <div className="bg-white border border-gray-200 p-6 rounded-xl animate-fade-in max-w-6xl mx-auto">
              <h2 className="text-2xl font-black text-zinc-900 mb-6 flex items-center gap-3"><span className="bg-yellow-500/10 p-2 rounded-lg">💰</span> Cartera Activa de Clientes</h2>
            {solicitudes.filter(s => s.estadoEntrega === "ENTREGADO").length === 0 ? (
               <p className="text-gray-500 text-sm">No tienes clientes con financiación activa asignados a ti.</p>
            ) : (
               <div className="grid grid-cols-1 gap-6">
                 {solicitudes.filter(s => s.estadoEntrega === "ENTREGADO").map(sol => {
                    const est = calcularEstadoCuotas(sol.planPagos);
                    if (est.restantes === 0 && est.pagadas > 0) return null; // Hide finished ones optionally, but let's keep them if they are here. Wait, let's keep them for now. 
                    return (
                      <div key={sol.id} className="bg-[#FAFAFA] border border-yellow-500/10 p-6 rounded-2xl flex flex-col gap-3 relative shadow-xl overflow-hidden hover:border-yellow-500/30 transition-all">
                         {est.atrasadas > 0 && <span className="absolute top-0 right-0 bg-red-600 text-[10px] text-white font-black px-4 py-1.5 rounded-bl-xl uppercase shadow-md animate-pulse tracking-widest text-shadow">🛑 MOROSO ({est.atrasadas})</span>}
                         
                         <div className="flex flex-col border-b border-gray-200 pb-3">
                           <h3 className="text-xl font-black text-zinc-900 mb-1">{sol.datosPersonales?.nombreCompleto || "Desconocido"}</h3>
                           <p className="text-gray-500 text-xs flex items-center gap-2">📱 {sol.datosPersonales?.telefono} <span className="text-yellow-500/50">|</span> 📺 {sol.productoDeseado}</p>
                         </div>

                         {/* RESUMEN DEUDA REDISEÑADO */}
                         <div className="grid grid-cols-3 gap-3 text-center my-1 rounded-xl p-1">
                             <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-xl flex flex-col justify-center items-center shadow-inner">
                                <p className="text-2xl font-black text-green-500">{est.pagadas}</p>
                                <p className="text-[9px] text-green-400/80 uppercase font-bold tracking-wider">Pagadas</p>
                             </div>
                             <div className="bg-yellow-500/5 border border-yellow-500/10 p-2 rounded-xl flex flex-col justify-center items-center shadow-inner">
                                <p className="text-2xl font-black text-yellow-500">{est.restantes}</p>
                                <p className="text-[9px] text-yellow-500/60 uppercase font-bold tracking-wider">Restantes</p>
                             </div>
                             <div className={'p-2 rounded-xl flex flex-col justify-center items-center border ' + (est.atrasadas > 0 ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-[#FAFAFA] border-gray-200 shadow-inner')}>
                                <p className={'text-2xl font-black ' + (est.atrasadas > 0 ? 'text-red-500' : 'text-gray-500')}>{est.atrasadas}</p>
                                <p className={'text-[9px] uppercase font-bold tracking-wider ' + (est.atrasadas > 0 ? 'text-red-400' : 'text-gray-500')}>Vencidas</p>
                             </div>
                         </div>
                         {est.atrasadas > 0 && (
                            <p className="text-xs text-red-500 font-bold bg-red-900/20 py-2 px-3 rounded-lg flex items-center gap-2 border border-red-500/20">
                               🔥 Deuda Inmediata: ${est.montcAtrasado}
                            </p>
                         )}

                         <button onClick={() => setExpandedCarteraId(expandedCarteraId === sol.id ? null : sol.id)} className="w-full bg-gray-100 text-zinc-900 font-bold py-3 rounded-lg text-xs hover:bg-gray-200 transition border border-gray-300 mt-2 shadow-sm flex justify-center items-center gap-2">
                            {expandedCarteraId === sol.id ? "Ocultar Panel de Gestión" : "Abrir Panel y Pagos 💳"}
                         </button>

                         {expandedCarteraId === sol.id && (
                           <div className="mt-4 pt-4 border-t border-gray-200 animate-fade-in flex flex-col gap-4">
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* PAGOS REALIZADOS */}
                                  <div className="bg-green-950/20 p-3 rounded-xl border border-green-500/20 shadow-inner">
                                     <h4 className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-3 flex items-center gap-2">✓ Últimos Pagos Registrados</h4>
                                     {!sol.planPagos ? <p className="text-[10px] text-gray-500">Sin vector</p> : sol.planPagos.filter((c: any) => c.estado === "PAGADO").length === 0 ? (
                                        <p className="text-xs text-gray-500 italic text-center py-2">Ningún pago aportado aún.</p>
                                     ) : (
                                        <div className="space-y-2">
                                           {sol.planPagos.filter((c: any) => c.estado === "PAGADO").slice(-3).map((cuota: any, idx: number) => (
                                              <div key={idx} className="bg-white border border-green-500/30 p-2 rounded-lg flex justify-between items-center text-[10px]">
                                                 <div className="flex flex-col">
                                                    <span className="text-zinc-900 font-bold text-[11px]">Cuota {cuota.numero} - ${cuota.montoRealmenteCobrado || cuota.montoAbonadoReal || cuota.montoAbonado || cuota.montoOriginal}</span>
                                                    <span className="text-gray-500">Acordada orig: ${cuota.montoOriginal}</span>
                                                 </div>
                                                 <div className="flex flex-col items-end">
                                                    <span className="text-green-400 font-black uppercase text-[9px] bg-green-500/20 px-2 py-0.5 rounded">Rendido</span>
                                                    {cuota.fechaPago && <span className="text-gray-500 mt-1">{new Date(cuota.fechaPago).toLocaleDateString()}</span>}
                                                 </div>
                                              </div>
                                           ))}
                                        </div>
                                     )}
                                  </div>

                                  {/* CUOTAS A VENCER */}
                                  <div className="bg-yellow-950/20 p-3 rounded-xl border border-yellow-500/20 shadow-inner">
                                     <h4 className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-2">⏳ Agendadas a Vencer</h4>
                                     {!sol.planPagos ? <p className="text-[10px] text-red-500">Plan no regenerado.</p> : sol.planPagos.filter((c: any) => c.estado !== "PAGADO").slice(0, 3).map((cuota: any, idx: number) => {
                                          const isAtrasada = new Date(cuota.vencimiento) < new Date();
                                          return (
                                            <div key={idx} className={'p-2 rounded-lg flex justify-between items-center text-[10px] mb-2 border ' + (isAtrasada ? 'bg-red-950/50 border-red-500/30' : 'bg-white border-gray-200')}>
                                               <div className="flex flex-col">
                                                  <span className={'font-bold text-[11px] ' + (isAtrasada ? 'text-red-400' : 'text-gray-700')}>Cuota {cuota.numero} - ${cuota.montoOriginal}</span>
                                                  <span className="text-gray-500 mt-0.5">Venc: {new Date(cuota.vencimiento).toLocaleDateString()}</span>
                                               </div>
                                               <span className={'px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ' + (isAtrasada ? 'bg-red-500/20 text-red-500' : 'bg-gray-100 text-gray-500')}>
                                                  {isAtrasada ? 'Expirada' : 'Pendiente'}
                                               </span>
                                            </div>
                                          )
                                     })}
                                  </div>
                              </div>

                              <div className="bg-[#FAFAFA]/50 p-4 rounded-xl border border-gray-200 mt-2">
                                 <h4 className="text-zinc-900 font-bold text-xs mb-3 flex items-center gap-2"><span className="bg-gray-100 p-1.5 rounded">📞</span> Historial Gst. Cobranza</h4>
                                 {(!sol.historialContactos || sol.historialContactos.length === 0) ? (
                                     <p className="text-xs text-gray-500 italic py-2">Sin gestiones previas registradas.</p>
                                 ) : (
                                     <div className="space-y-3 max-h-40 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                                        {sol.historialContactos.map((log: any) => (
                                           <div key={log.id} className="bg-white p-3 text-xs rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                                               <div className="flex justify-between items-center mb-1">
                                                 <span className="text-[10px] text-gray-500 font-bold">{new Date(log.fecha).toLocaleString()}</span>
                                                 <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">{log.usuario}</span>
                                               </div>
                                               <p className="text-gray-600 mt-1">{log.nota}</p>
                                               {log.promesaPago && <p className="text-yellow-500 text-[10px] font-bold mt-2 bg-yellow-500/10 w-fit px-2 py-1 rounded">📅 Promesa al {new Date(log.promesaPago + "T12:00:00").toLocaleDateString()}</p>}
                                           </div>
                                        ))}
                                     </div>
                                 )}

                                 <div className="mt-2 text-sm border-t border-gray-200 pt-3">
                                    <textarea value={nuevaNota} onChange={e=>setNuevaNota(e.target.value)} placeholder="Ej: Me comuniqué para un plan de pago... prometió ir mañana." className="w-full bg-[#FAFAFA]/80 text-zinc-900 p-3 rounded-lg border border-gray-300 outline-none focus:border-yellow-500 mb-3 h-20 min-h-[5rem] transition-colors resize-none" />
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                                       <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Agendar Promesa P.:</label>
                                       <input type="date" value={fechaPromesa} onChange={e=>setFechaPromesa(e.target.value)} className="bg-[#FAFAFA] border border-gray-300 rounded-lg p-2 text-xs text-zinc-900 flex-1 outline-none focus:border-yellow-500 transition-colors" />
                                    </div>
                                    <button onClick={() => handleAgregarNotaCartera(sol)} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs py-3 rounded-lg uppercase tracking-wider shadow-md opacity-90 hover:opacity-100 transition-all">
                                       + Registrar Voluntad
                                    </button>
                                 </div>
                              </div>
                           </div>
                         )}
                      </div>
                    )
                 })}
               </div>
            )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
