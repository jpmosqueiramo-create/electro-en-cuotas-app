"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InstagramSection from "@/components/InstagramSection";


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
      descripcion: "Tu producto gestionado o trasladado directo a la puerta de tu hogar."
    },
    {
      src: "/entrega2.jpg",
      alt: "Familia disfrutando de su televisor con plan de cuotas",
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
      const mensaje = `Hola, quiero consultar opciones de producto y financiación. Soy ${qfNombre}  de ${qfLocalidad}. Necesito: ${qfNecesidad}. Mi WhatsApp es ${qfWhatsapp}.${refText}`;
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
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center lg:items-start">
            
            {/* COLUMNA IZQUIERDA: ORDEN MOBILE STRICT: 1.TÍTULO -> 2.SUBTÍTULO -> 3.CTAs -> 4.FOTO TRANSIT (Mobile) -> 5.DIFERENCIALES */}
            <div className="lg:col-span-6 space-y-4 sm:space-y-6 text-left">
              
              {/* BADGE SERVICIO DE COMPRA YA DISPONIBLE */}
              <div className="inline-flex items-center gap-2 text-xs font-mono font-extrabold uppercase tracking-widest bg-[#FFD21A] text-[#111318] px-3.5 py-1.5 rounded-lg shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#111318]"></span>
                <span>SERVICIO DE COMPRA · YA DISPONIBLE</span>
              </div>

              {/* 1. TÍTULO PRINCIPAL (ENFOCADO EN NECESIDAD + PLAN DE CUOTAS + GESTIÓN) */}
              <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-white leading-[1.08]">
                Lo que necesitás,<br />
                <span className="text-[#FFD21A] block mt-1">
                  con un plan de cuotas y todo resuelto.
                </span>
              </h1>

              {/* 2. SUBTÍTULO Y BLOQUE DE BENEFICIO PRINCIPAL */}
              <div className="space-y-3">
                <p className="text-sm sm:text-base text-[#E5E7EB] font-normal leading-relaxed max-w-xl">
                  Contanos qué estás buscando. Te ayudamos a encontrar alternativas, gestionamos la compra mediante mandato y coordinamos la recepción, el traslado y la entrega en tu domicilio.
                </p>
                <div className="p-4 bg-[#161922] border border-[#FFD21A]/40 rounded-xl max-w-xl text-xs sm:text-sm text-white font-bold leading-snug space-y-2 shadow-md">
                  <p className="font-extrabold text-[#FFD21A] text-sm">
                    Una sola gestión para resolver tu compra de punta a punta.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-semibold text-[#D1D5DB] pt-1.5 border-t border-[#2A2E3D]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#FFD21A] font-bold">✓</span>
                      <span>Plan de cuotas fijas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#FFD21A] font-bold">✓</span>
                      <span>Buscamos alternativas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#FFD21A] font-bold">✓</span>
                      <span>Entrega en tu domicilio</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] font-normal pt-0.5">
                    * Desde el 25 de noviembre ampliamos nuestra capacidad para productos grandes y sumamos Envíos Low Cost.
                  </p>
                </div>
              </div>

              {/* 3. DOS CTAs COMERCIALES CON ORIENTACIÓN A CONSULTA */}
              <div className="pt-1 space-y-2">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <a 
                    href="https://wa.me/5491125659686?text=Hola%2C%20estuve%20viendo%20la%20web%20de%20Cuenta%20Hogar%20y%20quiero%20recibir%20una%20propuesta.%0A%0ANecesito%20comprar%20un%20producto%20y%20quisiera%20conocer%20las%20alternativas%2C%20el%20plan%20de%20cuotas%20y%20la%20entrega%20en%20mi%20localidad.%0A%0A%F0%9F%93%8D%20Mi%20localidad%20es%3A%0A%F0%9F%9B%92%20Producto%20que%20busco%3A%0A%0A%C2%BFMe%20pueden%20orientar%3F" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] text-xs sm:text-sm font-extrabold uppercase tracking-wider px-8 h-[50px] rounded-xl transition-all shadow-lg shadow-[#FFD21A]/20 transform active:scale-95 shrink-0"
                  >
                    <WhatsAppIcon className="w-4.5 h-4.5 text-[#111318]" />
                    <span>QUIERO RECIBIR UNA PROPUESTA</span>
                  </a>

                  <a 
                    href="#modelo" 
                    className="inline-flex items-center justify-center gap-2 bg-[#1A1D26] hover:bg-[#252A37] text-[#FFFDFC] hover:text-[#FFD21A] border border-[#4B5563] hover:border-[#FFD21A]/60 text-xs sm:text-sm font-bold uppercase tracking-wider px-8 h-[50px] rounded-xl transition-all shrink-0 shadow-sm"
                  >
                    <span>VER CÓMO FUNCIONA</span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </a>
                </div>
                <p className="text-[11px] font-medium text-[#9CA3AF]">
                  Sin compromiso · Te respondemos por WhatsApp
                </p>
              </div>

              {/* 4. FOTOGRAFÍA DEL CENTRO DE RECEPCIÓN Y GESTIÓN EN MOBILE (APARECE DESPUÉS DE LOS CTAs) */}
              <div className="lg:hidden relative pt-2">
                <div className="relative rounded-2xl overflow-hidden border border-[#2D323E] bg-[#090A0D] shadow-lg">
                  <img 
                    src="/oficina-cuenta-hogar.jpg" 
                    alt="Centro de recepción y gestión de compras de Cuenta Hogar" 
                    className="w-full h-[190px] sm:h-[240px] object-cover object-center"
                  />
                </div>
                <p className="text-[11px] font-mono text-[#9CA3AF] text-center mt-2">
                  Centro de recepción y gestión Cuenta Hogar · Comprás en cuotas y lo recibís donde estés
                </p>
              </div>

              {/* 5. DIFERENCIALES BREVES ENFOCADOS EN VALOR */}
              <div className="pt-4 border-t border-[#222530] flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs font-bold text-[#D1D5DB]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  <span>Plan de cuotas fijas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  <span>Gestión de punta a punta</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  <span>Entrega en tu domicilio</span>
                </div>
              </div>

            </div>

            {/* COLUMNA DERECHA (DESKTOP): FOTOGRAFÍA PROTAGONISTA DEL CENTRO DE RECEPCIÓN Y GESTIÓN */}
            <div className="hidden lg:block lg:col-span-6 relative lg:pt-1">
              <div className="relative rounded-3xl overflow-hidden border border-[#2D323E] bg-[#090A0D] shadow-2xl group">
                <img 
                  src="/oficina-cuenta-hogar.jpg" 
                  alt="Centro de recepción y gestión de compras de Cuenta Hogar" 
                  className="w-full h-[440px] object-cover object-center group-hover:scale-103 transition-transform duration-700" 
                />
                
                {/* DEGRADADO SUTIL INFERIOR QUE INTEGRA LA FOTO CON EL FONDO */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-transparent opacity-70 pointer-events-none" />
              </div>
              <p className="text-xs font-mono font-medium text-[#D1D5DB] text-right mt-3">
                Centro de recepción y gestión Cuenta Hogar · Comprás en cuotas y lo recibís donde estés
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
              DOS NECESIDADES · UNA SOLUCIÓN
            </span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-[#111318] tracking-tight">
              ¿Qué necesitás resolver hoy?
            </h2>
            <p className="text-base sm:text-lg text-[#4B5563] max-w-2xl mx-auto leading-relaxed">
              Ya sea que todavía estés buscando qué comprar o que ya hayas comprado en CABA, te ayudamos a resolver lo que viene después.
            </p>
          </div>

          {/* DOS TARJETAS EDITORIALES DE DOS CAMINOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* CAMINO 01: TODAVÍA NO COMPRASTE */}
            <div className="bg-[#F9FAFB] border-2 border-[#E5E7EB] hover:border-[#111318] rounded-3xl p-8 lg:p-10 transition-all flex flex-col justify-between space-y-8">
              <div className="space-y-6">
                
                {/* IDENTIFICADOR VISUAL */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 bg-[#111318] text-[#FFD21A] px-3.5 py-1.5 rounded-lg text-xs font-mono font-extrabold uppercase tracking-wider">
                    01 · TODAVÍA NO COMPRASTE
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl lg:text-3xl font-extrabold text-[#111318] tracking-tight">
                    Necesitás algo y querés resolverlo sin complicarte
                  </h3>
                  <p className="text-sm sm:text-base text-[#4B5563] leading-relaxed">
                    Si en tu localidad no encontrás la opción que buscás o querés acceder a más alternativas en Capital, te ayudamos a encontrarla, organizar la compra y resolver la operación completa.
                  </p>
                </div>

                {/* TRES NECESIDADES RESUELTAS */}
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] font-mono font-bold text-[#6B7280] uppercase tracking-wider">
                    ESTO TE PUEDE SERVIR SI:
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 bg-white border border-[#E5E7EB] p-3.5 rounded-2xl shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-[#111318] shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm font-semibold text-[#111827]">
                        Querés acceder a más opciones sin viajar a Capital.
                      </p>
                    </div>

                    <div className="flex items-start gap-3 bg-white border border-[#E5E7EB] p-3.5 rounded-2xl shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-[#111318] shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm font-semibold text-[#111827]">
                        Querés conocer un plan de cuotas antes de decidir.
                      </p>
                    </div>

                    <div className="flex items-start gap-3 bg-white border border-[#E5E7EB] p-3.5 rounded-2xl shadow-sm">
                      <CheckCircle2 className="w-5 h-5 text-[#111318] shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm font-semibold text-[#111827]">
                        Preferís resolver compra, gestión y entrega en un solo lugar.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              <a 
                href="#contacto" 
                className="w-full inline-flex items-center justify-center gap-2 bg-[#111318] hover:bg-[#1F232D] text-white hover:text-[#FFD21A] text-xs font-extrabold uppercase tracking-wider h-[52px] px-6 rounded-xl transition-all shadow-md transform active:scale-95"
              >
                <span>QUIERO RECIBIR UNA PROPUESTA</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* CAMINO 02: YA COMPRASTE EN CABA */}
            <div className="bg-[#111318] border-2 border-[#222530] text-white rounded-3xl p-8 lg:p-10 transition-all flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFD21A]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-6 relative z-10">
                
                {/* IDENTIFICADOR VISUAL & BANNER PRELANZAMIENTO DISCRETO */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <span className="inline-flex items-center gap-2 bg-[#FFD21A] text-[#111318] px-3.5 py-1.5 rounded-lg text-xs font-mono font-extrabold uppercase tracking-wider">
                    02 · YA COMPRASTE EN CABA
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] px-3 py-1 rounded-full text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFD21A] animate-pulse"></span>
                    Disponible desde el 25 de noviembre
                  </span>
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
                    Ya encontraste lo que querías. Ahora falta hacerlo llegar.
                  </h3>
                  <p className="text-sm sm:text-base text-[#9CA3AF] leading-relaxed">
                    Si compraste por tu cuenta en CABA, recibimos tu compra, la organizamos y coordinamos el traslado hasta tu domicilio en el interior.
                  </p>
                </div>

                {/* TRES NECESIDADES RESUELTAS */}
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] font-mono font-bold text-[#9CA3AF] uppercase tracking-wider">
                    ESTO TE PUEDE SERVIR SI:
                  </p>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3 bg-[#161922] border border-[#222530] p-3.5 rounded-2xl">
                      <CheckCircle2 className="w-5 h-5 text-[#FFD21A] shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm font-semibold text-white">
                        No tenés un punto de recepción en CABA.
                      </p>
                    </div>

                    <div className="flex items-start gap-3 bg-[#161922] border border-[#222530] p-3.5 rounded-2xl">
                      <CheckCircle2 className="w-5 h-5 text-[#FFD21A] shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm font-semibold text-white">
                        Querés una sola coordinación para resolver el traslado.
                      </p>
                    </div>

                    <div className="flex items-start gap-3 bg-[#161922] border border-[#222530] p-3.5 rounded-2xl">
                      <CheckCircle2 className="w-5 h-5 text-[#FFD21A] shrink-0 mt-0.5" />
                      <p className="text-xs sm:text-sm font-semibold text-white">
                        Necesitás recibir la compra directamente en tu domicilio.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              <Link 
                href="/envios" 
                className="w-full inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] text-xs font-extrabold uppercase tracking-wider h-[52px] px-6 rounded-xl transition-all shadow-lg shadow-[#FFD21A]/20 transform active:scale-95 relative z-10"
              >
                <span>CONOCER ENVÍOS LOW COST</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
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
                OPCIONES DE COMPRA
              </span>
              <h2 className="text-3xl font-extrabold text-[#111318]">
                Explorá opciones de compra
              </h2>
              <p className="text-sm text-[#4B5563]">
                Conocé algunos de los productos cuya compra podemos gestionar y una estimación del plan de cuotas.
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
                            PLAN DE CUOTAS ESTIMADO
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
          
          <div className="bg-[#161922] border border-[#2A2E3D] rounded-2xl p-6 sm:p-10 lg:p-12 shadow-2xl space-y-6 relative overflow-hidden">
            {/* ENCABEZADO Y BAJADA DE CONFIANZA */}
            <div className="text-center space-y-4 relative z-10 max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-[#FFD21A]" />
                <span>CONSULTA SIN COMPROMISO</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Contanos qué estás buscando.<br />
                <span className="text-[#FFD21A] block mt-1">Te orientamos sin compromiso.</span>
              </h2>
              
              <p className="text-sm sm:text-base text-[#D1D5DB] leading-relaxed">
                Completá estos datos básicos y te escribimos por WhatsApp con alternativas, una propuesta y el plan de cuotas. Solicitarla no te obliga a avanzar.
              </p>

              {/* MICROSEÑALES DE CONFIANZA */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <div className="inline-flex items-center gap-1.5 bg-[#111318] border border-[#2A2E3D] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E5E7EB]">
                  <ShieldCheck className="w-4 h-4 text-[#FFD21A]" />
                  <span>Sin compromiso</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#111318] border border-[#2A2E3D] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E5E7EB]">
                  <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                  <span>Respuesta por WhatsApp</span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#111318] border border-[#2A2E3D] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E5E7EB]">
                  <CreditCard className="w-4 h-4 text-[#FFD21A]" />
                  <span>Plan de cuotas</span>
                </div>
              </div>
            </div>

            {/* PASOS SIMPLES DE QUÉ PASA DESPUÉS */}
            <div className="bg-[#111318] border border-[#2A2E3D] p-4 sm:p-5 rounded-xl relative z-10 space-y-2 max-w-3xl mx-auto my-4">
              <p className="text-[11px] font-mono font-bold text-[#FFD21A] uppercase tracking-wider text-center">
                ¿CÓMO ES EL PROCESO DE CONSULTA?
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-[#161922] p-2.5 rounded-lg border border-[#222530]">
                  <span className="text-[#FFD21A] font-bold block font-mono text-[10px]">1. CONSULTÁ</span>
                  <span className="text-[#E5E7EB] font-medium leading-tight block">Nos contás qué necesitás</span>
                </div>
                <div className="bg-[#161922] p-2.5 rounded-lg border border-[#222530]">
                  <span className="text-[#FFD21A] font-bold block font-mono text-[10px]">2. RESPUESTA</span>
                  <span className="text-[#E5E7EB] font-medium leading-tight block">Te contactamos por WhatsApp</span>
                </div>
                <div className="bg-[#161922] p-2.5 rounded-lg border border-[#222530]">
                  <span className="text-[#FFD21A] font-bold block font-mono text-[10px]">3. PROPUESTA</span>
                  <span className="text-[#E5E7EB] font-medium leading-tight block">Alternativas y cuotas</span>
                </div>
                <div className="bg-[#161922] p-2.5 rounded-lg border border-[#222530]">
                  <span className="text-[#FFD21A] font-bold block font-mono text-[10px]">4. DECISIÓN</span>
                  <span className="text-[#E5E7EB] font-medium leading-tight block">Vos decidís si avanzar</span>
                </div>
              </div>
            </div>

            {/* FORMULARIO PÚBLICO */}
            <form onSubmit={handleQuickFormSubmit} className="space-y-5 relative z-10 max-w-3xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                
                <div>
                  <label className="block text-xs font-bold text-[#E5E7EB] mb-1.5">
                    Nombre y apellido <span className="text-[#FFD21A]">*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={qfNombre} 
                    onChange={e => setQfNombre(e.target.value)} 
                    placeholder="Ej. Juan Pérez" 
                    className="w-full bg-[#111318] border border-[#2D323E] hover:border-[#4B5563] focus:border-[#FFD21A] focus:ring-1 focus:ring-[#FFD21A] text-white placeholder-[#6B7280] text-sm rounded-xl p-3.5 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#E5E7EB] mb-1.5">
                    WhatsApp <span className="text-[#FFD21A]">*</span>
                  </label>
                  <input 
                    type="tel" 
                    required 
                    value={qfWhatsapp} 
                    onChange={e => setQfWhatsapp(e.target.value)} 
                    placeholder="Ej. 11 2345 6789" 
                    className="w-full bg-[#111318] border border-[#2D323E] hover:border-[#4B5563] focus:border-[#FFD21A] focus:ring-1 focus:ring-[#FFD21A] text-white placeholder-[#6B7280] text-sm rounded-xl p-3.5 outline-none transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#E5E7EB] mb-1.5">
                    Localidad de entrega <span className="text-[#FFD21A]">*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={qfLocalidad} 
                    onChange={e => setQfLocalidad(e.target.value)} 
                    placeholder="Ej. Lincoln, Chivilcoy, Los Toldos..." 
                    className="w-full bg-[#111318] border border-[#2D323E] hover:border-[#4B5563] focus:border-[#FFD21A] focus:ring-1 focus:ring-[#FFD21A] text-white placeholder-[#6B7280] text-sm rounded-xl p-3.5 outline-none transition-all"
                  />
                </div>

              </div>

              <div>
                <label className="block text-xs font-bold text-[#E5E7EB] mb-1.5">
                  ¿Qué producto estás buscando? <span className="text-[#FFD21A]">*</span>
                </label>
                <textarea 
                  required 
                  rows={3}
                  value={qfNecesidad} 
                  onChange={e => setQfNecesidad(e.target.value)} 
                  placeholder='Ej. Heladera Gafa 380 L, Smart TV 50", lavarropas automático o pegá un link si ya viste alguno.' 
                  className="w-full bg-[#111318] border border-[#2D323E] hover:border-[#4B5563] focus:border-[#FFD21A] focus:ring-1 focus:ring-[#FFD21A] text-white placeholder-[#6B7280] text-sm rounded-xl p-3.5 outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-1">
                <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                  ¿Te recomendó alguien? <span className="text-[#6B7280]">(opcional)</span>
                </label>
                <input 
                  type="text" 
                  value={qfReferente} 
                  onChange={e => setQfReferente(e.target.value)} 
                  placeholder="Nombre del vendedor afiliado o cliente" 
                  className="w-full bg-[#111318]/70 border border-[#222530] hover:border-[#2D323E] focus:border-[#FFD21A] text-white placeholder-[#6B7280] text-xs rounded-xl p-3 outline-none transition-all"
                />
              </div>

              <div className="pt-2 space-y-3">
                <button 
                  type="submit" 
                  disabled={qfSubmitting}
                  className="w-full bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-extrabold text-xs sm:text-sm uppercase tracking-wider py-4 rounded-xl transition-all shadow-xl shadow-[#FFD21A]/20 flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {qfSubmitting ? (
                    <span>Procesando solicitud...</span>
                  ) : (
                    <>
                      <WhatsAppIcon className="w-5 h-5 text-[#111318]" />
                      <span>QUIERO RECIBIR UNA PROPUESTA POR WHATSAPP</span>
                    </>
                  )}
                </button>

                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-[#FFD21A]">
                    Recibir una propuesta no te obliga a avanzar.
                  </p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Primero vemos qué necesitás y qué alternativas podemos ofrecerte.
                  </p>
                </div>
              </div>
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
                href="https://wa.me/5491125659686?text=Hola%2C%20quiero%20conocer%20c%C3%B3mo%20funcionar%C3%A1%20Env%C3%ADos%20Low%20Cost%20de%20Cuenta%20Hogar%20para%20mi%20negocio/emprendimiento%20a%20partir%20del%2025%20de%20noviembre.%0A%0ARealizo%20compras%20en%20CABA%20y%20me%20interesa%20poder%20recibirlas%20en%20un%20mismo%20punto%2C%20consolidarlas%20sin%20cargo%20y%20trasladarlas%20juntas%20hasta%20mi%20localidad.%0A%0A%F0%9F%93%8D%20Mi%20localidad%20es%3A%0A%0A%C2%BFMe%20cuentan%20c%C3%B3mo%20funcionar%C3%A1%20el%20servicio%20para%20mi%20negocio%3F" 
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

      {/* SECCIÓN INSTAGRAM & FOOTER GLOBAL */}
      <InstagramSection />
      <Footer />

    </div>
  );
}
