"use client";

import Header from "@/components/Header";
import PublicConsultationForm from "@/components/PublicConsultationForm";
import Footer from "@/components/Footer";
import InstagramSection from "@/components/InstagramSection";


import { useEffect, useState, useRef } from "react";
import { createPublicSolicitudSender } from "@/lib/publicSolicitudClient";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { fetchPublicCatalog } from "@/lib/publicCatalogClient";
import type { CatalogReferencePublic } from "@/lib/catalogReference";
import Image from "next/image";

export default function HomeTechCatalog() {
  const [homeCatalogVisible, setHomeCatalogVisible] = useState(false);
  const [productos, setProductos] = useState<CatalogReferencePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  // Quick Form State
  const [qfNombre, setQfNombre] = useState("");
  const [qfWhatsapp, setQfWhatsapp] = useState("");
  const [qfLocalidad, setQfLocalidad] = useState("");
  const [qfNecesidad, setQfNecesidad] = useState("");
  const [qfSubmitting, setQfSubmitting] = useState(false);

  const [qfError,setQfError]=useState("");
  const qfSender=useRef<ReturnType<typeof createPublicSolicitudSender>|null>(null);

  // Modal Solicitud de Nueva Localidad
  const localityDialog = useRef<HTMLDialogElement>(null);
  const [locNombre, setLocNombre] = useState("");
  const [locCiudad, setLocCiudad] = useState("");
  const [locTel, setLocTel] = useState("");
  const [locInteres, setLocInteres] = useState("Ambos (Financiación y Envíos)");
  const [locSubmitting, setLocSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/catalogo-visibilidad', {cache:'no-store',signal:controller.signal}).then(async response => {
      if (!response.ok) throw Error('No se pudo consultar el catálogo.');
      const body = await response.json(); if (typeof body.homeVisible !== 'boolean') throw Error('Respuesta de catálogo inválida.');
      if (!body.homeVisible || controller.signal.aborted) return;
      setHomeCatalogVisible(true);
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
      qfSender.current ??= createPublicSolicitudSender('quick');
      await qfSender.current({tipo:'consulta_v2',nombreCompleto:qfNombre,
        whatsapp:qfWhatsapp,localidad:qfLocalidad,productoNombre:qfNecesidad});
      const mensaje=`Hola, quiero consultar opciones para gestionar una compra. Soy ${qfNombre} de ${qfLocalidad}. Necesito: ${qfNecesidad}. Mi WhatsApp es ${qfWhatsapp}.`;
      window.location.href=`https://wa.me/5491125659686?text=${encodeURIComponent(mensaje)}`;
    } catch(error) {
      setQfError(error instanceof Error?error.message:'No pudimos confirmar el registro. Reintentá.');
    } finally {setQfSubmitting(false);}
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
      localityDialog.current?.close();
      window.open(wame, "_blank");
      setLocSubmitting(false);
    }
  };

  return (
    <div className="public-site">
      <Header />
      <main id="contenido">
        <section className="public-hero public-warm">
          <div className="public-container public-split">
            <div className="public-stack">
              <p className="public-kicker">Servicio de compra</p>
              <h1>Lo que necesitás, con un plan de cuotas y todo resuelto.</h1>
              <p className="public-copy">Contanos qué estás buscando. Buscamos alternativas, gestionamos la compra mediante mandato y coordinamos la recepción, el traslado y la entrega.</p>
              <div className="public-actions">
                <a className="public-button" href="https://wa.me/5491125659686?text=Hola%2C%20estuve%20viendo%20la%20web%20de%20Cuenta%20Hogar%20y%20quiero%20recibir%20una%20propuesta.%0A%0ANecesito%20comprar%20un%20producto%20y%20quisiera%20conocer%20las%20alternativas%2C%20el%20plan%20de%20cuotas%20y%20la%20entrega%20en%20mi%20localidad.%0A%0A%F0%9F%93%8D%20Mi%20localidad%20es%3A%0A%F0%9F%9B%92%20Producto%20que%20busco%3A%0A%0A%C2%BFMe%20pueden%20orientar%3F" target="_blank" rel="noopener noreferrer">Quiero recibir una propuesta</a>
                <a className="public-link" href="#modelo">Conocé cómo funciona</a>
              </div>
              <p className="public-note">Consulta sin compromiso por WhatsApp.</p>
            </div>
            <div className="public-stack">
              <Image className="public-photo" src="/entrega-ford-transit.jpg" alt="Vehículo de Cuenta Hogar en una entrega a domicilio" width={1024} height={576} sizes="(max-width: 767px) 100vw, 50vw" preload />
              <div className="public-benefits">
                <p className="font-semibold">Plan de cuotas <span aria-hidden="true"> · </span> Buscamos alternativas <span aria-hidden="true"> · </span> Entrega en tu domicilio</p>
                <p className="public-note">Entrega dentro de las localidades de cobertura. Desde el 25 de noviembre ampliamos la capacidad para productos grandes y sumamos Envíos Low Cost.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="public-section">
          <div className="public-container">
            <h2>¿Qué necesitás resolver hoy?</h2>
            <div className="public-pair">
              <article className="public-stack">
                <h3>Necesitás ayuda para gestionar una compra</h3>
                <p className="public-copy">Si buscás más alternativas en Capital, te ayudamos a encontrarlas y te presentamos un plan de cuotas antes de que decidas. Si avanzás, gestionamos la compra por mandato y coordinamos la entrega.</p>
                <a className="public-link" href="#contacto">Pedir una propuesta</a>
              </article>
              <article className="public-stack">
                <h3>Ya compraste y necesitás el traslado</h3>
                <p className="public-copy">Recibimos tu compra en CABA y coordinamos el traslado a tu domicilio dentro de la cobertura. Envíos Low Cost estará disponible desde el 25 de noviembre de 2026.</p>
                <Link className="public-link" href="/envios">Conocer Envíos Low Cost</Link>
              </article>
            </div>
          </div>
        </section>

        <section className="public-section public-warm" id="modelo">
          <div className="public-container">
            <h2>Cómo funciona el servicio de compra</h2>
            <ol className="public-rows" role="list">
              {[
                ["Contanos qué necesitás", "Podés indicarnos el tipo de producto o compartir un modelo, enlace o presupuesto que ya hayas visto."],
                ["Revisá la propuesta", "Buscamos alternativas y te presentamos las condiciones y el plan de cuotas para que puedas decidir."],
                ["Formalizamos la gestión", "Si decidís avanzar, gestionamos la adquisición mediante mandato."],
                ["Coordinamos la entrega", "Organizamos la recepción y el traslado hasta tu domicilio dentro de las localidades de cobertura."],
              ].map(([title, description], index) => (
                <li className="public-row" key={title}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3><p>{description}</p>
                </li>
              ))}
            </ol>
            <Link className="public-link" href="/servicio-de-compra">Ver el servicio de compra</Link>
          </div>
        </section>

        {(homeCatalogVisible || catalogError) && (
          <section id="catalogo" className="public-section">
            <div className="public-container public-stack">
              <h2>Productos de referencia</h2>
              <p className="public-copy">Explorá opciones orientativas o consultanos por otro producto.</p>
              {catalogError ? <p role="alert">{catalogError}</p> : loading ? (
                <p role="status">Cargando catálogo…</p>
              ) : productos.length ? (
                <div className="public-grid">
                  {productos.slice(0, 6).map(prod => {
                    const plan12 = prod.planesPublicados.find(plan => plan.cuotas === 12);
                    return (
                      <article key={prod.referenciaId} data-public-reference={prod.referenciaId} className="public-product">
                        <Image src={prod.imagenUrls[0] || "/logo-cuenta-hogar-oficial.png"} alt={prod.nombre}
                          width={320} height={190} unoptimized
                          onError={event => {
                            if (!event.currentTarget.src.endsWith("/logo-cuenta-hogar-oficial.png")) {
                              event.currentTarget.src = "/logo-cuenta-hogar-oficial.png";
                            }
                          }} />
                        <h3>{prod.nombre}</h3>
                        {prod.descripcion && (
                          <details className="public-details">
                            <summary>Características</summary>
                            <p>{prod.descripcion}</p>
                          </details>
                        )}
                        <p className="public-note">Entrega en CABA e interior</p>
                        {plan12 ? <p>12 cuotas estimadas de <strong>{formatPrice(plan12.cuotaEstimada)}</strong></p>
                          : <p>Consultá los planes disponibles</p>}
                        <Link className="public-button public-button-dark"
                          href={`/solicitar?id=${encodeURIComponent(prod.referenciaId)}${plan12 ? "&cuotas=12" : ""}`}>
                          Solicitar gestión de compra
                        </Link>
                      </article>
                    );
                  })}
                </div>
              ) : <h3 role="status">Catálogo en actualización</h3>}
              <p className="public-note">* Los importes son orientativos y están sujetos a cotización y condiciones contractuales. El plan contempla el reintegro del capital utilizado para la compra y los servicios asociados que correspondan.</p>
              <a className="public-link justify-self-start" href="#contacto">Consultar por otro producto</a>
            </div>
          </section>
        )}

        <section className="public-section public-warm" id="contacto">
          <div className="public-container public-split">
            <div className="public-stack">
              <h2>Contanos qué estás buscando.</h2>
              <p className="public-copy">Te orientamos sin compromiso. Podés enviarnos un enlace o describir qué necesitás.</p>
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

        <section className="public-section" id="cobertura">
          <div className="public-container public-split">
            <div className="public-stack">
              <h2>Entrega en tu domicilio</h2>
              <p className="public-copy">Trasladamos las compras desde CABA en recorridos programados. Coordinamos la recepción con vos y hacemos la entrega estándar en la puerta de tu casa dentro de nuestra cobertura.</p>
            </div>
            <div className="public-stack">
              <h3>Localidades de cobertura</h3>
              <ul className="public-location-list" role="list">
                {["Chivilcoy", "Lincoln", "Los Toldos", "O’Brien", "Zavalía"].map(location => <li key={location}>{location}</li>)}
              </ul>
              <p className="public-note">Si tu localidad queda fuera del recorrido, consultanos por tu zona.</p>
              <a className="public-link" href="https://wa.me/5491125659686?text=Hola%2C%20quiero%20consultar%20si%20mi%20localidad%20est%C3%A1%20en%20la%20cobertura%20de%20entrega%20a%20domicilio%20de%20Cuenta%20Hogar.%0A%0AMi%20localidad%20y%20provincia%20son%3A" target="_blank" rel="noopener noreferrer">Consultar cobertura por WhatsApp</a>
              <button type="button" className="public-link justify-self-start cursor-pointer" onClick={() => localityDialog.current?.showModal()}>Solicitar que sumemos tu localidad</button>
            </div>
          </div>
        </section>

        <section className="public-section public-warm" id="envios-low-cost">
          <div className="public-container public-split">
            <div className="public-stack">
              <h2>¿Las compras son para tu comercio?</h2>
              <p className="public-copy">Conocé Cuenta Negocio, nuestra propuesta para acompañar las compras y la logística de comercios del interior.</p>
            </div>
            <a className="public-button public-button-dark justify-self-start self-center" href="https://www.cuentanegocio.com.ar/">Conocer Cuenta Negocio</a>
          </div>
        </section>

        <dialog ref={localityDialog} className="public-dialog" aria-labelledby="locality-title">
          <div className="public-stack">
            <div className="flex items-start justify-between gap-3">
              <h2 id="locality-title">Sumá tu localidad</h2>
              <button type="button" className="public-link cursor-pointer" onClick={() => localityDialog.current?.close()}>Cerrar</button>
            </div>
            <p className="public-note">Sumamos localidades según el volumen de solicitudes recibidas.</p>
            <form className="public-form" onSubmit={handleSolicitarLocalidad}>
              <label>Nombre<input required value={locNombre} onChange={event => setLocNombre(event.target.value)} /></label>
              <label>Ciudad o localidad<input required value={locCiudad} onChange={event => setLocCiudad(event.target.value)} /></label>
              <label>Teléfono o WhatsApp<input type="tel" required value={locTel} onChange={event => setLocTel(event.target.value)} /></label>
              <label>¿Qué servicio te interesa?
                <select value={locInteres} onChange={event => setLocInteres(event.target.value)}>
                  <option>Ambos (Financiación y Envíos)</option>
                  <option>Solo Financiación en Cuotas</option>
                  <option>Solo Envíos Low Cost desde CABA</option>
                </select>
              </label>
              <button className="public-button" disabled={locSubmitting}>{locSubmitting ? "Enviando…" : "Enviar solicitud de localidad"}</button>
            </form>
          </div>
        </dialog>
        <InstagramSection />
      </main>
      <Footer />
    </div>
  );
}
