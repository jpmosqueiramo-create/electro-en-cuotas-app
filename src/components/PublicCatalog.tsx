"use client";

import { useEffect, useState, useRef } from "react";
import { createPublicSolicitudSender } from "@/lib/publicSolicitudClient";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { fetchPublicCatalog } from "@/lib/publicCatalogClient";
import type { CatalogReferencePublic } from "@/lib/catalogReference";
import Header from "@/components/Header";
import PublicConsultationForm from "@/components/PublicConsultationForm";
import Footer from "@/components/Footer";
import Image from "next/image";
import InstagramSection from "@/components/InstagramSection";
import {
  Search,
  Filter,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Truck,
  MapPin,
  ShoppingBag,
  CreditCard,
  X,
} from "lucide-react";



function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.419c-1.776 0-3.517-.476-5.044-1.377l-.362-.215-3.744.982.999-3.648-.236-.375c-.991-1.574-1.513-3.612-1.513-5.696 0-5.836 4.75-10.587 10.587-10.587 2.828 0 5.486 1.1 7.485 3.101 1.999 2 3.098 4.658 3.097 7.487 0 5.837-4.75 10.588-10.587 10.588m0-20.709c-6.726 0-12.2 5.474-12.2 12.2 0 2.147.56 4.246 1.624 6.091l-1.724 6.295 6.442-1.69c1.782.971 3.792 1.485 5.858 1.485 6.726 0 12.2-5.474 12.2-12.2 0-3.26-1.27-6.324-3.578-8.631-2.308-2.307-5.37-3.576-8.622-3.576" />
    </svg>
  );
}

export default function PublicCatalog() {
  const [productos, setProductos] = useState<CatalogReferencePublic[]>([]);
  const [galleryImages, setGalleryImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogVisible, setCatalogVisible] = useState(false);

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuotas, setSelectedCuotas] = useState<number | "all">("all");

  // Quick Form State (#contacto)
  const [qfNombre, setQfNombre] = useState("");
  const [qfWhatsapp, setQfWhatsapp] = useState("");
  const [qfLocalidad, setQfLocalidad] = useState("");
  const [qfNecesidad, setQfNecesidad] = useState("");
  const [qfSubmitting, setQfSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [qfError,setQfError]=useState("");
  const qfSender=useRef<ReturnType<typeof createPublicSolicitudSender>|null>(null);

  // Modal Solicitud de Nueva Localidad
  const [modalLocalidadOpen, setModalLocalidadOpen] = useState(false);
  const [locNombre, setLocNombre] = useState("");
  const [locCiudad, setLocCiudad] = useState("");
  const [locTel, setLocTel] = useState("");
  const locInteres = "Servicio de Compra";
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
    const controller = new AbortController();
    fetch('/api/catalogo-visibilidad', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error('No se pudo consultar el catálogo.');
      const body = await response.json();
      if (typeof body.homeVisible !== 'boolean') throw Error('Respuesta de catálogo inválida.');
      if (!body.homeVisible || controller.signal.aborted) return;
      setCatalogVisible(true);
      const items = await fetchPublicCatalog(controller.signal);
      if (!controller.signal.aborted) setProductos(items);
    }).catch(error => {
      if (!controller.signal.aborted) setCatalogError(error instanceof Error ? error.message : "No pudimos cargar las referencias.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);
  };

  const handleQuickFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qfSubmitting) return;
    setQfSubmitting(true);

    setQfError("");
    try {
      qfSender.current ??= createPublicSolicitudSender('service-quick');
      await qfSender.current({tipo:'consulta_v2',nombreCompleto:qfNombre,
        whatsapp:qfWhatsapp,localidad:qfLocalidad,productoNombre:qfNecesidad});
      const mensaje=`Hola, quiero consultar por el Servicio de Compra de Cuenta Hogar. Soy ${qfNombre} de ${qfLocalidad}. Necesito: ${qfNecesidad}. Mi WhatsApp es ${qfWhatsapp}.`;
      window.location.href=`https://wa.me/5491125659686?text=${encodeURIComponent(mensaje)}`;
    } catch(error){setQfError(error instanceof Error?error.message:'No pudimos confirmar el registro. Reintentá.');}
    finally{setQfSubmitting(false);}
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

    return p.planesPublicados.some(plan => plan.cuotas === selectedCuotas);
  });

  return (
    <div className="public-site">

      <Header />
      <main id="contenido">

      {/* 1. HERO PRINCIPAL - SERVICIO DE COMPRA */}
      <section className="public-hero public-warm">
          <div className="public-container public-split">
            <div className="public-stack">
              <p className="public-kicker">Servicio de compra</p>
              <h1>Gestionamos tu compra en Capital desde tu localidad.</h1>
              <p className="public-copy">Contanos qué estás buscando. Buscamos alternativas y te presentamos una propuesta con las condiciones de la operación. Si decidís avanzar, gestionamos la compra por mandato y coordinamos la recepción y la entrega.</p>
              <div className="public-actions">
                <a className="public-button" href="#contacto">Quiero recibir una propuesta</a>
                <a className="public-link" href="#como-funciona">Conocé cómo funciona</a>
              </div>
              <p className="public-note">Desde el 25 de noviembre ampliamos la capacidad para trasladar heladeras, sommiers, muebles y otros productos de gran volumen.</p>
            </div>
            <Image className="public-photo" src="/centro-operaciones-cuenta-hogar.jpg" alt="Centro de operaciones de Cuenta Hogar" width={1024} height={768} sizes="(max-width: 767px) 100vw, 50vw" preload />
          </div>
        </section>

      {/* 2. CÓMO FUNCIONA EL SERVICIO DE COMPRA EN 6 PASOS (#COMO-FUNCIONA) */}
      <section id="como-funciona" className="public-section scroll-mt-20">
        <div className="public-container space-y-12">

          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] font-bold px-3.5 py-1.5 rounded-md">
              PROCESO TRANSPARENTE
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-[var(--public-ink)]">
              Cómo funciona el Servicio de Compra
            </h2>
            <p className="text-[var(--public-muted)] text-sm sm:text-base font-sans">
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
                titulo: "Te presentamos la propuesta",
                desc: "Te enviamos las condiciones de la gestión y el importe de las cuotas fijas de esa operación."
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
              <div key={idx} className="bg-[var(--public-warm)] border border-[var(--public-line)] p-6 rounded-md space-y-3 hover:border-[var(--public-line)]">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-md bg-transparent border border-[var(--public-line)] text-[var(--public-ink)] font-black text-sm flex items-center justify-center">
                    {paso.num}
                  </span>
                  <span className="text-[.875rem] text-[var(--public-muted)] font-bold">Etapa 0{idx+1}</span>
                </div>
                <h3 className="text-base font-bold text-[var(--public-ink)] leading-snug">{paso.titulo}</h3>
                <p className="text-[.875rem] text-[var(--public-muted)] font-sans leading-relaxed">{paso.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 3. BENEFICIOS CONCRETOS DEL SERVICIO DE COMPRA */}
      <section className="public-section">
        <div className="public-container space-y-10">

          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-block bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] font-bold px-3.5 py-1.5 rounded-md">
              TODO RESUELTO EN UNA SOLA GESTIÓN
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[var(--public-ink)] tracking-tight">
              De la búsqueda a la entrega, en una sola gestión.
            </h2>
            <p className="text-sm sm:text-base text-[var(--public-ink)] font-sans leading-relaxed">
              Desde la búsqueda hasta la entrega, coordinamos cada etapa para que puedas resolver tu compra desde el interior sin viajar a Capital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">

            {/* TARJETA 01 */}
            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] hover:border-[var(--public-line)] p-6 rounded-md space-y-4 duration-200 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[.875rem] font-bold text-[var(--public-ink)] bg-[var(--public-warm)] border border-[var(--public-line)] px-2.5 py-1 rounded-md">
                    01 · MÁS OPCIONES SIN VIAJAR
                  </span>
                  <div className="w-9 h-9 bg-[var(--public-warm)] border border-[var(--public-line)] rounded-md flex items-center justify-center text-[var(--public-ink)]">
                    <Search className="w-4.5 h-4.5" />
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[var(--public-ink)] leading-snug">
                  Encontrá lo que necesitás en CABA
                </h3>

                <p className="text-[.875rem] sm:text-sm text-[var(--public-ink)] font-sans leading-relaxed pt-1 border-t border-[var(--public-line)]">
                  Buscamos alternativas según lo que necesitás y te presentamos una propuesta para que puedas evaluarla antes de avanzar.
                </p>
              </div>
            </div>

            {/* TARJETA 02 (PROTAGONISMO DESTACADO LIGERAMENTE MAYOR) */}
            <div className="border-2 border-[var(--public-line)] p-6 rounded-md space-y-4 duration-200 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[.875rem] font-bold text-[var(--public-ink)] bg-[var(--public-warm)] border border-[var(--public-line)] px-2.5 py-1 rounded-md">
                    02 · PROPUESTA DE COMPRA
                  </span>
                  <div className="w-9 h-9 bg-[var(--public-yellow)] text-[var(--public-black)] rounded-md flex items-center justify-center font-bold">
                    <CreditCard className="w-4.5 h-4.5" />
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-semibold text-[var(--public-ink)] leading-snug">
                  Sabés cómo queda antes de decidir
                </h3>

                <p className="text-[.875rem] sm:text-sm text-[var(--public-ink)] font-sans leading-relaxed pt-1 border-t border-[var(--public-line)]">
                  Te presentamos las condiciones y el plan de cuotas fijas de la operación antes de formalizar la gestión.
                </p>
              </div>
            </div>

            {/* TARJETA 03 */}
            <div className="bg-[var(--public-warm)] border border-[var(--public-line)] hover:border-[var(--public-line)] p-6 rounded-md space-y-4 duration-200 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[.875rem] font-bold text-[var(--public-ink)] bg-[var(--public-warm)] border border-[var(--public-line)] px-2.5 py-1 rounded-md">
                    03 · ENTREGA EN TU DOMICILIO
                  </span>
                  <div className="w-9 h-9 bg-[var(--public-warm)] border border-[var(--public-line)] rounded-md flex items-center justify-center text-[var(--public-ink)]">
                    <Truck className="w-4.5 h-4.5" />
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[var(--public-ink)] leading-snug">
                  Nos ocupamos de que llegue
                </h3>

                <p className="text-[.875rem] sm:text-sm text-[var(--public-ink)] font-sans leading-relaxed pt-1 border-t border-[var(--public-line)]">
                  Coordinamos la recepción, el traslado y la entrega en tu domicilio dentro de las localidades de cobertura.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. OPCIONES DE COMPRA / CATALOG GRID */}
      {catalogVisible && <section data-testid="service-public-catalog" className="public-section">
        <div className="public-container space-y-8">

          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] font-bold px-3.5 py-1.5 rounded-md">
              ALGUNAS OPCIONES QUE PODEMOS GESTIONAR
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-[var(--public-ink)]">
              Opciones de Compra Orientativas
            </h2>
            <p className="text-[var(--public-muted)] text-sm font-sans">
              Explorá algunos modelos frecuentes con planes de cuotas sugeridos. También podés solicitar cualquier otro equipo que no figure en la lista.
            </p>
          </div>

          {/* BUSCADOR Y FILTROS */}
          <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-4 sm:p-6 rounded-md space-y-4 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">

              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-[var(--public-muted)] absolute left-3.5 top-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por producto, marca o categoría..."
                  className="w-full bg-[var(--public-warm)] border border-[var(--public-line)] focus:border-[var(--public-line)] text-[var(--public-ink)] placeholder:text-[var(--public-muted)] text-[.875rem] rounded-md pl-10 pr-4 py-3 outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--public-ink)] shrink-0" />
                <select
                  value={selectedCuotas}
                  onChange={(e) => setSelectedCuotas(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="w-full bg-[var(--public-warm)] border border-[var(--public-line)] focus:border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] rounded-md p-3 outline-none font-medium cursor-pointer"
                >
                  <option value="all">Todos los planes</option>
                  {Array.from({ length: 18 }, (_, index) => index + 1).map(cuotas => <option key={cuotas} value={cuotas}>Ver plan {cuotas} cuotas</option>)}
                </select>
              </div>

            </div>
          </div>

          {/* LISTADO DE PRODUCTOS */}
          {catalogError ? <p role="alert" className="p-6 text-center">{catalogError}</p> : loading ? (
            <div className="py-16 text-center text-[var(--public-muted)] text-sm">
              Cargando opciones disponibles...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="py-16 bg-[var(--public-warm)] border border-[var(--public-line)] rounded-md text-center space-y-4 max-w-md mx-auto p-8">
              <ShoppingBag className="w-8 h-8 text-[var(--public-ink)] mx-auto" />
              <p className="text-sm text-[var(--public-ink)] font-bold">¿No encontrás lo que buscás?</p>
              <p className="text-[.875rem] text-[var(--public-muted)]">
                Podemos gestionar la compra de cualquier producto que necesites en Capital Federal.
              </p>
              <a href="#contacto" className="btn-primary text-[.875rem] inline-flex items-center gap-2 px-6 py-3 rounded-xl">
                Solicitar una compra personalizada
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {productosFiltrados.map((prod) => {
                const plan12 = prod.planesPublicados.find(p => p.cuotas === 12);

                return (
                  <div data-public-reference={prod.referenciaId} key={prod.referenciaId} className="bg-[var(--public-warm)] border border-[var(--public-line)] rounded-md overflow-hidden hover:border-[var(--public-line)] flex flex-col justify-between group">

                    <div>
                      <div className="relative aspect-4/3 bg-[var(--public-warm)] overflow-hidden flex items-center justify-center p-4">
                        <img
                          src={galleryImages[prod.referenciaId] || prod.imagenUrls[0] || "/logo-cuenta-hogar-oficial.png"}
                          alt={prod.nombre}
                          className="w-full h-full object-contain duration-500"
                          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/logo-cuenta-hogar-oficial.png"; }}
                        />
                      </div>

                      {prod.imagenUrls.length > 1 && <div className="flex flex-wrap gap-2 px-4 pt-3">{prod.imagenUrls.map((url, index) => <button type="button" key={index} aria-label={`Imagen ${index + 1} de ${prod.nombre}`} onClick={() => setGalleryImages(value => ({ ...value, [prod.referenciaId]: url }))} className="min-h-11 min-w-11 rounded border border-[var(--public-line)] p-1"><img src={url} alt="" className="h-9 w-9 object-contain" /></button>)}</div>}
                      <div className="p-6 space-y-4">
                        <h3 className="text-base font-bold text-[var(--public-ink)] leading-snug">
                          {prod.nombre}
                        </h3>

                        {prod.descripcion && (
                          <details className="public-details"><summary>Características</summary><p>{prod.descripcion}</p></details>
                        )}

                        <div className="bg-[var(--public-warm)] border border-[var(--public-line)] p-4 rounded-md space-y-1.5">
                          <span className="text-[.875rem] font-bold text-[var(--public-ink)] block">
                            Plan de cuotas orientativo
                          </span>
                          {plan12 ? (
                            <div className="flex flex-wrap items-baseline gap-x-2 justify-between">
                              <span className="text-[.875rem] font-bold text-[var(--public-ink)]">12 cuotas estimadas de</span>
                              <span className="text-base font-semibold text-[var(--public-ink)]">
                                {formatPrice(plan12.cuotaEstimada)}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[.875rem] font-bold text-[var(--public-ink)]">
                              Consultá los planes disponibles
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 pt-0">
                      <a
                        href={`/solicitar?id=${encodeURIComponent(prod.referenciaId)}${plan12 ? "&cuotas=12" : ""}`}

                        className="w-full inline-flex items-center justify-center gap-2 bg-[var(--public-yellow)] hover:bg-[#f2c300] text-[var(--public-black)] font-semibold text-[.875rem] py-3 rounded-md"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-[var(--public-ink)]" />
                        <span>Solicitar gestión de compra</span>
                      </a>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>}

      {/* 5. COBERTURA DE ENTREGAS */}
      <section className="public-section">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8">

          <div className="space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] font-bold px-3.5 py-1.5 rounded-md">
              ENTREGAS PROGRAMADAS
            </span>
            <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-[var(--public-ink)]">
              Cobertura en el Interior
            </h2>
            <p className="text-[var(--public-muted)] text-sm font-sans">
              Realizamos entregas directa en las siguientes localidades y zonas de influencia:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {["Lincoln", "Zavalía", "Los Toldos", "Chivilcoy", "O'Brien"].map((loc) => (
              <div key={loc} className="bg-[var(--public-warm)] border border-[var(--public-line)] p-4 rounded-md text-center space-y-1">
                <MapPin className="w-4 h-4 text-[var(--public-ink)] mx-auto" />
                <p className="font-bold text-[var(--public-ink)] text-sm">{loc}</p>
                <p className="text-[.875rem] text-[var(--public-muted)]">Entrega en domicilio</p>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setModalLocalidadOpen(true)}
              className="inline-flex items-center gap-2 text-[.875rem] font-bold text-[var(--public-ink)] hover:underline bg-[var(--public-warm)] border border-[var(--public-line)] px-4 py-2 rounded-md"
            >
              <span>¿Tu localidad todavía no está en nuestra cobertura? Consultanos →</span>
            </button>
          </div>

        </div>
      </section>

      {/* 6. CONFIANZA / CASOS REALES Y ENTREGAS */}
      <section className="public-section">
        <div className="public-container space-y-12">

          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-[var(--public-ink)]">
              Entregas Reales y Presencia Local
            </h2>
            <p className="text-[var(--public-muted)] text-sm font-sans">
              Fotografías reales de entregas realizadas por el equipo de Cuenta Hogar.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            <div className="lg:col-span-7 relative rounded-md overflow-hidden border border-[var(--public-line)] bg-[var(--public-warm)] group h-[380px]">
              <img
                src={entregas[activeEntregaIdx].src}
                alt={entregas[activeEntregaIdx].alt}
                className="w-full h-full object-cover duration-700"
              />
              <div className="absolute inset-0 flex items-end p-6">
                <div className="bg-[var(--public-warm)] backdrop-blur-md border border-[var(--public-line)] p-4 rounded-md text-[var(--public-ink)] w-full space-y-1">
                  <p className="font-bold text-sm text-[var(--public-ink)]">{entregas[activeEntregaIdx].titulo}</p>
                  <p className="text-[.875rem] text-[var(--public-muted)]">{entregas[activeEntregaIdx].descripcion}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4 text-left">
              <span className="text-[.875rem] font-bold text-[var(--public-ink)] block">
                COMPROMISO Y CERCANÍA
              </span>
              <h3 className="text-2xl font-bold text-[var(--public-ink)]">
                Atención directa de vecino a vecino
              </h3>
              <p className="text-[.875rem] sm:text-sm text-[var(--public-muted)] font-sans leading-relaxed">
                Acompañamos cada solicitud con la presencia de nuestros vendedores afiliados en tu localidad, brindando respaldo antes, durante y después de la entrega.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handlePrevEntrega}
                  aria-label="Anterior entrega"
                  className="w-10 h-10 rounded-md bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] hover:text-[var(--public-ink)] flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextEntrega}
                  aria-label="Siguiente entrega"
                  className="w-10 h-10 rounded-md bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] hover:text-[var(--public-ink)] flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-[.875rem] text-[var(--public-muted)]">
                  {activeEntregaIdx + 1} / {entregas.length}
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 7. FORMULARIO PRINCIPAL DE SOLICITUD DE COMPRA (#CONTACTO) */}
      <section id="contacto" className="public-section public-warm">
        <div className="public-container public-split">
          <div className="public-stack">
            <h2>Contanos qué estás buscando.</h2>
            <p className="public-copy">Te orientamos sin compromiso. Completá estos datos para consultar por WhatsApp sobre la compra que querés gestionar.</p>
          </div>
          <PublicConsultationForm
              name={{ value: qfNombre, onChange: setQfNombre }}
              phone={{ value: qfWhatsapp, onChange: setQfWhatsapp }}
              locality={{ value: qfLocalidad, onChange: setQfLocalidad }}
              product={{ value: qfNecesidad, onChange: setQfNecesidad }}
              submitting={qfSubmitting}
              error={qfError}
              onSubmit={handleQuickFormSubmit}
            />
        </div>
      </section>

            {/* 7. SECCIÓN PREGUNTAS FRECUENTES (SERVICIO DE COMPRA) */}
      <section id="preguntas-frecuentes" className="public-section scroll-mt-20">
        <div className="max-w-4xl mx-auto px-6 space-y-10">

          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="inline-block bg-transparent border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] font-bold px-3.5 py-1.5 rounded-md">
              PREGUNTAS FRECUENTES · SERVICIO DE COMPRA
            </span>
            <h2 className="text-3xl font-heading font-semibold text-[var(--public-ink)]">
              Respuestas claras antes de solicitar tu propuesta
            </h2>
            <p className="text-[var(--public-muted)] text-sm font-sans">
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
                    className="w-full p-5 text-left font-bold text-[var(--public-ink)] flex justify-between items-center gap-4 hover:bg-[var(--public-warm)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {faq.destacada && (
                        <span className="w-2 h-2 rounded-md bg-[var(--public-yellow)] shrink-0" title="Pregunta frecuente destacada" />
                      )}
                      <span className="text-sm sm:text-base leading-snug">{faq.q}</span>
                    </div>
                    <span className="text-[var(--public-ink)] shrink-0">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-[.875rem] sm:text-sm text-[var(--public-ink)] leading-relaxed border-t border-[var(--public-line)] pl-6 font-sans">
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
      <section className="public-section">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <span className="text-[.875rem] font-bold text-[var(--public-ink)] block">
            ¿YA COMPRASTE POR TU CUENTA EN CABA?
          </span>
          <h3 className="text-2xl font-bold text-[var(--public-ink)]">
            Conocé nuestro servicio de Envíos Low Cost
          </h3>
          <p className="text-sm text-[var(--public-muted)] max-w-xl mx-auto leading-relaxed">
            Si ya compraste tu mercadería directamente en locales o distribuidores de Buenos Aires y solo necesitás el punto de recepción y el traslado a tu localidad, descubrí Envíos Low Cost.
          </p>
          <div className="pt-2">
            <Link
              href="/envios"
              className="inline-flex items-center gap-2 bg-[var(--public-warm)] hover:bg-[var(--public-warm)] text-[var(--public-ink)] border border-[var(--public-line)] text-[.875rem] font-semibold px-6 py-3.5 rounded-md"
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
          <div className="bg-[var(--public-warm)] border border-[var(--public-line)] rounded-md max-w-md w-full p-6 space-y-6 relative">
            <button
              onClick={() => setModalLocalidadOpen(false)}
              className="absolute top-4 right-4 text-[var(--public-muted)] hover:text-[var(--public-ink)]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--public-ink)]">Consultar por Mi Localidad</h3>
              <p className="text-[.875rem] text-[var(--public-muted)]">
                Dejanos tus datos y la ciudad donde necesitás cobertura. Te avisaremos apenas incorporemos la ruta.
              </p>
            </div>

            <form onSubmit={handleSolicitarLocalidad} className="space-y-4">
              <div>
                <label className="block text-[.875rem] font-bold text-[var(--public-muted)] mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={locNombre}
                  onChange={e => setLocNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] rounded-md p-3 outline-none focus:border-[var(--public-line)]"
                />
              </div>

              <div>
                <label className="block text-[.875rem] font-bold text-[var(--public-muted)] mb-1">Localidad y Provincia *</label>
                <input
                  type="text"
                  required
                  value={locCiudad}
                  onChange={e => setLocCiudad(e.target.value)}
                  placeholder="Ej. Pehuajó, Buenos Aires"
                  className="w-full bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] rounded-md p-3 outline-none focus:border-[var(--public-line)]"
                />
              </div>

              <div>
                <label className="block text-[.875rem] font-bold text-[var(--public-muted)] mb-1">Teléfono / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  value={locTel}
                  onChange={e => setLocTel(e.target.value)}
                  placeholder="Ej. 2396 456789"
                  className="w-full bg-[var(--public-warm)] border border-[var(--public-line)] text-[var(--public-ink)] text-[.875rem] rounded-md p-3 outline-none focus:border-[var(--public-line)]"
                />
              </div>

              <button
                type="submit"
                disabled={locSubmitting}
                className="w-full bg-[var(--public-yellow)] hover:bg-[#f2c300] text-[var(--public-black)] font-bold text-[.875rem] py-3.5 rounded-md disabled:opacity-50"
              >
                {locSubmitting ? "Enviando..." : "Solicitar incorporación por WhatsApp"}
              </button>
            </form>

          </div>
        </div>
      )}

      <InstagramSection />
      </main>
      <Footer />

    </div>
  );
}
