import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#181920] text-zinc-100 font-sans selection:bg-amber-500 selection:text-black">
      
      {/* NAVBAR SIMPLE */}
      <nav className="sticky top-0 z-50 bg-[#181920]/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm transition-colors font-bold">
            <ArrowLeft className="w-5 h-5" /> Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white">CUENTA <span className="text-[#fe5000]">HOGAR</span></span>
          </div>
        </div>
      </nav>

      {/* CONTENIDO LEGAL */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        
        <header className="mb-12 border-b border-zinc-800 pb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-4 text-white">
            Términos y Condiciones Generales de Servicio
          </h1>
          <p className="text-sm md:text-base text-zinc-400 font-normal leading-relaxed">
            Por favor, leé detenidamente las condiciones que rigen los servicios de gestión de LOOP GESTIÓN INTEGRAL S.R.L., operando comercialmente bajo el nombre de fantasía "Cuenta Hogar".
          </p>
        </header>

        <article className="space-y-10 text-zinc-300">
          
          {/* CLAUSULA 1 */}
          <section className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl shadow-xl space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="text-[#fe5000] font-black font-mono">1.</span> Naturaleza de la Empresa y Objeto de los Servicios
            </h2>
            <p className="leading-relaxed text-sm text-zinc-300 text-justify">
              <strong className="text-white">LOOP GESTIÓN INTEGRAL S.R.L. es exclusivamente una empresa de prestación de servicios.</strong> Nuestra actividad principal consiste en la gestión administrativa y el mandato de compra de productos tecnológicos y electrodomésticos a pedido del cliente. Dejamos expresa constancia de que LOOP GESTIÓN INTEGRAL S.R.L. <strong className="text-amber-400">NO es una tienda minorista, NO es el fabricante de los bienes, y NO es una entidad financiera</strong> en los términos de la Ley de Entidades Financieras de la República Argentina.
            </p>
          </section>

          {/* CLAUSULA 2 */}
          <section className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl shadow-xl space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="text-[#fe5000] font-black font-mono">2.</span> Contrato de Mandato de Compra
            </h2>
            <p className="leading-relaxed text-sm text-zinc-300 text-justify">
              Al utilizar nuestra plataforma y solicitar un producto, el cliente otorga una orden expresa y mandato irrevocable a LOOP GESTIÓN INTEGRAL S.R.L. para que, actuando en su nombre y representación, adquiera el bien especificado utilizando el capital de la empresa. El cliente se compromete a abonar los costos de gestión, el valor del bien y la financiación asociada según el plan acordado.
            </p>
          </section>

          {/* CLAUSULA 3 */}
          <section className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl shadow-xl space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="text-[#fe5000] font-black font-mono">3.</span> Intermediación en Soporte Técnico y Logística
            </h2>
            <p className="leading-relaxed text-sm text-zinc-300 text-justify">
              LOOP GESTIÓN INTEGRAL S.R.L. ofrece un servicio de acompañamiento y gestión de soporte técnico ante fallas de fábrica. Esto implica que la empresa actuará como intermediario para gestionar la garantía oficial ante el fabricante o el proveedor original, asumiendo exclusivamente el servicio logístico de traslado físico del equipo desde el domicilio del cliente hacia los Centros de Servicio Técnico Oficial ubicados en la Ciudad Autónoma de Buenos Aires (CABA), así como su posterior retorno. <strong className="text-amber-400">LOOP GESTIÓN INTEGRAL S.R.L. no realiza reparaciones técnicas directas ni abre los equipos bajo ninguna circunstancia.</strong> Los tiempos de respuesta y resolución técnica dependen exclusivamente de las políticas del fabricante.
            </p>
          </section>

          {/* CLAUSULA 4 */}
          <section className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl shadow-xl space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="text-[#fe5000] font-black font-mono">4.</span> Obligación de Pago y Mora
            </h2>
            <p className="leading-relaxed text-sm text-zinc-300 text-justify">
              Al conformar el plan, el cliente asume una obligación de pago estructurada en cuotas fijas, expresadas en pesos argentinos, documentada mediante la suscripción de títulos a sola firma (pagarés) y contratos de mutuo o adhesión. En caso de incumplimiento de pago, el cliente incurrirá en mora automática sin necesidad de interpelación previa. LOOP GESTIÓN INTEGRAL S.R.L. se reserva el derecho de iniciar las acciones de recupero extrajudicial y judicial pertinentes de forma directa o a través de terceros autorizados.
            </p>
          </section>

          {/* CLAUSULA 5 */}
          <section className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl shadow-xl space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="text-[#fe5000] font-black font-mono">5.</span> Red de Afiliados Independientes
            </h2>
            <p className="leading-relaxed text-sm text-zinc-300 text-justify">
              La plataforma opera comercialmente con el apoyo de una red de <strong className="text-white">Afiliados Independientes</strong>. Estos son terceros ajenos a la estructura societaria de LOOP GESTIÓN INTEGRAL S.R.L. que prestan servicios de referenciación, scoring participativo y gestión de cobranza. <strong className="text-amber-400">Bajo ninguna circunstancia existe relación de dependencia laboral ni subordinación jurídica entre LOOP GESTIÓN INTEGRAL S.R.L. y el Afiliado Independiente.</strong> Cada Afiliado asume su propia responsabilidad civil y penal por sus actos, gestiones y omisiones durante su actividad comercial independiente.
            </p>
          </section>

          {/* CLAUSULA 6 */}
          <section className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl shadow-xl space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <span className="text-[#fe5000] font-black font-mono">6.</span> Jurisdicción y Ley Aplicable
            </h2>
            <p className="leading-relaxed text-sm text-zinc-300 text-justify">
              Para cualquier controversia que pudiera derivarse de la interpretación, validez o ejecución de los presentes Términos y Condiciones, las partes se someten voluntariamente a la jurisdicción de los Tribunales Ordinarios competentes de la Provincia de Buenos Aires, República Argentina, renunciando expresamente a cualquier otro fuero o jurisdicción que pudiera corresponderles por su domicilio presente o futuro.
            </p>
          </section>

        </article>

        <footer className="mt-16 pt-8 border-t border-zinc-800 text-center text-xs text-zinc-500 space-y-3 flex flex-col items-center">
          <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-12 w-auto object-contain mb-1" />
          <p className="font-mono">Última actualización: {new Date().toLocaleDateString("es-AR")}</p>
          <p>LOOP GESTIÓN INTEGRAL S.R.L. — Gerente Juan Pablo Mosqueira | CUIT: 30-71829384-9 | Domicilio Legal: Caracas 1101, CABA, Argentina</p>
        </footer>
      </main>
    </div>
  );
}
