import type { Metadata } from "next";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { EnviosFaq } from "@/components/EnviosFaq";
import styles from "./envios.module.css";

export const metadata: Metadata = {
  title: { absolute: "Envíos Low Cost | Cuenta Hogar" },
  description: "Recibimos tu compra en nuestro centro logístico de CABA (Caracas 1101) y la llevamos a tu domicilio en el interior con transporte propio y recorridos programados.",
  alternates: { canonical: "https://www.cuentahogar.com.ar/envios" },
};

const quoteUrl = "https://cuenta-negocio.vercel.app/cotizar";
const mapsUrl = "https://maps.google.com/?q=Caracas+1101+CABA";
const whatsappUrl = `https://wa.me/5491125659686?text=${encodeURIComponent("Hola, quisiera consultar por Envíos Low Cost. Mi localidad es: ")}`;

const steps = [
  ["Cotizás tu envío", "Cargá el tipo de bulto y el destino para ver el precio estimado."],
  ["Coordinás la recepción", "Tu proveedor entrega la compra en nuestro centro de CABA."],
  ["Organizamos los bultos", "Identificamos tu mercadería y agrupamos los paquetes de tu envío."],
  ["Recibís en tu domicilio", "Te llevamos la compra en el recorrido programado."],
];

const localities = ["Lincoln", "Zavalía", "Los Toldos", "Chivilcoy", "O’Brien"];

export default function EnviosPage() {
  return (
    <>
      <Header />
      <main id="contenido" className={styles.page}>
        <section className={`${styles.section} ${styles.warm}`}>
          <div className={`${styles.container} ${styles.split}`}>
            <div className={styles.stack}>
              <p className={styles.kicker}>Envíos Low Cost</p>
              <h1>Compraste en Buenos Aires. Ahora falta hacerlo llegar.</h1>
              <p className={styles.copy}>Recibimos tus compras en CABA y las llevamos a tu domicilio en las localidades de nuestro recorrido.</p>
              <div className={styles.actions}>
                <a className={styles.button} href="#cotizador">Cotizar mi envío</a>
                <a className={styles.link} href={whatsappUrl} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>
              </div>
            </div>
            <Image
              className={styles.photo}
              src="/entrega-ford-transit.jpg"
              alt="Vehículo de Cuenta Hogar durante una entrega"
              width={1024}
              height={576}
              sizes="(max-width: 767px) 100vw, 50vw"
              preload
            />
          </div>
        </section>

        <section id="cotizador" className={styles.section}>
          <div className={`${styles.container} ${styles.stack}`}>
            <h2>Estimá el costo de tu envío</h2>
            <iframe
              src={`${quoteUrl}?embed=1`}
              title="Cotizador de envíos de Cuenta Negocio"
              loading="lazy"
              className={styles.quote}
            />
            <a className={styles.link} href={quoteUrl} target="_blank" rel="noopener noreferrer">
              Abrir el cotizador en otra pestaña
            </a>
          </div>
        </section>

        <section id="condiciones-del-servicio" className={styles.section}>
          <div className={`${styles.container} ${styles.stack}`}>
            <h2>Condiciones del servicio</h2>
            <p className={styles.copy}>Si tu localidad no aparece en el cotizador, <a className={styles.link} href={whatsappUrl} target="_blank" rel="noopener noreferrer">consultanos por WhatsApp</a> antes de planear el envío.</p>
          </div>
        </section>

        <section className={styles.section}>
          <div className={`${styles.container} ${styles.stack}`}>
            <h2>Así viaja tu compra</h2>
            <ol className={styles.steps}>
              {steps.map(([title, text]) => (
                <li key={title}><h3>{title}</h3><p>{text}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section id="recepcion-caba" className={styles.section}>
          <div className={`${styles.container} ${styles.split}`}>
            <div className={styles.stack}>
              <h2>Recepción en CABA</h2>
              <p className={styles.copy}><strong>Caracas 1101, CABA.</strong> Coordiná el horario con nosotros antes de despachar la mercadería.</p>
              <a className={styles.link} href={mapsUrl} target="_blank" rel="noopener noreferrer">Ver ubicación en Maps</a>
            </div>
            <Image
              className={styles.photo}
              src="/deposito-cuenta-hogar.jpg"
              alt="Interior del centro de recepción de Cuenta Hogar"
              width={1024}
              height={576}
              sizes="(max-width: 767px) 100vw, 50vw"
            />
          </div>
        </section>

        <section id="cuenta-negocio" className={`${styles.section} ${styles.warm}`}>
          <div className={`${styles.container} ${styles.business}`}>
            <div className={styles.stack}>
              <h2>¿Comprás para tu comercio?</h2>
              <p className={styles.copy}>Cuenta Negocio ofrece servicios de recepción y traslado para comercios y emprendimientos.</p>
              <a className={styles.link} href="https://www.cuentanegocio.com.ar/">Conocer Cuenta Negocio</a>
            </div>
            <Image src="/logo-cuenta-negocio.png" alt="Cuenta Negocio" width={132} height={132} />
          </div>
        </section>

        <section id="cobertura" className={styles.section}>
          <div className={`${styles.container} ${styles.stack}`}>
            <h2>Localidades del recorrido</h2>
            <ul className={styles.localities}>
              {localities.map((locality) => <li key={locality}>{locality}</li>)}
            </ul>
          </div>
        </section>

        <section id="preguntas-frecuentes" className={styles.section}>
          <div className={`${styles.container} ${styles.stack}`}>
            <h2>Preguntas frecuentes</h2>
            <div className={styles.faq}><EnviosFaq /></div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.warm}`}>
          <div className={`${styles.container} ${styles.stack}`}>
            <h2>¿Necesitás ayuda con tu envío?</h2>
            <a className={styles.button} href={whatsappUrl} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
