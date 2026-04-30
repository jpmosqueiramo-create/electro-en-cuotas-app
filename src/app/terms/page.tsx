import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-yellow-500 selection:text-black">
      
      {/* NAVBAR SIMPLE (Tono legal, claro y limpio) */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-gray-500 hover:text-black flex items-center gap-2 text-sm transition-colors font-bold">
            <ArrowLeft className="w-5 h-5" /> Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-black">CUENTA <span className="text-yellow-500">HOGAR</span></span>
          </div>
        </div>
      </nav>

      {/* CONTENIDO LEGAL */}
      <main className="max-w-4xl mx-auto px-6 py-20">
        
        <header className="mb-16 border-b border-gray-200 pb-8">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-black">
            Términos y Condiciones Generales de Servicio
          </h1>
          <p className="text-lg text-gray-600 font-light">
            Por favor, leé detenidamente las condiciones que rigen los servicios de gestión de Cuenta Hogar SRL.
          </p>
        </header>

        <article className="prose prose-lg max-w-none text-gray-700 space-y-12">
          
          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">1.</span> Naturaleza de la Empresa y Objeto de los Servicios
            </h2>
            <p className="leading-relaxed text-justify">
              <strong className="text-black">Cuenta Hogar SRL es exclusivamente una empresa de prestación de servicios.</strong> Nuestra actividad principal consiste en la gestión administrativa y el mandato de compra de productos tecnológicos y electrodomésticos a pedido del cliente. Dejamos expresa constancia de que Cuenta Hogar SRL <strong>NO es una tienda minorista, NO es el fabricante de los bienes, y NO es una entidad financiera</strong> en los términos de la Ley de Entidades Financieras de la República Argentina.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">2.</span> Contrato de Mandato de Compra
            </h2>
            <p className="leading-relaxed text-justify">
              Al utilizar nuestra plataforma y solicitar un producto, el cliente otorga una orden expresa y mandato irrevocable a Cuenta Hogar SRL para que, actuando en su nombre y representación, adquiera el bien especificado utilizando el capital de la empresa. El cliente se compromete a abonar los costos de gestión, el valor del bien y la financiación asociada según el plan acordado.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">3.</span> Intermediación en Soporte Técnico
            </h2>
            <p className="leading-relaxed text-justify">
              Cuenta Hogar SRL ofrece un servicio de acompañamiento y gestión de soporte técnico ante fallas de fábrica. Esto implica que la empresa actuará como intermediario para gestionar la garantía oficial ante el fabricante o el proveedor original. <strong>Cuenta Hogar SRL no realiza reparaciones técnicas directas ni abre los equipos bajo ninguna circunstancia.</strong> Los tiempos de respuesta y resolución técnica dependen exclusivamente de las políticas del fabricante.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">4.</span> Obligación de Pago y Mora
            </h2>
            <p className="leading-relaxed text-justify">
              Al conformar el plan, el cliente asume una obligación de pago estructurada en cuotas fijas, expresadas en pesos argentinos, documentada mediante la suscripción de títulos a sola firma (pagarés) y contratos de mutuo o adhesión. En caso de incumplimiento de pago, el cliente incurrirá en mora automática sin necesidad de interpelación previa. Cuenta Hogar SRL se reserva el derecho de iniciar las acciones de recupero extrajudicial y judicial pertinentes de forma directa o a través de terceros autorizados.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">5.</span> Red de Afiliados Independientes
            </h2>
            <p className="leading-relaxed text-justify">
              La plataforma opera comercialmente con el apoyo de una red de <strong>Afiliados Independientes</strong>. Estos son terceros ajenos a la estructura societaria de Cuenta Hogar SRL que prestan servicios de referenciación, scoring participativo y gestión de cobranza. <strong>Bajo ninguna circunstancia existe relación de dependencia laboral ni subordinación jurídica entre Cuenta Hogar SRL y el Afiliado Independiente.</strong> Cada Afiliado asume su propia responsabilidad civil y penal por sus actos, gestiones y omisiones durante su actividad comercial independiente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">6.</span> Jurisdicción y Ley Aplicable
            </h2>
            <p className="leading-relaxed text-justify">
              Para cualquier controversia que pudiera derivarse de la interpretación, validez o ejecución de los presentes Términos y Condiciones, las partes se someten voluntariamente a la jurisdicción de los Tribunales Ordinarios competentes de la Provincia de Buenos Aires, República Argentina, renunciando expresamente a cualquier otro fuero o jurisdicción que pudiera corresponderles por su domicilio presente o futuro.
            </p>
          </section>

        </article>

        <div className="mt-20 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Última actualización: {new Date().toLocaleDateString('es-AR')}</p>
          <p className="mt-2">Cuenta Hogar SRL | CUIT: 30-00000000-0 | Domicilio Legal: Av. Ejemplo 123, CABA, Argentina</p>
        </div>
      </main>
    </div>
  );
}
