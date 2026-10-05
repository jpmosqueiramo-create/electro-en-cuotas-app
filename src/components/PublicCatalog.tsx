"use client";

import { registrarProductoBorradorSiNoExiste } from "@/lib/catalogManager";
import { calcularTablaTodosLosPlanes } from "@/lib/financialEngine";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InstagramSection from "@/components/InstagramSection";
import { 
  Search,
  Filter,
  ShieldCheck, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  ChevronUp, 
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
  ArrowUpRight
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

export default function PublicCatalog() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuotas, setSelectedCuotas] = useState<number | "all">("all");

  // Quick Form State (#contacto)
  const [qfNombre, setQfNombre] = useState("");
  const [qfWhatsapp, setQfWhatsapp] = useState("");
  const [qfLocalidad, setQfLocalidad] = useState("");
  const [qfNecesidad, setQfNecesidad] = useState("");
  const [qfReferente, setQfReferente] = useState("");
  const [qfSubmitting, setQfSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Modal Solicitud de Nueva Localidad
  const [modalLocalidadOpen, setModalLocalidadOpen] = useState(false);
  const [locNombre, setLocNombre] = useState("");
  const [locCiudad, setLocCiudad] = useState("");
  const [locTel, setLocTel] = useState("");
  const [locInteres, setLocInteres] = useState("Servicio de Compra");
  const [locSubmitting, setLocSubmitting] = useState(false);

  // Carrusel de entregas (Casos de éxito)
  const entregas = [
    {
      src: "/entrega1.jpg",
      alt: "Entrega en domicilio realizada por Cuenta Hogar",
      titulo: "Entrega en domicilio y atención cercana",
      descripcion: "Tu producto gestionado y trasladado directo a la puerta de tu hogar."
    },
    {
      src: "/entrega2.jpg",
      alt: "Familia disfrutando de su compra con plan de cuotas",
      titulo: "La tranquilidad de equipar tu hogar",
      descripcion: "Buscamos alternativas, compramos en CABA, trasladamos y abonás en cuotas."
    },
    {
      src: "/entrega3.jpg",
      alt: "Transporte habilitado Cuenta Hogar realizando entrega",
      titulo: "Logística programada a tu localidad",
      descripcion: "Recorridos planificados y trato directo de vecino a vecino."
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

      const payload = {
        tipo: "solicitud_compra",
        nombreCompleto: qfNombre,
        nombre: qfNombre,
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
        await addDoc(collection(db, "solicitudes_cuenta"), payload);
      } catch (errDb) {
        console.warn("Aviso Firestore solicitudes_cuenta:", errDb);
      }

      try {
        await addDoc(collection(db, "alertas_admin"), {
          tipo: "NUEVA_SOLICITUD_COMPRA",
          clienteEmail: qfWhatsapp || qfNombre,
          mensaje: `📥 Solicitud de Servicio de Compra: ${qfNombre} (Tel: ${qfWhatsapp}, Loc: ${qfLocalidad}) - Busca: ${qfNecesidad}`,
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
            whatsapp: qfWhatsapp,
            localidad: qfLocalidad,
            necesidad: qfNecesidad,
            referente: qfReferente,
            tipo: "solicitud_compra"
          })
        });
      } catch (e) {
        console.error("Error al enviar email:", e);
      }

    } catch (err) {
      console.error("Error al guardar solicitud:", err);
    } finally {
      const refText = qfReferente ? ` Me recomendó el vendedor afiliado / cliente: ${qfReferente}.` : "";
      const mensaje = `Hola, quiero consultar por el Servicio de Compra de Cuenta Hogar. Soy ${qfNombre} de ${qfLocalidad}. Necesito el producto: ${qfNecesidad}. Mi WhatsApp es ${qfWhatsapp}.${refText} ¿Me cuentan la propuesta y condiciones del plan de cuotas?`;
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
      const mensaje = `Hola, quiero solicitar que sumen mi localidad a la cobertura del Servicio de Compra de Cuenta Hogar. Soy ${locNombre} de ${locCiudad}. Mi contacto es ${locTel}.`;
      const wame = `https://wa.me/5491125659686?text=${encodeURIComponent(mensaje)}`;
      setModalLocalidadOpen(false);
      window.open(wame, "_blank");
      setLocSubmitting(false);
    }
  };

  // Filtrado de catálogo
  const productosFiltrados = productos.filter(p => {
    const queryLower = searchQuery.toLowerCase().trim();
    const matchNombre = !queryLower || p.nombre.toLowerCase().includes(queryLower) || (p.descripcion && p.descripcion.toLowerCase().includes(queryLower));
    
    if (!matchNombre) return false;
    if (selectedCuotas === "all") return true;
    
    if (p.planesActivos) {
      return p.planesActivos[selectedCuotas] !== false;
    }
    
    if (selectedCuotas === 12) return Boolean(p.cuota12 && p.cuota12 > 0);
    if (selectedCuotas === 8) return Boolean(p.cuota8 && p.cuota8 > 0);
    
    return true;
  });

  return (
    <div className="min-h-screen bg-[#111318] text-white font-sans selection:bg-[#FFD21A] selection:text-black">
      
      <Header />

      {/* 1. HERO PRINCIPAL - SERVICIO DE COMPRA */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-16 lg:pb-24 border-b border-[#222530] bg-[#111318]">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center lg:items-start">
            
            {/* COLUMNA IZQUIERDA: MENSAJE PRINCIPAL DEL SERVICIO DE COMPRA */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* EYEBROW */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#FFD21A] bg-[#161922] border border-[#FFD21A]/50 px-3.5 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  CUENTA HOGAR · SERVICIO DE COMPRA
                </div>
              </div>

              {/* H1 CON PROTAGONISMO EDITORIAL */}
              <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-heading font-extrabold tracking-tight text-white leading-[1.15]">
                ¿Necesitás algo que no conseguís fácilmente en tu localidad?<br />
                <span className="text-[#FFD21A] block mt-1.5">
                  Te ayudamos a encontrarlo y resolver toda la compra.
                </span>
              </h1>

              {/* BAJADA CLARA & OPERATIVA */}
              <p className="text-base sm:text-lg text-[#D1D5DB] font-sans font-normal leading-relaxed max-w-2xl">
                Contanos qué estás buscando. Te presentamos alternativas, una propuesta con un plan de cuotas fijas y, si decidís avanzar, gestionamos la compra mediante mandato, la recepción y la entrega en tu domicilio.
              </p>

              {/* BLOQUE DE DOLOR RESUELTO */}
              <div className="bg-[#161922] border-l-4 border-l-[#FFD21A] border border-[#2A2E3D] px-4 py-3 rounded-xl shadow-md max-w-2xl">
                <p className="text-xs sm:text-sm font-sans font-semibold text-[#E5E7EB] leading-relaxed">
                  Sin viajar para buscar, coordinar proveedores ni resolver por separado la logística.
                </p>
              </div>

              {/* IMAGEN MOBILE (Se inserta entre el bloque de dolor y los beneficios en mobile) */}
              <div className="block lg:hidden my-6">
                <div className="relative rounded-2xl overflow-hidden border border-[#222530] bg-[#161922] shadow-xl group">
                  <img 
                    src="/centro-operaciones-cuenta-hogar.jpg" 
                    alt="Atención y gestión en el centro de operaciones Cuenta Hogar" 
                    className="w-full h-[280px] sm:h-[360px] object-cover group-hover:scale-102 transition-transform duration-700" 
                  />
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/90 via-transparent to-transparent flex items-end p-4">
                    <div className="bg-[#161922]/95 backdrop-blur-md border border-[#374151] text-white p-3.5 rounded-xl w-full shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#FFD21A]/10 border border-[#FFD21A]/40 rounded-lg flex items-center justify-center text-[#FFD21A] shrink-0">
                          <UserCheck className="w-4.5 h-4.5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-heading font-extrabold uppercase text-[#FFD21A] tracking-wider">
                            DE LA NECESIDAD A LA ENTREGA
                          </p>
                          <p className="text-xs text-[#D1D5DB] font-sans">
                            Una sola gestión para resolver toda la operación.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TRES BENEFICIOS PRINCIPALES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="bg-[#161922] border border-[#262936] p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#FFD21A]/10 border border-[#FFD21A]/30 flex items-center justify-center text-[#FFD21A] shrink-0">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-heading font-bold text-white leading-tight">
                      Más opciones sin viajar
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-sans leading-relaxed">
                    Buscamos alternativas en CABA según lo que necesitás.
                  </p>
                </div>

                <div className="bg-[#161922] border border-[#262936] p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#FFD21A]/10 border border-[#FFD21A]/30 flex items-center justify-center text-[#FFD21A] shrink-0">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-heading font-bold text-white leading-tight">
                      Plan de cuotas fijas
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-sans leading-relaxed">
                    Conocés la propuesta antes de decidir.
                  </p>
                </div>

                <div className="bg-[#161922] border border-[#262936] p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#FFD21A]/10 border border-[#FFD21A]/30 flex items-center justify-center text-[#FFD21A] shrink-0">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-heading font-bold text-white leading-tight">
                      Todo coordinado hasta tu domicilio
                    </h3>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#9CA3AF] font-sans leading-relaxed">
                    Gestionamos compra, recepción y entrega.
                  </p>
                </div>
              </div>

              {/* CTAS DE ACCIÓN & MICROCOPY */}
              <div className="pt-2 space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-3.5 items-stretch sm:items-center">
                  <a 
                    href="#contacto" 
                    className="inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] text-xs sm:text-sm font-heading font-extrabold uppercase tracking-wider px-7 h-[50px] rounded-xl transition-all shadow-lg shadow-[#FFD21A]/20 transform active:scale-95 shrink-0"
                  >
                    <span>QUIERO RECIBIR UNA PROPUESTA</span>
                    <ArrowRight className="w-4.5 h-4.5 text-[#111318]" />
                  </a>

                  <a 
                    href="#como-funciona" 
                    className="inline-flex items-center justify-center gap-2 bg-[#1A1D26] hover:bg-[#252A37] text-[#FFFDFC] hover:text-[#FFD21A] border border-[#4B5563] hover:border-[#FFD21A]/60 text-xs sm:text-sm font-heading font-bold uppercase tracking-wider px-7 h-[50px] rounded-xl transition-all shrink-0 shadow-sm"
                  >
                    <span>VER CÓMO FUNCIONA</span>
                    <ArrowRight className="w-4.5 h-4.5 text-[#FFD21A]" />
                  </a>
                </div>

                <p className="text-xs text-[#9CA3AF] font-sans flex items-center gap-1.5 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFD21A]"></span>
                  Sin compromiso · Te respondemos por WhatsApp
                </p>
              </div>

              {/* AMPLIACIÓN LOGÍSTICA DE MAYOR VOLUMEN DESDE EL 25 DE NOVIEMBRE */}
              <div className="p-3.5 bg-[#161922] border border-[#2A2E3D] rounded-xl text-xs text-[#9CA3AF] font-sans max-w-2xl flex items-start gap-3 shadow-sm">
                <span className="text-base shrink-0">🚚</span>
                <p className="leading-relaxed">
                  <strong className="text-white font-semibold">Capacidad para grandes volúmenes:</strong> Desde el 25 de noviembre ampliamos nuestra capacidad para trasladar productos como heladeras, sommiers, muebles y electrodomésticos grandes.
                </p>
              </div>

            </div>

            {/* COLUMNA DERECHA: FOTOGRAFÍA DEL CENTRO DE OPERACIONES EN DESKTOP */}
            <div className="hidden lg:block lg:col-span-5 relative lg:pt-1">
              <div className="relative rounded-2xl overflow-hidden border border-[#222530] bg-[#161922] shadow-xl group">
                <img 
                  src="/centro-operaciones-cuenta-hogar.jpg" 
                  alt="Atención y gestión en el centro de operaciones Cuenta Hogar" 
                  className="w-full h-[480px] lg:h-[520px] object-cover group-hover:scale-102 transition-transform duration-700" 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/90 via-transparent to-transparent flex items-end p-6">
                  <div className="bg-[#161922]/95 backdrop-blur-md border border-[#374151] text-white p-4 rounded-xl w-full shadow-md">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 bg-[#FFD21A]/10 border border-[#FFD21A]/40 rounded-lg flex items-center justify-center text-[#FFD21A] shrink-0">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-heading font-extrabold uppercase text-[#FFD21A] tracking-wider">
                          DE LA NECESIDAD A LA ENTREGA
                        </p>
                        <p className="text-xs text-[#D1D5DB] font-sans">
                          Una sola gestión para resolver toda la operación.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. CÓMO FUNCIONA EL SERVICIO DE COMPRA EN 6 PASOS (#COMO-FUNCIONA) */}
      <section id="como-funciona" className="py-20 lg:py-24 bg-[#161922] border-b border-[#222530] scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[#111318] border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
              PROCESO TRANSPARENTE
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Cómo funciona el Servicio de Compra
            </h2>
            <p className="text-[#9CA3AF] text-sm sm:text-base font-sans">
              Un recorrido ordenado de 6 pasos para resolver tu adquisición desde el interior.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                titulo: "Nos contás qué producto buscás",
                desc: "Nos indicás el equipo, modelo o marca que necesitás o la necesidad de tu hogar u oficina."
              },
              {
                num: "02",
                titulo: "Gestionamos la compra y la recepción",
                desc: "Con el mandato formalizado, gestionamos la adquisición solicitada. Luego recibimos e identificamos el producto en CABA y lo preparamos para su traslado."
              },
              {
                num: "03",
                titulo: "Definimos el Plan de Cuotas Fijas",
                desc: "Te enviamos una propuesta clara con el valor del plan en cuotas fijas ajustado a la operación."
              },
              {
                num: "04",
                titulo: "Formalización del Mandato",
                desc: "Aceptada la propuesta, nos otorgás el mandato para realizar la compra en tu nombre en Buenos Aires."
              },
              {
                num: "05",
                titulo: "Recepción y Control Logístico",
                desc: "Recibimos e identificamos el producto en CABA (Caracas 1101) y lo preparamos para su traslado."
              },
              {
                num: "06",
                titulo: "Traslado y Entrega en Domicilio",
                desc: "Transportamos el producto programadamente y te lo entregamos en la puerta de tu casa."
              }
            ].map((paso, idx) => (
              <div key={idx} className="bg-[#111318] border border-[#222530] p-6 rounded-2xl space-y-3 hover:border-[#FFD21A]/40 transition-all">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] font-mono font-black text-sm flex items-center justify-center">
                    {paso.num}
                  </span>
                  <span className="text-[10px] font-mono text-[#9CA3AF] uppercase font-bold">Etapa 0{idx+1}</span>
                </div>
                <h3 className="text-base font-bold text-white leading-snug">{paso.titulo}</h3>
                <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed">{paso.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 3. BENEFICIOS CONCRETOS DEL SERVICIO DE COMPRA */}
      <section className="py-16 lg:py-20 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block bg-[#161922] border border-[#FFD21A]/40 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-xs">
              TODO RESUELTO EN UNA SOLA GESTIÓN
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Más opciones. Cuotas claras. Entrega en tu domicilio.
            </h2>
            <p className="text-sm sm:text-base text-[#D1D5DB] font-sans leading-relaxed">
              Desde la búsqueda hasta la entrega, coordinamos cada etapa para que puedas resolver tu compra desde el interior sin viajar a Capital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            
            {/* TARJETA 01 */}
            <div className="bg-[#161922] border border-[#262936] hover:border-[#FFD21A]/40 p-6 rounded-2xl space-y-4 transition-all duration-200 shadow-xl flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FFD21A] bg-[#111318] border border-[#FFD21A]/30 px-2.5 py-1 rounded-md">
                    01 · MÁS OPCIONES SIN VIAJAR
                  </span>
                  <div className="w-9 h-9 bg-[#111318] border border-[#FFD21A]/30 rounded-xl flex items-center justify-center text-[#FFD21A]">
                    <Search className="w-4.5 h-4.5" />
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  Encontrá lo que necesitás en CABA
                </h3>
                
                <p className="text-xs sm:text-sm text-[#D1D5DB] font-sans leading-relaxed pt-1 border-t border-[#262936]">
                  Buscamos alternativas según lo que necesitás y te presentamos una propuesta para que puedas evaluarla antes de avanzar.
                </p>
              </div>
            </div>

            {/* TARJETA 02 (PROTAGONISMO DESTACADO LIGERAMENTE MAYOR) */}
            <div className="bg-gradient-to-b from-[#161922] to-[#1A1D26] border-2 border-[#FFD21A]/50 p-6 rounded-2xl space-y-4 transition-all duration-200 shadow-2xl shadow-[#FFD21A]/5 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FFD21A] bg-[#111318] border border-[#FFD21A] px-2.5 py-1 rounded-md shadow-xs">
                    02 · PLAN DE CUOTAS FIJAS
                  </span>
                  <div className="w-9 h-9 bg-[#FFD21A] text-[#111318] rounded-xl flex items-center justify-center font-bold shadow-md">
                    <CreditCard className="w-4.5 h-4.5" />
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                  Sabés cómo queda antes de decidir
                </h3>
                
                <p className="text-xs sm:text-sm text-[#E5E7EB] font-sans leading-relaxed pt-1 border-t border-[#FFD21A]/20">
                  Te presentamos las condiciones y el plan de cuotas fijas de la operación antes de formalizar la gestión.
                </p>
              </div>
            </div>

            {/* TARJETA 03 */}
            <div className="bg-[#161922] border border-[#262936] hover:border-[#FFD21A]/40 p-6 rounded-2xl space-y-4 transition-all duration-200 shadow-xl flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FFD21A] bg-[#111318] border border-[#FFD21A]/30 px-2.5 py-1 rounded-md">
                    03 · ENTREGA EN TU DOMICILIO
                  </span>
                  <div className="w-9 h-9 bg-[#111318] border border-[#FFD21A]/30 rounded-xl flex items-center justify-center text-[#FFD21A]">
                    <Truck className="w-4.5 h-4.5" />
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  Nos ocupamos de que llegue
                </h3>
                
                <p className="text-xs sm:text-sm text-[#D1D5DB] font-sans leading-relaxed pt-1 border-t border-[#262936]">
                  Coordinamos la recepción, el traslado y la entrega en tu domicilio dentro de las localidades de cobertura.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. OPCIONES DE COMPRA / CATALOG GRID */}
      <section className="py-20 lg:py-24 bg-[#161922] border-b border-[#222530]">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[#111318] border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
              ALGUNAS OPCIONES QUE PODEMOS GESTIONAR
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Opciones de Compra Orientativas
            </h2>
            <p className="text-[#9CA3AF] text-sm font-sans">
              Explorá algunos modelos frecuentes con planes de cuotas sugeridos. También podés solicitar cualquier otro equipo que no figure en la lista.
            </p>
          </div>

          {/* BUSCADOR Y FILTROS */}
          <div className="bg-[#111318] border border-[#222530] p-4 sm:p-6 rounded-2xl space-y-4 max-w-4xl mx-auto shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por producto, marca o categoría..."
                  className="w-full bg-[#161922] border border-[#222530] focus:border-[#FFD21A] text-white placeholder-[#9CA3AF] text-xs rounded-xl pl-10 pr-4 py-3 outline-none transition-all font-medium"
                />
              </div>

              <div className="sm:col-span-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#FFD21A] shrink-0" />
                <select
                  value={selectedCuotas}
                  onChange={(e) => setSelectedCuotas(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="w-full bg-[#161922] border border-[#222530] focus:border-[#FFD21A] text-white text-xs rounded-xl p-3 outline-none transition-all font-medium cursor-pointer"
                >
                  <option value="all">Todos los planes</option>
                  <option value={12}>Ver plan 12 cuotas</option>
                  <option value={8}>Ver plan 8 cuotas</option>
                </select>
              </div>

            </div>
          </div>

          {/* LISTADO DE PRODUCTOS */}
          {loading ? (
            <div className="py-16 text-center text-[#9CA3AF] text-sm font-mono">
              Cargando opciones disponibles...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="py-16 bg-[#111318] border border-[#222530] rounded-2xl text-center space-y-4 max-w-md mx-auto p-8">
              <ShoppingBag className="w-8 h-8 text-[#FFD21A] mx-auto" />
              <p className="text-sm text-white font-bold">¿No encontrás lo que buscás?</p>
              <p className="text-xs text-[#9CA3AF]">
                Podemos gestionar la compra de cualquier producto que necesites en Capital Federal.
              </p>
              <a href="#contacto" className="btn-primary text-xs uppercase inline-flex items-center gap-2 px-6 py-3 rounded-xl">
                Solicitar una compra personalizada
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {productosFiltrados.map((prod) => {
                const plan12 = prod.cuota12 ? { cuotaMensual: prod.cuota12 } : null;

                return (
                  <div key={prod.id} className="bg-[#111318] border border-[#222530] rounded-2xl overflow-hidden shadow-lg hover:border-[#FFD21A]/50 transition-all flex flex-col justify-between group">
                    
                    <div>
                      <div className="relative aspect-4/3 bg-[#161922] overflow-hidden flex items-center justify-center p-4">
                        <img 
                          src={prod.imagenUrl || "/logo-cuenta-hogar-oficial.png"} 
                          alt={prod.nombre} 
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/logo-cuenta-hogar-oficial.png"; }}
                        />
                      </div>

                      <div className="p-6 space-y-4">
                        <h3 className="text-base font-bold text-white line-clamp-2 leading-snug">
                          {prod.nombre}
                        </h3>
                        
                        {prod.descripcion && (
                          <p className="text-xs text-[#9CA3AF] line-clamp-2 leading-relaxed">
                            {prod.descripcion}
                          </p>
                        )}

                        <div className="bg-[#161922] border border-[#222530] p-4 rounded-xl space-y-1.5">
                          <span className="text-[10px] font-mono font-bold text-[#FFD21A] uppercase block">
                            PLAN DE CUOTAS ORIENTATIVO
                          </span>
                          {plan12 ? (
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs font-bold text-[#D1D5DB]">12 cuotas estimadas de</span>
                              <span className="text-base font-extrabold text-[#FFD21A]">
                                {formatPrice(plan12.cuotaMensual)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-white">
                              Consultar condiciones de plan
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 pt-0">
                      <a 
                        href={`https://wa.me/5491125659686?text=${encodeURIComponent(`Hola, quiero consultar por el Servicio de Compra para el producto: ${prod.nombre}. ¿Me cuentan la propuesta y el plan de cuotas?`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-md"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-[#111318]" />
                        <span>Consultar por este producto</span>
                      </a>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>

      {/* 5. COBERTURA DE ENTREGAS */}
      <section className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8">
          
          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[#161922] border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
              ENTREGAS PROGRAMADAS
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Cobertura en el Interior
            </h2>
            <p className="text-[#9CA3AF] text-sm font-sans">
              Realizamos entregas directa en las siguientes localidades y zonas de influencia:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {["Lincoln", "Zavalía", "Los Toldos", "Chivilcoy", "O'Brien"].map((loc) => (
              <div key={loc} className="bg-[#161922] border border-[#222530] p-4 rounded-xl text-center space-y-1">
                <MapPin className="w-4 h-4 text-[#FFD21A] mx-auto" />
                <p className="font-bold text-white text-sm">{loc}</p>
                <p className="text-[10px] text-[#9CA3AF] font-mono">Entrega en domicilio</p>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button 
              onClick={() => setModalLocalidadOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#FFD21A] hover:underline bg-[#161922] border border-[#FFD21A]/30 px-4 py-2 rounded-xl"
            >
              <span>¿Tu localidad todavía no está en nuestra cobertura? Consultanos →</span>
            </button>
          </div>

        </div>
      </section>

      {/* 6. CONFIANZA / CASOS REALES Y ENTREGAS */}
      <section className="py-20 lg:py-24 bg-[#161922] border-b border-[#222530]">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Entregas Reales y Presencia Local
            </h2>
            <p className="text-[#9CA3AF] text-sm font-sans">
              Fotografías reales de entregas realizadas por el equipo de Cuenta Hogar.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 relative rounded-2xl overflow-hidden border border-[#222530] bg-[#111318] shadow-xl group h-[380px]">
              <img 
                src={entregas[activeEntregaIdx].src} 
                alt={entregas[activeEntregaIdx].alt}
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-transparent to-transparent flex items-end p-6">
                <div className="bg-[#161922]/90 backdrop-blur-md border border-[#222530] p-4 rounded-xl text-white w-full space-y-1">
                  <p className="font-bold text-sm text-[#FFD21A]">{entregas[activeEntregaIdx].titulo}</p>
                  <p className="text-xs text-[#9CA3AF]">{entregas[activeEntregaIdx].descripcion}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4 text-left">
              <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider block">
                COMPROMISO Y CERCANÍA
              </span>
              <h3 className="text-2xl font-bold text-white">
                Atención directa de vecino a vecino
              </h3>
              <p className="text-xs sm:text-sm text-[#9CA3AF] font-sans leading-relaxed">
                Acompañamos cada solicitud con la presencia de nuestros vendedores afiliados en tu localidad, brindando respaldo antes, durante y después de la entrega.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={handlePrevEntrega}
                  aria-label="Anterior entrega"
                  className="w-10 h-10 rounded-xl bg-[#111318] border border-[#222530] text-white hover:text-[#FFD21A] flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleNextEntrega}
                  aria-label="Siguiente entrega"
                  className="w-10 h-10 rounded-xl bg-[#111318] border border-[#222530] text-white hover:text-[#FFD21A] flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-xs font-mono text-[#9CA3AF]">
                  {activeEntregaIdx + 1} / {entregas.length}
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 7. FORMULARIO PRINCIPAL DE SOLICITUD DE COMPRA (#CONTACTO) */}
      <section id="contacto" className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530] scroll-mt-20">
        <div className="max-w-4xl mx-auto px-6">
          
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

            {/* 7. SECCIÓN PREGUNTAS FRECUENTES (SERVICIO DE COMPRA) */}
      <section id="preguntas-frecuentes" className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530] scroll-mt-20">
        <div className="max-w-4xl mx-auto px-6 space-y-10">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
              PREGUNTAS FRECUENTES · SERVICIO DE COMPRA
            </span>
            <h2 className="text-3xl font-heading font-extrabold text-[#FFD21A]">
              Respuestas claras antes de solicitar tu propuesta
            </h2>
            <p className="text-[#9CA3AF] text-sm font-sans">
              Conocé en detalle cómo funciona la gestión por mandato y las condiciones del servicio.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "¿Pedir una propuesta me obliga a avanzar?",
                a: "No. Primero conocés la propuesta y las condiciones del plan de cuotas. Si decidís avanzar, recién entonces formalizamos la gestión mediante mandato.",
                destacada: true
              },
              {
                q: "¿Cuándo empiezo a pagar las cuotas?",
                a: "La primera cuota se abona cuando recibís el producto. En operaciones de mayor valor podemos solicitar previamente una seña, que se toma a cuenta del valor total del servicio.",
                destacada: true
              },
              {
                q: "¿Las cuotas son fijas?",
                a: "Sí. Antes de avanzar te presentamos las condiciones de la operación y el plan de cuotas fijas para que puedas evaluarlo.",
                destacada: true
              },
              {
                q: "¿Cómo puedo pagar las cuotas?",
                a: "Podés abonarlas mediante transferencia o efectivo.",
                destacada: true
              },
              {
                q: "¿Qué pasa si el producto que elegí se queda sin stock?",
                a: "Buscamos una alternativa y te presentamos una nueva propuesta antes de avanzar. Si habías abonado una seña y finalmente no se concreta la operación, se reintegra el 100% de ese importe."
              },
              {
                q: "¿Cuánto demora una compra?",
                a: "Estimamos aproximadamente 7 días corridos desde que se confirma la operación hasta la entrega. El plazo es estimativo y puede variar según la disponibilidad del producto, el proveedor y la coordinación logística."
              },
              {
                q: "¿Quién se hace cargo de la garantía?",
                a: "En productos nuevos, la garantía corresponde al vendedor del producto. Cuenta Hogar puede facilitar el traslado hasta el servicio técnico oficial correspondiente. En productos usados no existe garantía salvo que haya sido expresamente documentada en la operación."
              },
              {
                q: "¿Qué incluye el acompañamiento técnico de Cuenta Hogar?",
                a: "Cuando corresponde, retiramos el equipo en el domicilio del comprador/tomador del servicio, lo trasladamos al servicio técnico indicado y posteriormente realizamos el traslado de regreso. Cuenta Hogar no es responsable por los tiempos de reparación o demora del servicio técnico oficial o asignado."
              },
              {
                q: "¿Pueden revisar el producto antes de traerlo al interior?",
                a: "Sí. Si lo solicitás y coordinás previamente, podemos realizar una verificación visual para detectar posibles daños evidentes antes del traslado. Esta revisión no reemplaza una inspección técnica ni la garantía del producto."
              }
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    isOpen 
                      ? "bg-[#161922] border-[#FFD21A]/40 shadow-md" 
                      : "bg-[#161922]/60 border-[#222530] hover:border-[#374151]"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-bold text-white flex justify-between items-center gap-4 hover:bg-[#1A1D26] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {faq.destacada && (
                        <span className="w-2 h-2 rounded-full bg-[#FFD21A] shrink-0" title="Pregunta frecuente destacada" />
                      )}
                      <span className="text-sm sm:text-base leading-snug">{faq.q}</span>
                    </div>
                    <span className="text-[#FFD21A] shrink-0">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#D1D5DB] leading-relaxed border-t border-[#222530] pl-6 font-sans">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

{/* 8. PEQUEÑO CROSS-SELL BREVE A ENVÍOS LOW COST */}
      <section className="py-14 bg-[#161922] border-b border-[#222530]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <span className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider block">
            ¿YA COMPRASTE POR TU CUENTA EN CABA?
          </span>
          <h3 className="text-2xl font-bold text-white">
            Conocé nuestro servicio de Envíos Low Cost
          </h3>
          <p className="text-sm text-[#9CA3AF] max-w-xl mx-auto leading-relaxed">
            Si ya compraste tu mercadería directamente en locales o distribuidores de Buenos Aires y solo necesitás el punto de recepción y el traslado a tu localidad, descubrí Envíos Low Cost.
          </p>
          <div className="pt-2">
            <Link 
              href="/envios" 
              className="inline-flex items-center gap-2 bg-[#111318] hover:bg-[#1A1D26] text-[#FFD21A] border border-[#FFD21A]/40 text-xs font-extrabold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-sm"
            >
              <span>Conocer Envíos Low Cost</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* MODAL SOLICITAR NUEVA LOCALIDAD */}
      {modalLocalidadOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161922] border border-[#222530] rounded-2xl max-w-md w-full p-6 space-y-6 relative shadow-2xl">
            <button 
              onClick={() => setModalLocalidadOpen(false)}
              className="absolute top-4 right-4 text-[#9CA3AF] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Consultar por Mi Localidad</h3>
              <p className="text-xs text-[#9CA3AF]">
                Dejanos tus datos y la ciudad donde necesitás cobertura. Te avisaremos apenas incorporemos la ruta.
              </p>
            </div>

            <form onSubmit={handleSolicitarLocalidad} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1">Nombre *</label>
                <input 
                  type="text" 
                  required 
                  value={locNombre} 
                  onChange={e => setLocNombre(e.target.value)} 
                  placeholder="Tu nombre" 
                  className="w-full bg-[#111318] border border-[#222530] text-white text-xs rounded-xl p-3 outline-none focus:border-[#FFD21A]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1">Localidad y Provincia *</label>
                <input 
                  type="text" 
                  required 
                  value={locCiudad} 
                  onChange={e => setLocCiudad(e.target.value)} 
                  placeholder="Ej. Pehuajó, Buenos Aires" 
                  className="w-full bg-[#111318] border border-[#222530] text-white text-xs rounded-xl p-3 outline-none focus:border-[#FFD21A]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1">Teléfono / WhatsApp *</label>
                <input 
                  type="tel" 
                  required 
                  value={locTel} 
                  onChange={e => setLocTel(e.target.value)} 
                  placeholder="Ej. 2396 456789" 
                  className="w-full bg-[#111318] border border-[#222530] text-white text-xs rounded-xl p-3 outline-none focus:border-[#FFD21A]"
                />
              </div>

              <button 
                type="submit" 
                disabled={locSubmitting}
                className="w-full bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all disabled:opacity-50"
              >
                {locSubmitting ? "Enviando..." : "Solicitar incorporación por WhatsApp"}
              </button>
            </form>

          </div>
        </div>
      )}

      <InstagramSection />
      <Footer />

    </div>
  );
}
