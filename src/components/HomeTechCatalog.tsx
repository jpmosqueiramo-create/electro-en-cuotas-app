"use client";

import Header from "@/components/Header";


import { registrarProductoBorradorSiNoExiste } from "@/lib/catalogManager";
import { calcularTablaTodosLosPlanes } from "@/lib/financialEngine";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { 
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft, 
  ArrowRight, 
  Truck, 
  Send, 
  MapPin, 
  ShoppingBag, 
  CreditCard, 
  Building2, 
  Clock, 
  Wrench, 
  X,
  Briefcase,
  CheckCircle2,
  Sparkles,
  UserCheck,
  Layers,
  ArrowUpRight,
  Package
} from "lucide-react";

type Producto = {
  id: string;
  nombre: string;
  precioAnterior: number | null;
  cuota12: number;
  cuota8: number;
  costoProducto?: number | null;
  precioContado?: number | null;
  factoresPlanes?: Record<number, number>;
  planesActivos?: Record<number, boolean>;
  descripcion: string;
  imagenUrl: string;
  imagenUrls?: string[];
};

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.419c-1.776 0-3.517-.476-5.044-1.377l-.362-.215-3.744.982.999-3.648-.236-.375c-.991-1.574-1.513-3.612-1.513-5.696 0-5.836 4.75-10.587 10.587-10.587 2.828 0 5.486 1.1 7.485 3.101 1.999 2 3.098 4.658 3.097 7.487 0 5.837-4.75 10.588-10.587 10.588m0-20.709c-6.726 0-12.2 5.474-12.2 12.2 0 2.147.56 4.246 1.624 6.091l-1.724 6.295 6.442-1.69c1.782.971 3.792 1.485 5.858 1.485 6.726 0 12.2-5.474 12.2-12.2 0-3.26-1.27-6.324-3.578-8.631-2.308-2.307-5.37-3.576-8.622-3.576" />
    </svg>
  );
}

export default function HomeTechCatalog() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Form State
  const [qfNombre, setQfNombre] = useState("");
  const [qfDni, setQfDni] = useState("");
  const [qfWhatsapp, setQfWhatsapp] = useState("");
  const [qfLocalidad, setQfLocalidad] = useState("");
  const [qfNecesidad, setQfNecesidad] = useState("");
  const [qfReferente, setQfReferente] = useState("");
  const [qfSubmitting, setQfSubmitting] = useState(false);

  // Modal Solicitud de Nueva Localidad
  const [modalLocalidadOpen, setModalLocalidadOpen] = useState(false);
  const [locNombre, setLocNombre] = useState("");
  const [locCiudad, setLocCiudad] = useState("");
  const [locTel, setLocTel] = useState("");
  const [locInteres, setLocInteres] = useState("Ambos (Financiación y Envíos)");
  const [locSubmitting, setLocSubmitting] = useState(false);

  // Carrusel de entregas (Casos de éxito)
  const entregas = [
    {
      src: "/entrega1.jpg",
      alt: "Entrega en domicilio realizada por Cuenta Hogar",
      titulo: "Entrega en domicilio y atención cercana",
      descripcion: "Tu producto financiado o trasladado directo a la puerta de tu hogar."
    },
    {
      src: "/entrega2.jpg",
      alt: "Familia disfrutando de su televisor financiado",
      titulo: "La tranquilidad de equipar tu hogar",
      descripcion: "Buscamos opciones, compramos en CABA, trasladamos y pagás en cuotas."
    },
    {
      src: "/entrega3.jpg",
      alt: "Transporte propio Cuenta Hogar realizando entrega",
      titulo: "Transporte propio Cuenta Hogar",
      descripcion: "Recorridos programados y trato directo de vecino a vecino."
    }
  ];

  const [activeEntregaIdx, setActiveEntregaIdx] = useState(0);

  const handleNextEntrega = () => {
    setActiveEntregaIdx((prev) => (prev + 1) % entregas.length);
  };

  const handlePrevEntrega = () => {
    setActiveEntregaIdx((prev) => (prev - 1 + entregas.length) % entregas.length);
  };

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const q = query(collection(db, "productos"));
        const snap = await getDocs(q);
        const prods: Producto[] = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (data.activo !== false && data.publicado !== false) {
            prods.push({ id: doc.id, ...data } as Producto);
          }
        });
        setProductos(prods.reverse());
      } catch (error) {
        console.error("Error al cargar el catálogo:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveEntregaIdx((prev) => (prev + 1) % entregas.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [entregas.length]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);
  };

  const handleQuickFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qfSubmitting) return;
    setQfSubmitting(true);
    
    try {
      if (qfNecesidad) { 
        await registrarProductoBorradorSiNoExiste(qfNecesidad).catch(() => {}); 
      }

      const payloadBuscás = {
        tipo: "contacto_rapido",
        nombreCompleto: qfNombre,
        nombre: qfNombre,
        numeroDni: qfDni,
        dni: qfDni,
        whatsapp: qfWhatsapp,
        telefono: qfWhatsapp,
        direccion: qfLocalidad,
        localidad: qfLocalidad,
        necesidad: qfNecesidad,
        productoNombre: qfNecesidad,
        productoDeseado: qfNecesidad,
        referente: qfReferente || null,
        referidoPor: qfReferente || null,
        fecha: serverTimestamp(),
        fechaIso: new Date().toISOString(),
        fechaCreacion: serverTimestamp(),
        estado: "Pendiente"
      };

      try {
        await addDoc(collection(db, "solicitudes_cuenta"), payloadBuscás);
      } catch (errDb) {
        console.warn("Aviso Firestore solicitudes_cuenta:", errDb);
      }

      try {
        await addDoc(collection(db, "solicitudes"), {
          clienteEmail: qfWhatsapp || "contacto_rapido",
          datosPersonales: {
            nombreCompleto: qfNombre,
            numeroDni: qfDni,
            telefono: qfWhatsapp,
            direccion: qfLocalidad,
            localidad: qfLocalidad
          },
          productoDeseado: qfNecesidad,
          necesidad: qfNecesidad,
          estado: "PENDIENTE",
          estadoEntrega: "PENDIENTE_ENTREGA",
          tipo: "contacto_rapido",
          referidoPor: qfReferente || null,
          fechaCreacion: serverTimestamp(),
          fechaIso: new Date().toISOString()
        });
      } catch (errSol) {
        console.warn("Aviso Firestore solicitudes:", errSol);
      }

      try {
        await addDoc(collection(db, "alertas_admin"), {
          tipo: "NUEVO_PRESUPUESTO",
          clienteEmail: qfWhatsapp || qfNombre,
          mensaje: `📥 Solicitud de Opciones: ${qfNombre} (DNI: ${qfDni}, Tel: ${qfWhatsapp}, Loc: ${qfLocalidad}) - Busca: ${qfNecesidad}`,
          fechaCreacion: serverTimestamp(),
          leida: false
        });
      } catch (errAlt) {
        console.warn("Aviso Firestore alertas_admin:", errAlt);
      }

      try {
        await fetch("/api/notificar-presupuesto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: qfNombre,
            dni: qfDni,
            whatsapp: qfWhatsapp,
            localidad: qfLocalidad,
            necesidad: qfNecesidad,
            referente: qfReferente,
            tipo: "contacto_rapido"
          })
        });
      } catch (e) {
        console.error("Error al enviar email:", e);
      }

    } catch (err) {
      console.error("Error al guardar solicitud:", err);
    } finally {
      const refText = qfReferente ? ` Me recomendó el vendedor afiliado / cliente: ${qfReferente}.` : "";
      const mensaje = `Hola, quiero consultar opciones de producto y financiación. Soy ${qfNombre} (DNI: ${qfDni}) de ${qfLocalidad}. Necesito: ${qfNecesidad}. Mi WhatsApp es ${qfWhatsapp}.${refText}`;
      const wame = `https://wa.me/5491125659686?text=${encodeURIComponent(mensaje)}`;
      window.location.href = wame;
    }
  };

  const handleSolicitarLocalidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locSubmitting) return;
    setLocSubmitting(true);

    try {
      await addDoc(collection(db, "solicitudes_localidad"), {
        nombre: locNombre,
        localidad: locCiudad,
        telefono: locTel,
        interes: locInteres,
        fechaCreacion: serverTimestamp()
      });
    } catch (err) {
      console.error("Error al guardar solicitud de localidad:", err);
    } finally {
      const mensaje = `Hola, quiero solicitar que sumen mi localidad a las rutas de Cuenta Hogar. Soy ${locNombre} de ${locCiudad}. Mi interés es: ${locInteres}. Mi contacto es ${locTel}.`;
      const wame = `https://wa.me/5491125659686?text=${encodeURIComponent(mensaje)}`;
      setModalLocalidadOpen(false);
      window.open(wame, "_blank");
      setLocSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111318] text-white font-sans selection:bg-[#FFD21A] selection:text-black">
      
      <Header />

      {/* 1. HERO PUBLICITARIO OPTIMIZADO (MOBILE-FIRST CON PRIORIDAD DE CONVERSIÓN) */}
      <section className="relative overflow-hidden pt-6 sm:pt-12 pb-10 sm:pb-20 lg:pt-16 lg:pb-24 border-b border-[#222530] bg-[#111318]">
        
        {/* LÍNEAS GRÁFICAS Y RESPLANDOR SUTIL DE FONDO */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#FFD21A]/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-24 left-1/3 w-96 h-96 bg-[#FFD21A]/5 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
            
            {/* COLUMNA IZQUIERDA: ORDEN MOBILE STRICT: 1.TÍTULO -> 2.SUBTÍTULO -> 3.CTAs -> 4.FOTO TRANSIT (Mobile) -> 5.DIFERENCIALES */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-6 text-left">
              
              {/* BADGE PRELANZAMIENTO NOVIEMBRE 2026 */}
              <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest bg-[#FFD21A] text-[#111318] px-3.5 py-1.5 rounded-lg shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#111318] animate-pulse"></span>
                <span>LANZAMIENTO · NOVIEMBRE 2026</span>
              </div>

              {/* 1. TÍTULO PRINCIPAL (BLANCO + AMARILLO ELÉCTRICO) */}
              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-white leading-[1.08]">
                Capital tiene lo que buscás.<br />
                <span className="text-[#FFD21A] block mt-1">
                  Nosotros hacemos que llegue.
                </span>
              </h1>

              {/* 2. SUBTÍTULO CORTO Y DIRECTO CON AVISO PRELANZAMIENTO */}
              <div className="space-y-3">
                <p className="text-sm sm:text-base text-[#D1D5DB] font-normal leading-relaxed max-w-xl">
                  Gestionamos tu compra por mandato o trasladamos lo que ya compraste hasta tu domicilio.
                </p>
                <div className="p-3.5 bg-[#FFD21A]/10 border border-[#FFD21A]/30 rounded-xl max-w-xl text-xs sm:text-sm text-[#FFD21A] font-bold leading-snug space-y-1">
                  <p className="font-extrabold text-[#FFD21A]">
                    Todos los servicios de Cuenta Hogar estarán disponibles desde noviembre.
                  </p>
                  <p className="text-[#D1D5DB] font-normal text-xs">
                    Ya estamos recibiendo consultas. Escribinos y te contamos cómo funcionará el servicio en tu localidad.
                  </p>
                </div>
              </div>

              {/* 3. DOS CTAs COMERCIALES CON ORIENTACIÓN A CONSULTA EN PRELANZAMIENTO */}
              <div className="pt-1 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <a 
                  href="https://wa.me/5491125659686?text=Hola%2C%20quiero%20consultar%20por%20el%20Servicio%20de%20Compra%20de%20Cuenta%20Hogar.%0A%0ANecesito%20comprar%20un%20producto%20y%20quisiera%20conocer%20c%C3%B3mo%20funciona%20la%20gesti%C3%B3n%20mediante%20mandato%2C%20el%20plan%20de%20cuotas%20y%20la%20entrega%20en%20mi%20localidad.%0A%0A%F0%9F%93%8D%20Localidad%3A%0A%F0%9F%9B%92%20Producto%20que%20necesito%3A%0A%F0%9F%94%97%20Si%20ya%20vi%20alguno%2C%20puedo%20enviarles%20el%20modelo%2C%20link%20o%20presupuesto.%0A%0A%C2%BFMe%20cuentan%20c%C3%B3mo%20ser%C3%ADa%20la%20propuesta%20y%20el%20plan%20de%20cuotas%3F" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] text-xs sm:text-sm font-extrabold uppercase tracking-wider px-7 h-[50px] rounded-xl transition-all shadow-lg shadow-[#FFD21A]/20 transform active:scale-95 shrink-0"
                >
                  <WhatsAppIcon className="w-4.5 h-4.5 text-[#111318]" />
                  <span>CONSULTAR POR UNA COMPRA</span>
                </a>

                <a 
                  href="#envios-low-cost" 
                  className="inline-flex items-center justify-center gap-2 bg-[#1A1D26] hover:bg-[#252A37] text-white hover:text-[#FFD21A] border border-[#2D323E] hover:border-[#FFD21A]/50 text-xs sm:text-sm font-bold uppercase tracking-wider px-7 h-[50px] rounded-xl transition-all shrink-0"
                >
                  <span>Disponible desde noviembre · Más Info</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </a>
              </div>

              {/* 4. FOTOGRAFÍA DE LA TRANSIT EN MOBILE (APARECE DESPUÉS DE LOS CTAs) */}
              <div className="lg:hidden relative pt-2">
                <div className="relative rounded-2xl overflow-hidden border border-[#2D323E] bg-[#090A0D] shadow-lg">
                  <img 
                    src="/flota-cuenta-hogar.jpg" 
                    alt="Renault Master oficial Cuenta Hogar realizando logística CABA - Interior" 
                    className="w-full h-[190px] sm:h-[240px] object-cover object-center"
                  />
                </div>
                <p className="text-[11px] font-mono text-[#9CA3AF] text-center mt-2">
                  Flota oficial Cuenta Hogar · Recorridos semanales CABA → Tu domicilio
                </p>
              </div>

              {/* 5. DIFERENCIALES BREVES */}
              <div className="pt-3 border-t border-[#222530] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-[#9CA3AF]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  <span>Centro logístico en CABA</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  <span>Transporte propio</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  <span>Entrega en domicilio</span>
                </div>
              </div>

            </div>

            {/* COLUMNA DERECHA (DESKTOP): FOTOGRAFÍA PROTAGONISTA DE LA RENAULT MASTER SIN RECUADROS SUPERPUESTOS */}
            <div className="hidden lg:block lg:col-span-6 relative">
              <div className="relative rounded-3xl overflow-hidden border border-[#2D323E] bg-[#090A0D] shadow-2xl group">
                <img 
                  src="/flota-cuenta-hogar.jpg" 
                  alt="Renault Master oficial Cuenta Hogar realizando logística real" 
                  className="w-full h-[440px] object-cover object-center group-hover:scale-103 transition-transform duration-700" 
                />
                
                {/* DEGRADADO SUTIL INFERIOR QUE INTEGRA LA FOTO CON EL FONDO */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-transparent opacity-70 pointer-events-none" />
              </div>
              <p className="text-xs font-mono text-[#9CA3AF] text-right mt-2.5">
                Flota habilitada para transporte de mercaderia · Recorridos programados CABA → Interior
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 2. MODELO DE TRABAJO (COMPRA POR MANDATO Y ENVÍOS CABA) */}
      <section id="modelo" className="py-16 sm:py-20 bg-[#FFFFFF] text-[#111827] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10 sm:space-y-12">
          
          {/* ENCABEZADO CENTRADO CON ESPACIADO OPTIMIZADO */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block bg-[#111318] text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
              MODELO OPERATIVO CUENTA HOGAR
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#111318] tracking-tight">
              ¿En qué situación estás?
            </h2>
            <p className="text-base sm:text-lg text-[#4B5563] max-w-xl mx-auto">
              Cuenta Hogar puede ayudarte antes o después de realizar tu compra en Capital.
            </p>
          </div>

          {/* DOS TARJETAS EDITORIALES DE DOS CAMINOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* CAMINO 01: NECESITÁS COMPRAR */}
            <div className="bg-[#F9FAFB] border-2 border-[#E5E7EB] hover:border-[#111318] rounded-3xl p-8 lg:p-10 transition-all flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                
                {/* IDENTIFICADOR VISUAL FERTIL DE CAMINO */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 bg-[#111318] text-[#FFD21A] px-3.5 py-1.5 rounded-lg text-xs font-mono font-extrabold uppercase tracking-wider">
                    01 · NECESITÁS COMPRAR
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl lg:text-3xl font-extrabold text-[#111318] tracking-tight">
                    Necesitás comprar algo en Capital
                  </h3>
                  <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
                    Contanos qué producto necesitás. Buscamos alternativas, te presentamos una propuesta y, si decidís avanzar, formalizamos el mandato de compra y gestionamos la operación de principio a fin.
                  </p>
                </div>

                {/* SECUENCIA VISUAL DE 3 PASOS */}
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] font-mono font-bold text-[#6B7280] uppercase tracking-wider">Cómo funciona este camino:</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3.5 bg-white border border-[#E5E7EB] p-3.5 rounded-2xl">
                      <span className="w-7 h-7 bg-[#111318] text-[#FFD21A] rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        01
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-[#111318] pt-1">
                        Te ayudamos a encontrar una opción adecuada
                      </p>
                    </div>

                    <div className="flex items-start gap-3.5 bg-white border border-[#E5E7EB] p-3.5 rounded-2xl">
                      <span className="w-7 h-7 bg-[#111318] text-[#FFD21A] rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        02
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-[#111318] pt-1">
                        Formalizamos la gestión mediante mandato de compra
                      </p>
                    </div>

                    <div className="flex items-start gap-3.5 bg-white border border-[#E5E7EB] p-3.5 rounded-2xl">
                      <span className="w-7 h-7 bg-[#111318] text-[#FFD21A] rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0">
                        03
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-[#111318] pt-1">
                        Recibimos la compra en CABA y coordinamos el traslado hasta tu domicilio
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              <a 
                href="#contacto" 
                className="w-full inline-flex items-center justify-center gap-2 bg-[#111318] hover:bg-[#1F232D] text-white hover:text-[#FFD21A] text-xs font-extrabold uppercase tracking-wider h-[52px] px-6 rounded-xl transition-all shadow-md transform active:scale-95"
              >
                <span>SOLICITAR UNA COMPRA</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* CAMINO 02: YA COMPRASTE · ENVÍO LOW COST */}
            <div className="bg-[#111318] border-2 border-[#222530] text-white rounded-3xl p-8 lg:p-10 transition-all flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFD21A]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-6 relative z-10">
                
                {/* IDENTIFICADOR VISUAL & BANNER PRELANZAMIENTO DISCRETO */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <span className="inline-flex items-center gap-2 bg-[#FFD21A] text-[#111318] px-3.5 py-1.5 rounded-lg text-xs font-mono font-extrabold uppercase tracking-wider">
                    02 · YA COMPRASTE
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] px-3 py-1 rounded-full text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFD21A] animate-pulse"></span>
                    Disponible desde noviembre · Ya estamos recibiendo consultas
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                    Si ya compraste en CABA
                  </h3>
                  <p className="text-sm sm:text-base text-[#9CA3AF] leading-relaxed">
                    Tu proveedor entrega la compra en nuestro centro de recepción en CABA. Nosotros la organizamos y la incorporamos al próximo recorrido hacia tu localidad.
                  </p>
                </div>

                {/* SECUENCIA VISUAL DE 3 PASOS */}
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] font-mono font-bold text-[#9CA3AF] uppercase tracking-wider">Cómo funciona este camino:</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3.5 bg-[#161922] border border-[#222530] p-3.5 rounded-2xl">
                      <span className="w-7 h-7 bg-[#FFD21A] text-[#111318] rounded-lg flex items-center justify-center font-mono font-extrabold text-xs shrink-0">
                        01
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-white pt-1">
                        Tu proveedor entrega en CABA
                      </p>
                    </div>

                    <div className="flex items-start gap-3.5 bg-[#161922] border border-[#222530] p-3.5 rounded-2xl">
                      <span className="w-7 h-7 bg-[#FFD21A] text-[#111318] rounded-lg flex items-center justify-center font-mono font-extrabold text-xs shrink-0">
                        02
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-white pt-1">
                        Recibimos y organizamos
                      </p>
                    </div>

                    <div className="flex items-start gap-3.5 bg-[#161922] border border-[#222530] p-3.5 rounded-2xl">
                      <span className="w-7 h-7 bg-[#FFD21A] text-[#111318] rounded-lg flex items-center justify-center font-mono font-extrabold text-xs shrink-0">
                        03
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-white pt-1">
                        Entregamos en tu domicilio
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              <Link 
                href="/envios" 
                className="w-full inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] text-xs font-extrabold uppercase tracking-wider h-[52px] px-6 rounded-xl transition-all shadow-lg shadow-[#FFD21A]/20 transform active:scale-95 relative z-10"
              >
                <span>COTIZAR ENVÍO LOW COST</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* 3. SECCIÓN SOLUCIÓN PARA EMPRENDEDORES Y COMERCIOS */}
      <section id="envios-low-cost" className="py-20 lg:py-24 bg-[#0E1015] border-b border-[#222530]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-16">
          
          <div className="bg-[#161922] border border-[#2A2E3D] rounded-2xl p-8 lg:p-12 shadow-2xl space-y-12">
            
            {/* ENCABEZADO RECONVERTIDO PARA EMPRENDEDORES */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
                <Briefcase className="w-3.5 h-3.5" /> EMPRENDEDORES · COMPRAS RECURRENTES
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                Cuenta Hogar, cerca de los emprendedores
              </h2>
              
              <p className="text-sm sm:text-base text-[#9CA3AF] leading-relaxed">
                Si comprás mercadería con frecuencia para tu comercio o emprendimiento, podés usar nuestro centro de recepción en CABA para recibir, organizar y consolidar tus compras antes del traslado al interior.
              </p>
              
              <div className="inline-block p-3.5 bg-[#FFD21A]/10 border border-[#FFD21A]/30 rounded-xl text-xs font-mono font-bold text-[#FFD21A] tracking-wider mt-2">
                CONSOLIDACIÓN SIN CARGO · DISPONIBLE DESDE NOVIEMBRE · YA RECIBIMOS CONSULTAS
              </div>
            </div>

            {/* 3 TARJETAS RECONVERTIDAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* TARJETA 1 */}
              <div className="bg-[#111318] border border-[#222530] p-6 rounded-xl space-y-3.5 hover:border-[#FFD21A]/40 transition-all">
                <div className="w-10 h-10 bg-[#1F2330] text-[#FFD21A] rounded-lg flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Un solo punto de recepción</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Tus proveedores entregan sus pedidos en nuestro centro de recepción en CABA.
                </p>
              </div>

              {/* TARJETA 2 - CONSOLIDACIÓN SIN CARGO */}
              <div className="bg-[#111318] border-2 border-[#FFD21A]/40 p-6 rounded-xl space-y-3.5 relative overflow-hidden shadow-lg shadow-[#FFD21A]/5">
                <div className="w-10 h-10 bg-[#FFD21A] text-[#111318] rounded-lg flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Consolidación sin cargo</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Reunimos compras de distintos proveedores para que tu mercadería viaje organizada en un solo envío.
                </p>
              </div>

              {/* TARJETA 3 */}
              <div className="bg-[#111318] border border-[#222530] p-6 rounded-xl space-y-3.5 hover:border-[#FFD21A]/40 transition-all">
                <div className="w-10 h-10 bg-[#1F2330] text-[#FFD21A] rounded-lg flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Entrega para tu negocio</h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Aprovechamos nuestros recorridos para llevar la mercadería hasta tu localidad y ayudarte a simplificar la logística.
                </p>
              </div>

            </div>

            {/* CTA RECONVERTIDO PARA WHATSAPP EMPRENDEDORES */}
            <div className="text-center pt-2">
              <a 
                href="https://wa.me/5491125659686?text=Hola%2C%20quiero%20conocer%20el%20servicio%20de%20Cuenta%20Hogar%20para%20emprendedores%20y%20comercios.%0A%0ATengo%20un%20negocio/emprendimiento%20y%20realizo%20compras%20recurrentes%20en%20CABA.%0AMe%20interesa%20saber%20c%C3%B3mo%20funciona%20la%20recepci%C3%B3n%20de%20mercader%C3%ADa%2C%20la%20consolidaci%C3%B3n%20sin%20cargo%20y%20el%20traslado%20al%20interior.%0A%0AMi%20localidad%3A%0ATipo%20de%20mercader%C3%ADa%20que%20compro%3A%0AFrecuencia%20aproximada%20de%20compras%3A%0ACantidad%20estimada%20de%20bultos%20por%20env%C3%ADo%3A%0A%0A%C2%BFMe%20pueden%20contar%20c%C3%B3mo%20funciona%20el%20servicio%20y%20qu%C3%A9%20opciones%20tengo%20para%20mi%20negocio%3F" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-extrabold text-xs uppercase tracking-wider px-8 py-4 rounded-xl transition-all shadow-lg shadow-[#FFD21A]/20 transform active:scale-95"
              >
                <WhatsAppIcon className="w-4.5 h-4.5 text-[#111318]" />
                <span>QUIERO CONOCER EL SERVICIO PARA EMPRENDEDORES</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* 4. CATÁLOGO DE PRODUCTOS DESTACADOS */}
      <section id="catalogo" className="py-20 lg:py-24 bg-[#FFFFFF] text-[#111827] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#E5E7EB] pb-6">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-[#111318] uppercase tracking-widest bg-[#FFD21A] px-3 py-1 rounded-md">
                CATÁLOGO DESTACADO
              </span>
              <h2 className="text-3xl font-extrabold text-[#111318]">
                Explorá opciones de compra
              </h2>
              <p className="text-sm text-[#4B5563]">
                Conocé algunos de los productos cuya compra podemos gestionar y una estimación del plan de pagos.
              </p>
            </div>

            <a 
              href="#contacto" 
              className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#111318] hover:text-[#FFD21A] transition-colors"
            >
              <span>¿Buscás otro modelo? Consultanos</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-6 space-y-4 animate-pulse">
                  <div className="w-full h-48 bg-[#E5E7EB] rounded-xl" />
                  <div className="h-6 bg-[#E5E7EB] rounded w-3/4" />
                  <div className="h-4 bg-[#E5E7EB] rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-12 text-center space-y-4">
              <Package className="w-12 h-12 text-[#9CA3AF] mx-auto" />
              <h3 className="text-xl font-bold text-[#111318]">Catálogo en actualización</h3>
              <p className="text-sm text-[#4B5563] max-w-md mx-auto">
                Podés pedir la cotización de cualquier electrodoméstico o artículo que necesites directamente a través de nuestro formulario.
              </p>
              <a href="#contacto" className="inline-block bg-[#111318] text-[#FFD21A] font-bold text-xs uppercase px-6 py-3 rounded-xl">
                Solicitar Cotización Directa
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {productos.slice(0, 6).map(prod => {
                const planes = calcularTablaTodosLosPlanes(prod.costoProducto || prod.precioAnterior || 100000, prod.factoresPlanes, prod.planesActivos);
                const plan12 = planes.find(p => p.cuotas === 12);

                return (
                  <div 
                    key={prod.id} 
                    className="group bg-[#F9FAFB] border border-[#E5E7EB] hover:border-[#111318] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* IMAGEN DEL PRODUCTO */}
                      <div className="relative w-full h-56 bg-white p-4 flex items-center justify-center overflow-hidden border-b border-[#E5E7EB]">
                        <img 
                          src={prod.imagenUrl || "/logo-cuenta-hogar-oficial.png"} 
                          alt={prod.nombre} 
                          className="max-h-48 w-auto object-contain group-hover:scale-105 transition-transform duration-300" 
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/logo-cuenta-hogar-oficial.png"; }}
                        />
                        <div className="absolute top-3 right-3 bg-[#111318] text-[#FFD21A] text-[10px] font-mono font-bold px-2.5 py-1 rounded-md">
                          ENTREGA CABA & INTERIOR
                        </div>
                      </div>

                      {/* DETALLES DEL PRODUCTO */}
                      <div className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-[#111318] line-clamp-2 leading-snug">
                          {prod.nombre}
                        </h3>
                        
                        {prod.descripcion && (
                          <p className="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
                            {prod.descripcion}
                          </p>
                        )}

                        {/* PLAN DE CUOTAS */}
                        <div className="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-2">
                          <span className="text-[10px] font-mono font-bold text-[#6B7280] uppercase block">
                            PLAN DE PAGOS ESTIMADO
                          </span>
                          {plan12 ? (
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs font-bold text-[#374151]">12 cuotas fijas de</span>
                              <span className="text-lg font-extrabold text-[#111318]">
                                {formatPrice(plan12.cuotaMensual)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-sm font-bold text-[#111318]">
                              Consultar planes de financiamiento
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BOTÓN DE COTIZACIÓN */}
                    <div className="p-6 pt-0">
                      <a 
                        href={`https://wa.me/5491125659686?text=${encodeURIComponent(`Hola, quiero solicitar cotización para gestionar la compra del producto: ${prod.nombre}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#111318] hover:bg-[#1F232D] text-white hover:text-[#FFD21A] font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                        <span>Solicitar cotización</span>
                      </a>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-center text-[#6B7280] max-w-3xl mx-auto pt-6 leading-relaxed">
            * Los importes son orientativos y están sujetos a cotización y condiciones contractuales. El plan contempla el reintegro del capital utilizado para la compra y los servicios asociados que correspondan.
          </p>

        </div>
      </section>

      {/* 5. FORMULARIO RÁPIDO DE CONTACTO Y SOLICITUD (#CONTACTO) */}
      <section id="contacto" className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="bg-[#161922] border border-[#2A2E3D] rounded-2xl p-8 sm:p-12 shadow-2xl space-y-8 relative overflow-hidden">
            
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD21A]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center space-y-3 relative z-10">
              <span className="inline-block bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
                SOLICITUD RÁPIDA DE OPCIONES
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Contanos qué necesitás y te ayudamos a conseguirlo
              </h2>
              <p className="text-sm text-[#9CA3AF] max-w-xl mx-auto">
                Contanos qué producto buscás y te enviaremos por WhatsApp una propuesta para gestionar tu compra, con las condiciones del plan de pagos.
              </p>
            </div>

            <form onSubmit={handleQuickFormSubmit} className="space-y-5 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1.5">
                    Tu Nombre Completo *
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={qfNombre} 
                    onChange={e => setQfNombre(e.target.value)} 
                    placeholder="Ej. Juan Pérez" 
                    className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white placeholder-[#9CA3AF] text-sm rounded-xl p-3.5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1.5">
                    Número de DNI *
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={qfDni} 
                    onChange={e => setQfDni(e.target.value)} 
                    placeholder="Ej. 30123456" 
                    className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white placeholder-[#9CA3AF] text-sm rounded-xl p-3.5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1.5">
                    Número de WhatsApp *
                  </label>
                  <input 
                    type="tel" 
                    required 
                    value={qfWhatsapp} 
                    onChange={e => setQfWhatsapp(e.target.value)} 
                    placeholder="Ej. 11 2345 6789" 
                    className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white placeholder-[#9CA3AF] text-sm rounded-xl p-3.5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1.5">
                    Localidad de Entrega *
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={qfLocalidad} 
                    onChange={e => setQfLocalidad(e.target.value)} 
                    placeholder="Ej. Lincoln, Chivilcoy, Los Toldos..." 
                    className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white placeholder-[#9CA3AF] text-sm rounded-xl p-3.5 outline-none transition-all"
                  />
                </div>

              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1.5">
                  ¿Qué producto estás buscando o necesitás trasladar? *
                </label>
                <textarea 
                  required 
                  rows={3}
                  value={qfNecesidad} 
                  onChange={e => setQfNecesidad(e.target.value)} 
                  placeholder="Ej. Heladera Gafa 380L, Smart TV 50 pulgadas, lavarropas automático..." 
                  className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white placeholder-[#9CA3AF] text-sm rounded-xl p-3.5 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1.5">
                  ¿Te recomendó algún afiliado o cliente de Cuenta Hogar? (Opcional)
                </label>
                <input 
                  type="text" 
                  value={qfReferente} 
                  onChange={e => setQfReferente(e.target.value)} 
                  placeholder="Ej. María Gómez (Vendedora afiliada)" 
                  className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white placeholder-[#9CA3AF] text-sm rounded-xl p-3.5 outline-none transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={qfSubmitting}
                className="w-full bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-extrabold text-sm uppercase tracking-wider py-4 rounded-xl transition-all shadow-xl shadow-[#FFD21A]/20 flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-50"
              >
                {qfSubmitting ? (
                  <span>Procesando solicitud...</span>
                ) : (
                  <>
                    <span>Enviar Solicitud y Cotizar por WhatsApp</span>
                    <WhatsAppIcon className="w-5 h-5 text-[#111318]" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-[#9CA3AF] pt-2">
                🔒 Tus datos están protegidos. Sin compromiso de compra.
              </p>
            </form>

          </div>

        </div>
      </section>

      {/* 6. CARRUSEL DE CASOS DE ÉXITO Y ENTREGAS REALES */}
      <section className="py-20 lg:py-24 bg-[#FFFFFF] text-[#111827] border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-block bg-[#111318] text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
              ENTREGAS REALES Y TESTIMONIOS
            </span>
            <h2 className="text-3xl font-extrabold text-[#111318]">
              Recorridos programados y entregas en puerta
            </h2>
            <p className="text-sm text-[#4B5563]">
              Fotos reales de nuestra logística y clientes en cada localidad.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 items-center">
              
              <div className="h-72 md:h-96 relative bg-[#111318]">
                <img 
                  src={entregas[activeEntregaIdx].src} 
                  alt={entregas[activeEntregaIdx].alt} 
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-8 space-y-4 text-left">
                <span className="text-xs font-mono font-bold text-[#111318] uppercase tracking-wider bg-[#FFD21A] px-2.5 py-1 rounded">
                  CASO REAL DE ENTREGA
                </span>
                <h3 className="text-2xl font-bold text-[#111318]">
                  {entregas[activeEntregaIdx].titulo}
                </h3>
                <p className="text-sm text-[#4B5563] leading-relaxed">
                  {entregas[activeEntregaIdx].descripcion}
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-[#E5E7EB]">
                  <button 
                    onClick={handlePrevEntrega}
                    className="p-2.5 bg-white border border-[#E5E7EB] hover:bg-[#111318] hover:text-white rounded-xl transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleNextEntrega}
                    className="p-2.5 bg-white border border-[#E5E7EB] hover:bg-[#111318] hover:text-white rounded-xl transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <span className="text-xs font-mono font-bold text-[#6B7280] ml-2">
                    {activeEntregaIdx + 1} / {entregas.length}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* BOTÓN SOLICITAR NUEVA LOCALIDAD */}
          <div className="text-center pt-4">
            <button 
              onClick={() => setModalLocalidadOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#111318] bg-[#F3F4F6] border border-[#E5E7EB] hover:bg-[#111318] hover:text-[#FFD21A] px-5 py-3 rounded-xl transition-all"
            >
              <MapPin className="w-4 h-4 text-[#FFD21A]" />
              <span>¿No ves tu ciudad? Solicitar nueva localidad en las rutas</span>
            </button>
          </div>

        </div>
      </section>

      {/* MODAL SOLICITUD NUEVA LOCALIDAD */}
      {modalLocalidadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#161922] border border-[#2A2E3D] text-white rounded-2xl p-6 sm:p-8 max-w-lg w-full space-y-6 relative">
            
            <button 
              onClick={() => setModalLocalidadOpen(false)}
              className="absolute top-4 right-4 text-[#9CA3AF] hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider">
                EXPANSIÓN DE RUTAS LOGÍSTICAS
              </span>
              <h3 className="text-2xl font-bold text-white">
                Solicitar inclusión de tu Ciudad
              </h3>
              <p className="text-xs text-[#9CA3AF]">
                Sumamos localidades según el volumen de solicitudes recibidas.
              </p>
            </div>

            <form onSubmit={handleSolicitarLocalidad} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1">Nombre *</label>
                <input 
                  type="text" required value={locNombre} onChange={e => setLocNombre(e.target.value)}
                  placeholder="Tu Nombre"
                  className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white text-sm p-3 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1">Ciudad / Localidad *</label>
                <input 
                  type="text" required value={locCiudad} onChange={e => setLocCiudad(e.target.value)}
                  placeholder="Ej. Pehuajó, Junín, Carlos Casares..."
                  className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white text-sm p-3 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1">Teléfono / WhatsApp *</label>
                <input 
                  type="tel" required value={locTel} onChange={e => setLocTel(e.target.value)}
                  placeholder="Ej. 11 2345 6789"
                  className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white text-sm p-3 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1">Tu Interés *</label>
                <select 
                  value={locInteres} onChange={e => setLocInteres(e.target.value)}
                  className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white text-sm p-3 rounded-xl outline-none"
                >
                  <option value="Ambos (Financiación y Envíos)">Ambos (Financiación y Envíos)</option>
                  <option value="Solo Financiación en Cuotas">Solo Financiación en Cuotas</option>
                  <option value="Solo Envíos Low Cost desde CABA">Solo Envíos Low Cost desde CABA</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={locSubmitting}
                className="w-full bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-md"
              >
                {locSubmitting ? "Enviando..." : "Enviar Solicitud de Localidad"}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* 7. FOOTER TECH EXCLUSIVO DE LA HOME EXPERIMENTAL */}
      <footer className="bg-[#090A0D] border-t border-[#1C1E26] text-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-[#111318] border border-[#FFD21A]/40 rounded-lg">
                  <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-8 w-auto" />
                </div>
                <span className="font-bold text-white text-base">CUENTA HOGAR</span>
              </div>
              <p className="text-xs text-[#9CA3AF] max-w-md leading-relaxed">
                Operatoria de mandato comercial, traslado y logística desde Buenos Aires hasta domicilios en el interior.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-[#FFD21A]">
                <MapPin className="w-4 h-4 text-[#FFD21A]" />
                <span>Centro de Logística & Atención: CABA, Argentina</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider">
                Navegación
              </h4>
              <ul className="space-y-2 text-xs text-[#9CA3AF]">
                <li><a href="#modelo" className="hover:text-white transition-colors">Cómo Funciona</a></li>
                <li><a href="#catalogo" className="hover:text-white transition-colors">Opciones de compra</a></li>
                <li><a href="#envios-low-cost" className="hover:text-white transition-colors">Envíos Low Cost</a></li>
                <li><Link href="/nosotros" className="hover:text-white transition-colors">Sobre Nosotros</Link></li>
                <li><Link href="/envios" className="hover:text-white transition-colors">Tarifario Fletes</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider">
                Legal & Accesos
              </h4>
              <ul className="space-y-2 text-xs text-[#9CA3AF]">
                <li><Link href="/terms" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Política de Privacidad</Link></li>
                <li><Link href="/arrepentimiento" className="hover:text-white transition-colors">Boton de Arrepentimiento</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Acceso Operadores</Link></li>
                <li><Link href="/login-afiliado" className="hover:text-white transition-colors">Red de Afiliados</Link></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-[#1C1E26] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#6B7280]">
            <p>© {new Date().getFullYear()} Cuenta Hogar. Todos los derechos reservados.</p>
            
          </div>

        </div>
      </footer>

    </div>
  );
}
