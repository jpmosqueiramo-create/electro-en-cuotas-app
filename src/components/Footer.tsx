import { CuentaHogarLogo } from "@/components/CuentaHogarLogo";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="public-footer">
      <div className="public-container">
        <div className="public-footer-grid">
          <div className="public-stack">
            <Link href="/" className="justify-self-start"><CuentaHogarLogo className="h-12" /></Link>
            <div>
              <strong>LOOP GESTIÓN INTEGRAL S.R.L.</strong>
              <p>Operamos por mandato comercial y coordinamos el traslado con transporte propio desde Buenos Aires hasta domicilios en el interior.</p>
            </div>
            <p>Centro de Logística &amp; Recepción: Caracas 1101, CABA</p>
          </div>
          <nav aria-label="Navegación del pie">
            <h2>Navegación</h2>
            <ul>
              <li><Link href="/#modelo">Cómo funciona</Link></li>
              <li><Link href="/servicio-de-compra">Servicio de compra</Link></li>
              <li><Link href="/envios">Envíos Low Cost CABA</Link></li>
              <li><Link href="/nosotros">Nosotros</Link></li>
              <li><Link href="/red-afiliados">Red de afiliados</Link></li>
            </ul>
          </nav>
          <div className="public-stack">
            <div>
              <h2>Contacto y redes</h2>
              <ul>
                <li><a href="https://wa.me/5491125659686" target="_blank" rel="noopener noreferrer">WhatsApp · +54 9 11 2565-9686</a></li>
                <li><a href="https://www.instagram.com/cuenta_hogar/" target="_blank" rel="noopener noreferrer">Instagram · @cuenta_hogar</a></li>
              </ul>
            </div>
            <div>
              <h2>Accesos</h2>
              <ul>
                <li><Link href="/cliente">Portal de clientes</Link></li>
                <li><Link href="/login-afiliado">Acceso de vendedores afiliados</Link></li>
              </ul>
            </div>
          </div>
          <div>
            <h2>Legal y consumidor</h2>
            <ul>
              <li><Link href="/terms">Términos y Condiciones</Link></li>
              <li><Link href="/privacy">Política de Privacidad</Link></li>
              <li><a href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario" target="_blank" rel="noopener noreferrer">Defensa del Consumidor</a></li>
              <li><Link href="/arrepentimiento">Boton de Arrepentimiento</Link></li>
            </ul>
          </div>
        </div>
        <div className="public-legal public-stack">
          <p><strong>Aviso Legal Obligatorio:</strong> LOOP GESTIÓN INTEGRAL S.R.L. opera bajo la marca comercial Cuenta Hogar prestando servicios de gestión de compra por mandato comercial y traslado logístico asociado. No realizamos intermediación financiera en los términos de la Ley N° 21.526. En la solución Envíos Low Cost actuamos exclusivamente como prestatarios de traslado de mercadería recibida en nuestro local de CABA.</p>
          <p>© {new Date().getFullYear()} LOOP GESTIÓN INTEGRAL S.R.L. — Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
