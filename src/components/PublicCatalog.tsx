"use client";

import { registrarProductoBorradorSiNoExiste } from "@/lib/catalogManager";
import { calcularTablaTodosLosPlanes } from "@/lib/financialEngine";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  Search,
  Filter,
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
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-[#222530] bg-[#111318]">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* COLUMNA IZQUIERDA: MENSAJE PRINCIPAL DEL SERVICIO DE COMPRA */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* EYEBROW */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 text-xs font-heading font-bold uppercase tracking-widest text-[#FFD21A] bg-[#161922] border border-[#FFD21A]/30 px-3.5 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#FFD21A]"></span>
                  CUENTA HOGAR · SERVICIO DE COMPRA
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#FFD21A] bg-[#FFD21A]/10 border border-[#FFD21A]/20 px-3 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-[#FFD21A]" />
                  <span>Servicio Disponible · Conexión CABA al Interior</span>
                </div>
              </div>

              {/* H1 CON PROTAGONISMO EDITORIAL */}
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-heading font-extrabold tracking-tight text-[#FFD21A] leading-[1.08]">
                Comprar en Capital,<br />
                <span className="text-white">
                  más simple desde el interior.
                </span>
              </h1>

              {/* BAJADA CLARA & OPERATIVA */}
              <p className="text-base sm:text-lg text-[#9CA3AF] font-sans font-normal leading-relaxed max-w-2xl">
                Contanos qué producto necesitás. Buscamos alternativas, gestionamos la adquisición mediante mandato en Buenos Aires, coordinamos la recepción y el traslado, y te ofrecemos un plan de cuotas para resolver la operación completa.
              </p>

                            {/* AMPLIACIÓN LOGÍSTICA DE MAYOR VOLUMEN DESDE EL 25 DE NOVIEMBRE */}
              <div className="p-3.5 bg-[#FFD21A]/10 border border-[#FFD21A]/30 rounded-xl text-xs sm:text-sm text-[#FFD21A] font-bold space-y-1 max-w-2xl">
                <p className="font-extrabold text-[#FFD21A]">
                  🚚 Ampliación de capacidad logística desde el 25 de noviembre
                </p>
                <p className="text-[#D1D5DB] font-normal text-xs leading-relaxed">
                  Sumamos nuestra Ford Transit techo elevado para gestionar y trasladar productos de mayor volumen como heladeras, sommiers, muebles y electrodomésticos grandes.
                </p>
              </div>

              {/* FRASE DE DIFERENCIAL CENTRAL */}
              <div className="bg-[#161922] border-l-4 border-l-[#FFD21A] border border-[#222530] p-4 rounded-xl shadow-xs">
                <p className="text-sm sm:text-base font-sans font-semibold text-white leading-relaxed">
                  Una sola gestión: compra, logística y plan de cuotas hasta tu domicilio.
                </p>
              </div>

              {/* CTAS DE ACCIÓN */}
              <div className="pt-2 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <a 
                  href="#contacto" 
                  className="btn-primary px-8 py-4 text-xs font-heading font-bold uppercase tracking-wider justify-center shadow-md shadow-[#FFD21A]/10"
                >
                  SOLICITAR UNA COMPRA <ArrowRight className="w-4 h-4 ml-1" />
                </a>

                <a 
                  href="#como-funciona" 
                  className="btn-secondary border-[#FFD21A]/40 text-[#FFD21A] hover:bg-[#FFD21A]/10 px-8 py-4 text-xs font-heading font-bold uppercase tracking-wider justify-center shadow-xs"
                >
                  VER CÓMO FUNCIONA <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </div>

              {/* REFUERZO DE CONFIANZA SOBRIO */}
              <div className="pt-6 border-t border-[#222530] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-heading font-semibold text-[#9CA3AF]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFD21A]"></span>
                  <span>Gestión mediante mandato</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFD21A]"></span>
                  <span>Plan de cuotas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFD21A]"></span>
                  <span>Entrega en tu domicilio</span>
                </div>
              </div>

            </div>

            {/* COLUMNA DERECHA: FOTOGRAFÍA DE GESTIÓN Y RECEPCIÓN EN CABA */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-[#222530] bg-[#161922] shadow-lg group">
                <img 
                  src="/paso2-local-adentro.jpg" 
                  alt="Gestión y recepción del Servicio de Compra Cuenta Hogar" 
                  className="w-full h-[360px] sm:h-[440px] lg:h-[480px] object-cover group-hover:scale-102 transition-transform duration-700" 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-[#111318]/90 via-transparent to-transparent flex items-end p-6">
                  <div className="bg-[#161922]/95 backdrop-blur-md border border-[#222530] text-white p-4 rounded-xl w-full shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#FFD21A]/10 border border-[#FFD21A]/30 rounded-lg flex items-center justify-center text-[#FFD21A] shrink-0">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-heading font-bold uppercase text-[#FFD21A] tracking-wider">
                          GESTIÓN + LOGÍSTICA + PLAN DE CUOTAS
                        </p>
                        <p className="text-xs text-[#9CA3AF] font-sans">
                          Una solución integral pensada para conectar Capital con el interior.
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
                titulo: "Buscamos alternativas y propuesta",
                desc: "Buscamos alternativas disponibles y te presentamos una propuesta para que puedas evaluar cómo avanzar."
              },
              {
                num: "03",
                titulo: "Definimos el Plan de Cuotas",
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

      {/* 3. BENEFICIOS Y DIFERENCIALES DEL SERVICIO DE COMPRA */}
      <section className="py-20 lg:py-24 bg-[#111318] border-b border-[#222530]">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-heading font-extrabold text-[#FFD21A]">
              Diferenciales de Cuenta Hogar
            </h2>
            <p className="text-[#9CA3AF] text-sm sm:text-base font-sans">
              Por qué elegir la gestión integral de compra desde el interior.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#161922] border border-[#222530] p-8 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-[#111318] border border-[#FFD21A]/30 rounded-xl flex items-center justify-center text-[#FFD21A]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Gestión Directa en CABA</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Accedé a los precios y stock de la Capital Federal sin tener que viajar ni coordinar con múltiples vendedores.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-8 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-[#111318] border border-[#FFD21A]/30 rounded-xl flex items-center justify-center text-[#FFD21A]">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Plan de Cuotas Previsible</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Aboná la operación completa (producto + traslado) en un esquema de cuotas claras acordadas previamente.
              </p>
            </div>

            <div className="bg-[#161922] border border-[#222530] p-8 rounded-2xl space-y-4">
              <div className="w-12 h-12 bg-[#111318] border border-[#FFD21A]/30 rounded-xl flex items-center justify-center text-[#FFD21A]">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Entrega en Domicilio</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Nos encargamos del traslado programado para que recibas el equipo en la puerta de tu hogar o comercio.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. OPCIONES DE COMPRA / CATALOG GRID */}
      <section className="py-20 lg:py-24 bg-[#161922] border-b border-[#222530]">
        <div className="max-w-7xl mx-auto px-6 space-y-8">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[#111318] border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
              EJEMPLOS Y OPCIONES DISPONIBLES
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
              <span>¿Tu localidad todavía no está en nuestra cobertura? Consultar por mi localidad →</span>
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
          
          <div className="bg-[#161922] border border-[#2A2E3D] rounded-2xl p-8 sm:p-12 shadow-2xl space-y-8 relative overflow-hidden">
            
            <div className="text-center space-y-3 relative z-10">
              <span className="inline-block bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] font-mono text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full">
                SOLICITUD DE SERVICIO DE COMPRA
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Contanos qué producto necesitás
              </h2>
              <p className="text-sm text-[#9CA3AF] max-w-xl mx-auto">
                Ingresá tus datos y te enviaremos por WhatsApp una propuesta para gestionar tu compra en CABA, con las condiciones del plan de pagos.
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

                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1.5">
                    Vendedor Afiliado / Referente (Opcional)
                  </label>
                  <input 
                    type="text" 
                    value={qfReferente} 
                    onChange={e => setQfReferente(e.target.value)} 
                    placeholder="Ej. María Gómez" 
                    className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white placeholder-[#9CA3AF] text-sm rounded-xl p-3.5 outline-none transition-all"
                  />
                </div>

              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase text-[#9CA3AF] mb-1.5">
                  Producto que necesitás comprar (o link / modelo) *
                </label>
                <textarea 
                  required 
                  rows={3}
                  value={qfNecesidad} 
                  onChange={e => setQfNecesidad(e.target.value)} 
                  placeholder="Ej. Heladera No Frost Samsung 300L, Smart TV 50 pulgadas, Lavarropas Drean..." 
                  className="w-full bg-[#111318] border border-[#2D323E] focus:border-[#FFD21A] text-white placeholder-[#9CA3AF] text-sm rounded-xl p-3.5 outline-none transition-all resize-none"
                />
              </div>

              <button 
                type="submit" 
                disabled={qfSubmitting}
                className="w-full bg-[#FFD21A] hover:bg-[#FFE052] text-[#111318] py-4 rounded-xl font-heading font-extrabold text-sm uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-[#FFD21A]/10 active:scale-95 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 text-[#111318]" />
                <span>{qfSubmitting ? "Enviando..." : "Solicitar propuesta por WhatsApp"}</span>
              </button>

            </form>

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
              <h3 className="text-xl font-bold text-white">Solicitar Nueva Localidad</h3>
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

      <Footer />

    </div>
  );
}
