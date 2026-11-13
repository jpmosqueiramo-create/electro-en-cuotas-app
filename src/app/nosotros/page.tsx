import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const faqs = [
    {
      q: "¿Cuenta Hogar vende productos?",
      a: "No. Cuenta Hogar brinda un servicio de gestión de compra mediante mandato. Nos contás qué necesitás, buscamos alternativas y te presentamos una propuesta con un plan de cuotas fijas. Si decidís avanzar, gestionamos la adquisición y coordinamos la logística hasta tu domicilio."
    },
    {
      q: "¿Tengo que saber exactamente qué producto quiero?",
      a: "No. Podés contarnos simplemente qué necesitás y te ayudamos a buscar alternativas. Si ya viste una marca, modelo, publicación o presupuesto, también podés enviárnoslo como referencia."
    },
    {
      q: "¿Puedo pedir un producto que no aparece en la web?",
      a: "Sí. Las opciones que mostramos son ejemplos orientativos. Podés consultarnos por otro producto aunque no aparezca publicado y evaluamos alternativas disponibles para tu solicitud."
    },
    {
      q: "¿Pedir una propuesta me obliga a avanzar?",
      a: "No. Primero conocés la propuesta y las condiciones del plan de cuotas. Si decidís avanzar, recién entonces formalizamos la gestión mediante mandato."
    },
    {
      q: "¿Evalúan cada solicitud antes de aprobarla?",
      a: "Sí. Antes de avanzar realizamos una evaluación de la solicitud y de las referencias disponibles. Cada operación se analiza individualmente."
    },
    {
      q: "¿Qué diferencia hay entre Servicio de Compra y Envíos Low Cost?",
      a: "Servicio de Compra es para quien todavía necesita resolver una compra y quiere que Cuenta Hogar gestione la operación completa, incluyendo el plan de cuotas y la entrega.\n\nEnvíos Low Cost es para quien compra por su cuenta en CABA y necesita recibir esa mercadería en el interior.\n\nEnvíos Low Cost estará disponible desde el 25 de noviembre de 2026."
    }
  ];

export default function NosotrosPage() {
  return (
    <div className="public-site">
      <Header />
      <main id="contenido">
        <section className="public-hero public-warm">
          <div className="public-container public-split">
            <div className="public-stack">
              <p className="public-kicker">Nosotros</p>
              <h1>De resolver una compra a conectar Capital con el interior.</h1>
              <p className="public-copy">Cuenta Hogar nació de una necesidad concreta: ayudar a personas del interior a conseguir lo que necesitan sin tener que resolver solas cada parte de la operación.</p>
              <p className="public-copy">Buscamos conectar las oportunidades de compra de Capital con las necesidades de quienes viven y trabajan en el interior.</p>
            </div>
            <Image className="public-photo" src="/centro-logistico-caba.jpg" alt="Centro de recepción de Cuenta Hogar en CABA" width={768} height={1024} sizes="(max-width: 767px) 100vw, 50vw" preload />
          </div>
        </section>
        <section className="public-section">
          <div className="public-container">
            <h2>Cómo fuimos creciendo</h2>
            <ol className="public-rows" role="list">
              {[
                ["Gestión de compras", "Empezamos acompañando a nuestros clientes para encontrar alternativas, organizar sus compras y resolverlas mediante un plan de cuotas."],
                ["Una operación más completa", "Incorporamos un centro de recepción en CABA para concentrar compras, organizar mercadería y coordinar su llegada al interior."],
                ["Una nueva etapa logística", "Desde el 25 de noviembre sumamos Envíos Low Cost y ampliamos nuestra capacidad para trasladar productos de mayor volumen con transporte propio."],
              ].map(([title, description], index) => (
                <li className="public-row" key={title}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{title}</h3><p>{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="public-section public-warm">
          <div className="public-container public-stack">
            <h2>Cómo acompañamos cada compra</h2>
            <div className="public-grid">
              <article className="public-stack">
                <h3>Centro de recepción en CABA</h3>
                <p className="public-copy">En Caracas 1101 recibimos, identificamos y organizamos las compras previamente coordinadas antes de incorporarlas al recorrido correspondiente.</p>
              </article>
              <article className="public-stack">
                <h3>Logística propia</h3>
                <p className="public-copy">Desde el 25 de noviembre incorporamos una Ford Transit de techo elevado para trasladar productos de mayor volumen y hacer entregas programadas a domicilio.</p>
              </article>
              <article className="public-stack">
                <h3>Presencia local</h3>
                <p className="public-copy">Los vendedores afiliados ayudan a conocer la necesidad del cliente, acompañan la solicitud y mantienen un contacto cercano durante la relación con Cuenta Hogar.</p>
              </article>
            </div>
          </div>
        </section>
        <section id="preguntas-frecuentes" className="public-section">
          <div className="public-container public-split">
            <h2>Preguntas frecuentes</h2>
            <div>
              {faqs.map(faq => (
                <details className="public-details" key={faq.q}>
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
              <div className="public-stack mt-6">
                <Link className="public-link" href="/servicio-de-compra#preguntas-frecuentes">Preguntas del servicio de compra</Link>
                <Link className="public-link" href="/envios#preguntas-frecuentes">Preguntas de Envíos Low Cost</Link>
              </div>
            </div>
          </div>
        </section>
        <section className="public-section public-callout">
          <div className="public-container public-split">
            <h2>¿Querés conversar sobre una compra?</h2>
            <Link className="public-button public-button-dark justify-self-start self-center" href="/#contacto">Pedir una propuesta</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
