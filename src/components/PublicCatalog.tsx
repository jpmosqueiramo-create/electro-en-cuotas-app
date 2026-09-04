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
  Package,
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
    <div className="min-h-screen bg-[#121316] text-zinc-100 font-sans selection:bg-[#fe5000] selection:text-white">
      
      <Header />

      {/* 1. HERO PRINCIPAL (MANROPE 700 + SOURCE SANS 3 + 2 CAMINOS CLAROS) */}
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-6 text-center">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/80 text-zinc-300 text-xs font-heading font-medium tracking-wide mb-8">
            <Sparkles className="w-3.5 h-3.5 text-[#fe5000]" /> Tu puente directo entre Capital Federal y el Interior
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-heading font-bold tracking-tight leading-[1.12] mb-6 text-white max-w-4xl mx-auto">
            Lo que necesitás de Capital,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-[#fe5000] to-amber-500">
              más cerca de tu casa.
            </span>
          </h1>
          
          <p className="text-lg lg:text-xl text-zinc-300 mb-12 max-w-2xl mx-auto font-sans font-normal leading-[1.6]">
            Compramos, financiamos y trasladamos productos desde Capital Federal hacia nuestras localidades de cobertura.
          </p>

          {/* DOS CAMINOS CLAROS CON JERARQUÍA PROFESIONAL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto text-left">
            
            {/* CAMINO 1: COMPRA Y FINANCIACIÓN */}
            <div className="bg-[#181920] border border-zinc-800 hover:border-[#fe5000]/60 p-8 rounded-2xl shadow-sm relative flex flex-col justify-between group transition-all duration-200">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#fe5000]/10 text-[#fe5000] font-heading font-semibold text-xs uppercase tracking-wider border border-[#fe5000]/20">
                  <CreditCard className="w-3.5 h-3.5" /> Compra y Financiación
                </div>
                <h2 className="text-2xl lg:text-[28px] font-heading font-bold text-white leading-tight">
                  Necesito comprar y financiar
                </h2>
                <p className="text-zinc-300 text-[15px] font-sans leading-[1.6]">
                  Contanos qué necesitás. Buscamos alternativas, gestionamos la compra, te lo llevamos y lo pagás en cuotas. Podés consultar por nuestra web, WhatsApp o a través del <strong className="text-white font-semibold">vendedor afiliado</strong> de tu localidad.
                </p>
              </div>

              <div className="pt-8">
                <a 
                  href="#contacto" 
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#fe5000] hover:bg-[#e04600] text-white text-base font-heading font-semibold h-12 px-6 rounded-xl shadow-sm transition-all duration-200 uppercase tracking-wider"
                >
                  Quiero comprar y financiar <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* CAMINO 2: ENVÍOS LOW COST */}
            <div className="bg-[#181920] border border-zinc-800 hover:border-emerald-500/60 p-8 rounded-2xl shadow-sm relative flex flex-col justify-between group transition-all duration-200">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-heading font-semibold text-xs uppercase tracking-wider border border-emerald-500/20">
                  <Truck className="w-3.5 h-3.5" /> Envíos Low Cost
                </div>
                <h2 className="text-2xl lg:text-[28px] font-heading font-bold text-white leading-tight">
                  Ya compré en Capital
                </h2>
                <p className="text-zinc-300 text-[15px] font-sans leading-[1.6]">
                  Recibimos tu compra en nuestro centro logístico de CABA y te la llevamos al interior con nuestros <strong className="text-emerald-400 font-semibold">Envíos Low Cost</strong>. Para emprendedores recurrentes, la consolidación de cargas es <strong className="text-white font-semibold">sin cargo</strong>.
                </p>
              </div>

              <div className="pt-8">
                <a 
                  href="#envios-low-cost" 
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-base font-heading font-semibold h-12 px-6 rounded-xl shadow-sm transition-all duration-200 uppercase tracking-wider"
                >
                  Cotizar Envío Low Cost <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. ENVÍOS LOW COST DESDE CABA AL INTERIOR */}
      <section id="envios-low-cost" className="py-24 lg:py-28 bg-[#121316] border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          
          <div className="bg-[#181920] border border-zinc-800 rounded-2xl p-8 lg:p-12 shadow-sm space-y-12">
            
            {/* ENCABEZADO */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider">
                <Truck className="w-3.5 h-3.5" /> Envíos Low Cost desde CABA al interior
              </div>
              <h2 className="text-3xl lg:text-[40px] font-heading font-bold text-white leading-tight">
                ¿Compraste en Capital y traerlo te sale demasiado caro?
              </h2>
              <p className="text-zinc-300 text-base lg:text-[17px] font-sans leading-[1.6]">
                Mandá tu compra a nuestro centro de recepción en CABA (<strong className="text-white font-semibold">Caracas 1101</strong>). La recibimos, la organizamos y te la llevamos hasta tu domicilio aprovechando nuestros recorridos programados.
              </p>
            </div>

            {/* FOTO DESTACADA TRANSPORTE PROPIO */}
            <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
              <img 
                src="/flota-cuenta-hogar.jpg" 
                alt="Transporte propio Cuenta Hogar" 
                className="w-full h-[320px] lg:h-[400px] object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end p-6">
                <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 text-white p-4 rounded-xl w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-heading font-bold uppercase text-white tracking-wider">Transporte propio Cuenta Hogar</p>
                      <p className="text-[12px] text-zinc-300 font-sans">Control directo de carga, recorridos programados y entregas en domicilio</p>
                    </div>
                  </div>
                  <a
                    href="https://wa.me/5491125659686?text=Hola!%20Quiero%20cotizar%20un%20*Env%C3%ADo%20Low%20Cost*%20desde%20CABA%20hacia%20el%20interior."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-semibold px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors whitespace-nowrap"
                  >
                    <WhatsAppIcon className="w-4 h-4" /> Cotizar mi envío
                  </a>
                </div>
              </div>
            </div>

            {/* 3 PASOS SIMPLES DE ENVÍOS LOW COST */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/70 border border-zinc-800 p-6 rounded-xl space-y-2.5">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 font-heading font-bold border border-emerald-500/20 text-base">
                  1
                </div>
                <h3 className="text-lg font-heading font-bold text-white">Despachás a CABA</h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Tus compras se entregan en nuestro centro logístico en <strong className="text-white font-medium">Caracas 1101, CABA</strong>.
                </p>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800 p-6 rounded-xl space-y-2.5">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 font-heading font-bold border border-emerald-500/20 text-base">
                  2
                </div>
                <h3 className="text-lg font-heading font-bold text-white">Organizamos la carga</h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Recibimos, acopiamos y consolidamos tus paquetes para la partida programada.
                </p>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800 p-6 rounded-xl space-y-2.5">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20 text-base">
                  3
                </div>
                <h3 className="text-lg font-heading font-bold text-white">Entrega en tu domicilio</h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  Nuestro transporte propio lleva tus productos directo a la puerta de tu casa o comercio.
                </p>
              </div>
            </div>

            {/* BLOQUE EMPRENDEDORES CON BENEFICIO DESTACADO */}
            <div className="bg-zinc-900/90 border border-emerald-500/40 p-8 rounded-xl space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-800 pb-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-heading font-semibold text-xs uppercase tracking-wider mb-2">
                    <Briefcase className="w-3.5 h-3.5" /> Especial Emprendedores y Comercios
                  </span>
                  <h3 className="text-2xl lg:text-3xl font-heading font-bold text-white">
                    ¿Comprás mercadería seguido en Capital?
                  </h3>
                  <p className="text-zinc-300 text-sm font-sans mt-2 max-w-xl">
                    Tus proveedores pueden entregar directamente en nuestro local de CABA. Recibimos tus compras, las organizamos y las llevamos juntas hasta tu domicilio.
                  </p>
                </div>

                <div className="bg-emerald-500 text-slate-950 p-5 rounded-xl font-heading font-bold text-center shrink-0 w-full md:w-auto">
                  <span className="text-[11px] uppercase tracking-wider block opacity-90">Beneficio Exclusivo</span>
                  <span className="text-2xl font-bold block tracking-tight">CONSOLIDACIÓN SIN CARGO</span>
                  <span className="text-[11px] font-sans font-medium block mt-1 text-slate-900">Solo pagás por los bultos trasladados</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-zinc-300 font-sans">
                <div className="bg-[#121316] p-3.5 rounded-lg border border-zinc-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Una sola dirección de recepción en CABA (Caracas 1101).</span>
                </div>
                <div className="bg-[#121316] p-3.5 rounded-lg border border-zinc-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Compras de distintos proveedores en un solo lugar.</span>
                </div>
                <div className="bg-[#121316] p-3.5 rounded-lg border border-zinc-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Consolidación sin cargo adicional.</span>
                </div>
                <div className="bg-[#121316] p-3.5 rounded-lg border border-zinc-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Viajes programados con total previsibilidad.</span>
                </div>
                <div className="bg-[#121316] p-3.5 rounded-lg border border-zinc-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Entrega directa en la puerta de tu negocio o casa.</span>
                </div>
                <div className="bg-[#121316] p-3.5 rounded-lg border border-zinc-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Menor dependencia de distintos comisionistas.</span>
                </div>
              </div>

              <div className="pt-2 text-center md:text-left">
                <a
                  href="https://wa.me/5491125659686?text=Hola!%20Quiero%20usar%20*Env%C3%ADos%20Low%20Cost*%20para%20mi%20negocio%20/%20emprendimiento."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-semibold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  Quiero usar Envíos Low Cost para mi negocio
                </a>
              </div>
            </div>

            {/* UBICACIÓN CABA */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-heading font-bold text-zinc-400 uppercase tracking-wider block">Centro Logístico y Domicilio Legal</span>
                    <strong className="text-base text-white font-heading font-bold">Caracas 1101, Ciudad Autónoma de Buenos Aires</strong>
                  </div>
                </div>
                <Link
                  href="/flete"
                  className="text-xs font-heading font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Ver guía detallada de Envíos Low Cost →
                </Link>
              </div>

              <div className="w-full rounded-xl overflow-hidden border border-zinc-800">
                <iframe
                  title="Ubicación Centro Logístico CABA - Caracas 1101"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3283.473539827663!2d-58.46820522346083!3d-34.61747805822394!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcc9f3a61c572b%3A0x6b2e35a1408018e6!2sCaracas%201101%2C%20C1416AOS%20CABA!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
                  width="100%"
                  height="240"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-[240px] rounded-xl"
                />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. TRANSPORTE PROPIO CUENTA HOGAR */}
      <section className="py-24 lg:py-28 bg-[#16171d] border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/20 text-xs font-heading font-semibold uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5" /> Logística Directa
            </span>
            <h2 className="text-3xl lg:text-[40px] font-heading font-bold text-white leading-tight">
              Transporte propio Cuenta Hogar
            </h2>
            <p className="text-zinc-300 text-base lg:text-[17px] font-sans leading-[1.6]">
              Controlamos directamente la carga, los recorridos y las entregas. Esto nos permite organizar mejor los tiempos, reducir la dependencia de terceros y brindar mayor previsibilidad a nuestros clientes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2">
              <Clock className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Recorridos programados</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Salidas organizadas periódicamente desde CABA con cronograma hacia cada localidad.
              </p>
            </div>

            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2">
              <Layers className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Mayor control de tiempos</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Previsibilidad total en la recepción, consolidación y llegada a destino.
              </p>
            </div>

            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2">
              <UserCheck className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Menor dependencia de comisionistas</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Un solo canal directo sin depender de distintos transportistas con días y horarios cambiantes.
              </p>
            </div>

            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2">
              <Sparkles className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Escalabilidad de frecuencia</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Posibilidad de ampliar la frecuencia de viajes cuando aumente la demanda en tu zona.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COBERTURA GEOGRÁFICA CORREGIDA (SECCIÓN BLANCA HARMONIOSA) */}
      <section className="py-24 lg:py-28 bg-white text-zinc-900 border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/20 text-xs font-heading font-bold uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5" /> Cobertura Geográfica
            </span>
            
            <h2 className="text-3xl lg:text-[40px] font-heading font-bold text-zinc-900 leading-tight">
              ¿En qué localidades estamos?
            </h2>
            
            <p className="text-zinc-800 text-lg font-sans font-bold leading-[1.6]">
              Actualmente llegamos a Lincoln, Zavalía, Los Toldos, Chivilcoy y O'Brien.
            </p>

            <p className="text-zinc-600 text-base font-sans leading-[1.6]">
              Estamos ampliando progresivamente nuestras rutas para llegar cada vez a más hogares y negocios del interior.
            </p>
            
            {/* CIUDADES ACTIVAS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {["Lincoln", "Zavalía", "Los Toldos", "Chivilcoy", "O'Brien"].map((ciudad, idx) => (
                <div key={idx} className="bg-slate-50 border border-zinc-200 rounded-xl p-3.5 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#fe5000]" />
                  <span className="font-heading font-bold text-zinc-900 text-sm">{ciudad}</span>
                </div>
              ))}
            </div>

            {/* CTA SOLICITAR NUEVA LOCALIDAD */}
            <div className="pt-6 border-t border-zinc-200 space-y-3">
              <p className="text-sm font-heading font-bold text-zinc-800">
                ¿Tu localidad todavía no está en nuestra ruta?
              </p>
              <button
                type="button"
                onClick={() => setModalLocalidadOpen(true)}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-heading font-semibold px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#fe5000]" /> Quiero solicitar mi localidad
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[400px] aspect-square flex items-center justify-center">
              <img 
                src="/mapa_bsas.png" 
                alt="Mapa de Cobertura Provincia de Buenos Aires" 
                className="w-full h-full object-contain relative z-10 drop-shadow-md" 
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. FINANCIACIÓN: EL PROCESO EN 6 PASOS CLAROS */}
      <section id="como-funciona" className="py-24 lg:py-28 max-w-7xl mx-auto px-6 border-b border-zinc-800/80">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/20 text-xs font-heading font-semibold uppercase tracking-wider">
            <CreditCard className="w-3.5 h-3.5" /> Financiación Directa a Sola Firma
          </span>
          <h2 className="text-3xl lg:text-[40px] font-heading font-bold text-white leading-tight">
            Necesitás algo para tu hogar. Nosotros te ayudamos a conseguirlo.
          </h2>
          <p className="text-zinc-400 text-base lg:text-[17px] font-sans leading-[1.6]">
            Un proceso simple y transparente pensado para que accedas a lo que te hace falta sin vueltas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-3">
            <div className="w-10 h-10 bg-[#fe5000]/10 rounded-lg flex items-center justify-center text-[#fe5000] font-heading font-bold text-base border border-[#fe5000]/20">
              1
            </div>
            <h3 className="text-lg font-heading font-bold text-white">1. Contanos qué necesitás</h3>
            <p className="text-zinc-400 text-xs font-sans leading-relaxed">
              Por WhatsApp, nuestra web o a través del <strong className="text-white font-medium">vendedor afiliado</strong> de tu localidad.
            </p>
          </div>

          <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-3">
            <div className="w-10 h-10 bg-[#fe5000]/10 rounded-lg flex items-center justify-center text-[#fe5000] font-heading font-bold text-base border border-[#fe5000]/20">
              2
            </div>
            <h3 className="text-lg font-heading font-bold text-white">2. Te mostramos alternativas</h3>
            <p className="text-zinc-400 text-xs font-sans leading-relaxed">
              Buscamos opciones y te enviamos un presupuesto claro por WhatsApp.
            </p>
          </div>

          <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-3">
            <div className="w-10 h-10 bg-[#fe5000]/10 rounded-lg flex items-center justify-center text-[#fe5000] font-heading font-bold text-base border border-[#fe5000]/20">
              3
            </div>
            <h3 className="text-lg font-heading font-bold text-white">3. Gestionamos la compra</h3>
            <p className="text-zinc-400 text-xs font-sans leading-relaxed">
              Una vez aceptada la propuesta y formalizado el mandato de compra, encargamos el producto en Buenos Aires.
            </p>
          </div>

          <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-3">
            <div className="w-10 h-10 bg-[#fe5000]/10 rounded-lg flex items-center justify-center text-[#fe5000] font-heading font-bold text-base border border-[#fe5000]/20">
              4
            </div>
            <h3 className="text-lg font-heading font-bold text-white">4. Lo recibimos y organizamos</h3>
            <p className="text-zinc-400 text-xs font-sans leading-relaxed">
              El producto llega a nuestro centro logístico en CABA (<strong className="text-white font-medium">Caracas 1101</strong>) y queda preparado para el próximo recorrido.
            </p>
          </div>

          <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-3">
            <div className="w-10 h-10 bg-[#fe5000]/10 rounded-lg flex items-center justify-center text-[#fe5000] font-heading font-bold text-base border border-[#fe5000]/20">
              5
            </div>
            <h3 className="text-lg font-heading font-bold text-white">5. Te lo llevamos</h3>
            <p className="text-zinc-400 text-xs font-sans leading-relaxed">
              Realizamos la entrega en tu domicilio con nuestro transporte propio.
            </p>
          </div>

          <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-3">
            <div className="w-10 h-10 bg-[#fe5000]/10 rounded-lg flex items-center justify-center text-[#fe5000] font-heading font-bold text-base border border-[#fe5000]/20">
              6
            </div>
            <h3 className="text-lg font-heading font-bold text-white">6. Lo pagás en cuotas</h3>
            <p className="text-zinc-400 text-xs font-sans leading-relaxed">
              Mantenemos una relación directa durante todo el plan (frecuentemente en 12 cuotas fijas).
            </p>
          </div>

        </div>
      </section>

      {/* 6. BLOQUE DE DIFERENCIALES DE CUENTA HOGAR */}
      <section className="py-24 lg:py-28 bg-[#16171d] border-b border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/20 text-xs font-heading font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" /> Valor Agregado
            </span>
            <h2 className="text-3xl lg:text-[40px] font-heading font-bold text-white leading-tight">
              Los diferenciales de Cuenta Hogar
            </h2>
            <p className="text-zinc-400 text-base lg:text-[17px] font-sans leading-[1.6]">
              Soluciones integrales de compra, financiación y transporte pensadas para tu comodidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2">
              <CreditCard className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Financiación propia</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">Crédito directo a sola firma sin trámites bancarios.</p>
            </div>

            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2">
              <ShoppingBag className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Compra gestionada</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">Buscamos opciones y gestionamos la compra por vos en CABA.</p>
            </div>

            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2">
              <Building2 className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Centro logístico en CABA</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">Recepción y acopio propio en Caracas 1101, CABA.</p>
            </div>

            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2">
              <Truck className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Transporte propio</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">Recorridos programados y control directo sobre la carga.</p>
            </div>

            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2">
              <MapPin className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Entrega en domicilio</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">Llevamos tus productos directo a la puerta de tu hogar.</p>
            </div>

            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2">
              <UserCheck className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Atención cercana</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">Contacto directo con el vendedor afiliado de tu localidad.</p>
            </div>

            <div className="bg-[#181920] p-6 rounded-xl border border-zinc-800 space-y-2 md:col-span-2">
              <Wrench className="w-5 h-5 text-[#fe5000]" />
              <h3 className="font-heading font-bold text-white text-base">Acompañamiento para gestionar service oficial</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Si tu equipo necesita service, te ayudamos a trasladarlo hacia el service oficial en Capital Federal. <span className="text-amber-300 font-medium block mt-1">Nota: El acompañamiento técnico consiste en ayudar a gestionar el traslado al service oficial y no reemplaza la garantía correspondiente del producto.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ENTREGAS RECIENTES Y TESTIMONIOS (SECCIÓN BLANCA HARMONIOSA) */}
      <section className="py-24 lg:py-28 bg-slate-50 border-b border-zinc-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/20 text-xs font-heading font-semibold uppercase tracking-wider mb-4">
              <CheckCircle2 className="w-3.5 h-3.5" /> Entregas Reales
            </span>
            <h2 className="text-3xl lg:text-[40px] font-heading font-bold text-zinc-900 leading-tight">
              Clientes Felices Recibiendo sus Equipos
            </h2>
            <p className="text-zinc-600 mt-3 text-base lg:text-[17px] font-sans leading-[1.6]">
              Entregamos puerta a puerta con financiación a sola firma y Envíos Low Cost en nuestras localidades de cobertura.
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto group/carousel">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-md">
              <div className="w-full h-full relative">
                <img
                  src={entregas[activeEntregaIdx].src}
                  alt={entregas[activeEntregaIdx].alt}
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-6 lg:p-8">
                  <h3 className="text-xl lg:text-2xl font-heading font-bold text-white mb-1.5 leading-snug">
                    {entregas[activeEntregaIdx].titulo}
                  </h3>
                  <p className="text-xs lg:text-sm text-[#fe5000] font-heading font-semibold">
                    {entregas[activeEntregaIdx].descripcion}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePrevEntrega}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black border border-zinc-800 text-white rounded-full p-2.5 transition-opacity z-20 flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleNextEntrega}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black border border-zinc-800 text-white rounded-full p-2.5 transition-opacity z-20 flex items-center justify-center"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center gap-2 mt-6">
              {entregas.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveEntregaIdx(idx)}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    idx === activeEntregaIdx ? 'bg-[#fe5000] w-6' : 'bg-zinc-300 w-2 hover:bg-zinc-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. CATALOG GRID: PLANES SUGERIDOS */}
      <section id="catalogo" className="max-w-7xl mx-auto px-6 py-24 lg:py-28">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fe5000]/10 border border-[#fe5000]/20 text-[#fe5000] text-xs font-heading font-semibold uppercase tracking-wider mb-3">
              <ShoppingBag className="w-3.5 h-3.5" /> Vidriera de Equipos
            </span>
            <h2 className="text-3xl lg:text-[40px] font-heading font-bold text-white leading-tight">Planes Sugeridos</h2>
            <p className="text-zinc-400 mt-2 text-base font-sans">Elegí el producto que querés comprar y financiar.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-[#121316] rounded-xl h-96 border border-zinc-800" />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-20 bg-[#121316] rounded-xl border border-dashed border-zinc-800">
            <p className="text-zinc-400 text-base font-sans">Próximamente estaremos subiendo nuevos planes sugeridos. ¡Volvé pronto!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productos.map(p => (
              <ProductCard key={p.id} p={p} formatPrice={formatPrice} />
            ))}
          </div>
        )}

        <div className="mt-12 bg-[#16171d] border border-zinc-800/80 p-6 rounded-xl text-center">
          <p className="text-xs text-zinc-400 font-sans leading-relaxed font-normal">
            "Imágenes ilustrativas. Los equipos exhibidos corresponden a Planes de Gestión sugeridos. Actuamos bajo mandato de compra y brindamos servicios de administración de crédito propio. Otorgamiento sujeto a análisis de riesgo (scoring crediticio) sin obligación de expresar causa."
          </p>
        </div>
      </section>

      {/* 9. FORMULARIO PRINCIPAL (INPUTS H-12 48PX + CLEAN FOCUS + SOURCE SANS 3) */}
      <section id="contacto" className="py-24 lg:py-28 bg-white border-t border-zinc-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-slate-50 border border-zinc-200 rounded-xl p-8 lg:p-10 shadow-sm">
            <div className="text-center mb-8 space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/20 text-xs font-heading font-semibold uppercase tracking-wider">
                <Send className="w-3.5 h-3.5" /> Solicitud de Opciones
              </span>
              <h2 className="text-3xl lg:text-[36px] font-heading font-bold text-zinc-900 leading-tight">
                Contanos qué necesitás y te ayudamos a conseguirlo
              </h2>
              <p className="text-zinc-600 text-base font-sans leading-[1.6]">
                Completá el formulario y te enviaremos por WhatsApp distintas alternativas de producto y financiación.
              </p>
            </div>

            <form onSubmit={handleQuickFormSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-heading font-bold text-zinc-800 mb-1.5">Nombre y Apellido</label>
                  <input 
                    required 
                    value={qfNombre} 
                    onChange={e=>setQfNombre(e.target.value)} 
                    type="text" 
                    placeholder="Tu nombre completo" 
                    className="w-full h-12 bg-white border border-zinc-300 px-4 rounded-xl text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000] font-sans text-base transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-zinc-800 mb-1.5">DNI</label>
                  <input 
                    required 
                    value={qfDni} 
                    onChange={e=>setQfDni(e.target.value)} 
                    type="number" 
                    placeholder="Sin puntos" 
                    className="w-full h-12 bg-white border border-zinc-300 px-4 rounded-xl text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000] font-sans text-base transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-zinc-800 mb-1.5">WhatsApp de contacto</label>
                  <input 
                    required 
                    value={qfWhatsapp} 
                    onChange={e=>setQfWhatsapp(e.target.value)} 
                    type="tel" 
                    placeholder="Código de área + número" 
                    className="w-full h-12 bg-white border border-zinc-300 px-4 rounded-xl text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000] font-sans text-base transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading font-bold text-zinc-800 mb-1.5">Localidad</label>
                  <input 
                    required 
                    value={qfLocalidad} 
                    onChange={e=>setQfLocalidad(e.target.value)} 
                    type="text" 
                    placeholder="Ej: Lincoln, Chivilcoy, etc." 
                    className="w-full h-12 bg-white border border-zinc-300 px-4 rounded-xl text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000] font-sans text-base transition-colors" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-heading font-bold text-zinc-800 mb-1.5">¿Qué vendedor afiliado o cliente te recomendó? <span className="text-zinc-500 font-normal">(Opcional)</span></label>
                  <input 
                    value={qfReferente} 
                    onChange={e=>setQfReferente(e.target.value)} 
                    type="text" 
                    placeholder="Nombre del vendedor afiliado de tu localidad" 
                    className="w-full h-12 bg-white border border-zinc-300 px-4 rounded-xl text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000] font-sans text-base transition-colors" 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-heading font-bold text-zinc-800 mb-1.5">¿Qué producto o equipo estás necesitando?</label>
                  <textarea 
                    required 
                    value={qfNecesidad} 
                    onChange={e=>setQfNecesidad(e.target.value)} 
                    placeholder="Ej: Smart TV 50 pulgadas, Heladera No Frost, Celular, lavarropas..." 
                    rows={4} 
                    className="w-full bg-white border border-zinc-300 p-4 rounded-xl text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#fe5000] focus:ring-1 focus:ring-[#fe5000] font-sans text-base transition-colors resize-none" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={qfSubmitting}
                className="w-full btn-primary uppercase tracking-wider text-sm mt-2 disabled:opacity-75"
              >
                <Send className="w-4 h-4" /> {qfSubmitting ? "Enviando solicitud..." : "Recibir opciones por WhatsApp"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* MODAL SOLICITAR NUEVA LOCALIDAD */}
      {modalLocalidadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#181920] border border-zinc-800 w-full max-w-md rounded-xl p-6 space-y-5 shadow-xl relative">
            <button
              onClick={() => setModalLocalidadOpen(false)}
              type="button"
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1.5 rounded-lg bg-zinc-900 border border-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fe5000]/10 text-[#fe5000] text-xs font-heading font-semibold uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" /> Solicitud de Cobertura
              </span>
              <h3 className="text-xl font-heading font-bold text-white">Solicitar mi localidad</h3>
              <p className="text-xs text-zinc-400 font-sans">
                Dejanos tus datos. Apenas ampliemos nuestras rutas a tu ciudad te notificaremos por WhatsApp.
              </p>
            </div>

            <form onSubmit={handleSolicitarLocalidad} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-bold text-zinc-300 mb-1">Nombre y Apellido</label>
                <input
                  required
                  value={locNombre}
                  onChange={(e) => setLocNombre(e.target.value)}
                  type="text"
                  placeholder="Tu nombre completo"
                  className="w-full h-12 bg-zinc-950 border border-zinc-800 px-4 rounded-xl text-white text-sm font-sans outline-none focus:border-[#fe5000]"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-zinc-300 mb-1">Localidad solicitada</label>
                <input
                  required
                  value={locCiudad}
                  onChange={(e) => setLocCiudad(e.target.value)}
                  type="text"
                  placeholder="Ej: Junín, Bragado, Mercedes, etc."
                  className="w-full h-12 bg-zinc-950 border border-zinc-800 px-4 rounded-xl text-white text-sm font-sans outline-none focus:border-[#fe5000]"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-zinc-300 mb-1">WhatsApp / Teléfono</label>
                <input
                  required
                  value={locTel}
                  onChange={(e) => setLocTel(e.target.value)}
                  type="tel"
                  placeholder="Código de área + número"
                  className="w-full h-12 bg-zinc-950 border border-zinc-800 px-4 rounded-xl text-white text-sm font-sans outline-none focus:border-[#fe5000]"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-zinc-300 mb-1">¿Qué servicio te interesa?</label>
                <select
                  value={locInteres}
                  onChange={(e) => setLocInteres(e.target.value)}
                  className="w-full h-12 bg-zinc-950 border border-zinc-800 px-4 rounded-xl text-white text-sm font-sans outline-none focus:border-[#fe5000]"
                >
                  <option value="Ambos (Financiación y Envíos)">Ambos (Financiación y Envíos Low Cost)</option>
                  <option value="Compra y Financiación">Compra y Financiación en cuotas</option>
                  <option value="Envíos Low Cost">Envíos Low Cost desde CABA</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={locSubmitting}
                className="w-full btn-primary text-xs uppercase tracking-wider"
              >
                {locSubmitting ? "Enviando..." : "Enviar solicitud de localidad"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SECCIÓN SEO FOOTER */}
      <section className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-800/80">
        <div className="bg-[#16171d] border border-zinc-800 rounded-xl p-8 space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl font-heading font-bold text-white tracking-tight">
              Soluciones Integrales: <span className="text-[#fe5000]">Envíos Low Cost desde CABA</span> y Financiación Propia
            </h2>
            <p className="text-zinc-400 text-xs font-sans leading-relaxed">
              Cuenta Hogar es tu puente directo entre Buenos Aires y las localidades de cobertura (Lincoln, Zavalía, Los Toldos, Chivilcoy y O'Brien).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-zinc-300 font-sans">
            <div className="bg-[#1c1e26] p-4 rounded-lg border border-zinc-800/80 space-y-1.5">
              <h3 className="font-heading font-bold text-[#fe5000] text-xs">Envíos Low Cost</h3>
              <p className="leading-relaxed">
                Recepción en CABA (Caracas 1101), acopio seguro, consolidación de bultos y entrega en domicilio en localidades atendidas.
              </p>
            </div>

            <div className="bg-[#1c1e26] p-4 rounded-lg border border-zinc-800/80 space-y-1.5">
              <h3 className="font-heading font-bold text-[#fe5000] text-xs">Emprendedores y Comercios</h3>
              <p className="leading-relaxed">
                Consolidación sin cargo para compras de distintos proveedores en Capital Federal. Pagá únicamente por los bultos trasladados.
              </p>
            </div>

            <div className="bg-[#1c1e26] p-4 rounded-lg border border-zinc-800/80 space-y-1.5">
              <h3 className="font-heading font-bold text-[#fe5000] text-xs">Transporte Propio</h3>
              <p className="leading-relaxed">
                Recorridos programados con transporte propio. Control directo sobre la carga y previsibilidad en los tiempos de entrega.
              </p>
            </div>

            <div className="bg-[#1c1e26] p-4 rounded-lg border border-zinc-800/80 space-y-1.5">
              <h3 className="font-heading font-bold text-[#fe5000] text-xs">Financiación a Sola Firma</h3>
              <p className="leading-relaxed">
                Planes de cuotas directos sin bancos a través del vendedor afiliado de tu localidad. Acompañamiento para gestionar el service oficial.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function ProductCard({ p, formatPrice }: { p: Producto; formatPrice: (price: number) => string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const images = p.imagenUrls && p.imagenUrls.length > 0 ? p.imagenUrls : (p.imagenUrl ? [p.imagenUrl] : []);

  const planes = (() => {
    const cProd = Number(p.costoProducto || p.precioContado) || 0;
    const factores = p.factoresPlanes;
    let activos = p.planesActivos;

    if (!activos || Object.keys(activos).length === 0) {
      activos = {
        12: Boolean(p.cuota12 && p.cuota12 > 0),
        8: Boolean(p.cuota8 && p.cuota8 > 0)
      };
    }

    return calcularTablaTodosLosPlanes(cProd, factores, activos).map(plan => {
      let cuota = plan.cuotaMensual;
      if (plan.cuotas === 12 && p.cuota12 && p.cuota12 > 0 && (!factores || !factores[12])) {
        cuota = p.cuota12;
      } else if (plan.cuotas === 8 && p.cuota8 && p.cuota8 > 0 && (!factores || !factores[8])) {
        cuota = p.cuota8;
      }
      return { ...plan, cuotaMensual: cuota };
    }).filter(plan => plan.activo && plan.cuotaMensual > 0);
  })();

  const [cuotaElegida, setCuotaElegida] = useState<number>(() => {
    return planes.some(pl => pl.cuotas === 12) ? 12 : (planes[planes.length - 1]?.cuotas || 12);
  });

  const planActual = planes.find(pl => pl.cuotas === cuotaElegida) || planes[planes.length - 1];
  const cuotaMensual = planActual ? planActual.cuotaMensual : (p.cuota12 || 0);

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIdx((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="bg-[#121316] hover:bg-[#181920] border border-zinc-800 hover:border-zinc-700 rounded-xl overflow-hidden transition-all duration-200 flex flex-col shadow-sm relative">
      
      <div className="relative aspect-square bg-white p-5 flex flex-col items-center justify-center overflow-hidden border-b border-zinc-800 group/img">
        {images.length > 0 ? (
          <img 
            src={images[activeIdx]} 
            alt={p.nombre} 
            className="w-full h-full object-contain" 
          />
        ) : (
          <span className="text-zinc-400 text-xs italic font-sans">Imagen de equipo sugerido</span>
        )}
        
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 transition-opacity opacity-0 group-hover/img:opacity-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleNext}
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 transition-opacity opacity-0 group-hover/img:opacity-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      
      <div className="p-5 flex flex-col flex-1">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#fe5000]/10 text-[#fe5000] border border-[#fe5000]/20 text-[10px] font-heading font-bold uppercase tracking-wider mb-2 w-fit">
          PLAN DE GESTIÓN
        </span>
        
        <h3 className="text-sm font-heading font-bold text-white line-clamp-2 leading-snug mb-3">
          {p.nombre}
        </h3>

        {planes.length > 0 && (
          <div className="mb-4">
            <label className="block text-[10px] font-heading font-bold text-zinc-400 uppercase mb-1">
              Planes de Cuotas:
            </label>
            <div className="flex flex-wrap gap-1">
              {planes.map((pl) => (
                <button
                  key={pl.cuotas}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCuotaElegida(pl.cuotas);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-heading font-bold transition-all ${
                    cuotaElegida === pl.cuotas
                      ? "bg-[#fe5000] text-white"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
                  }`}
                >
                  {pl.cuotas} {pl.cuotas === 1 ? "Cuota" : "Cuotas"}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-auto flex flex-col justify-end pt-2 border-t border-zinc-800/80">
          <p className="text-xs text-zinc-400 font-sans">
            Llevalo en {cuotaElegida} {cuotaElegida === 1 ? "cuota" : "cuotas"} desde
          </p>
          <p className="text-xl font-heading font-bold text-[#fe5000] mb-3">
            {formatPrice(cuotaMensual)} <span className="text-xs text-zinc-400 font-normal">/ mes</span>
          </p>

          <Link 
            href={`/solicitar?id=${p.id}&cuotas=${cuotaElegida}`} 
            className="w-full bg-[#fe5000] hover:bg-[#e04600] text-white font-heading font-semibold text-[11px] tracking-wider h-10 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all uppercase"
          >
            <span>SOLICITAR ESTE PLAN</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
