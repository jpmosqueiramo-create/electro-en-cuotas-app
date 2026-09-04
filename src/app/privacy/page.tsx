import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#1F2928] font-sans selection:bg-[#173E3B] selection:text-white">
      
      {/* NAVBAR SIMPLE */}
      <nav className="sticky top-0 z-50 bg-[#FFFDFC]/90 backdrop-blur-md border-b border-[#DED8CF]">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-[#68706E] hover:text-[#173E3B] flex items-center gap-2 text-sm transition-colors font-bold">
            <ArrowLeft className="w-5 h-5" /> Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#173E3B] font-heading">CUENTA <span className="text-[#B44E2A]">HOGAR</span></span>
          </div>
        </div>
      </nav>

      {/* CONTENIDO LEGAL */}
      <main className="max-w-4xl mx-auto px-6 py-20">
        
        <header className="mb-16 border-b border-[#DED8CF] pb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[#173E3B] font-heading">
            Política de Privacidad y Tratamiento de Datos
          </h1>
          <p className="text-lg text-[#68706E] font-normal">
            Conocé cómo cuidamos tu información y protegemos tu confianza, en estricto cumplimiento con la Ley de Protección de Datos Personales N° 25.326.
          </p>
        </header>

        <article className="prose prose-lg max-w-none text-[#1F2928] space-y-12">
          
          <section>
            <h2 className="text-2xl font-bold text-[#173E3B] mb-4 flex items-center gap-3 font-heading">
              <span className="text-[#B44E2A]">1.</span> Marco Legal
            </h2>
            <p className="leading-relaxed">
              LOOP GESTIÓN INTEGRAL S.R.L., representada por su Gerente Juan Pablo Mosqueira (operando comercialmente bajo el nombre de fantasía "Cuenta Hogar"), respeta tu derecho a la privacidad. La presente política se encuentra regulada por la legislación vigente de la República Argentina, en especial la Ley de Protección de Datos Personales N° 25.326 y sus disposiciones complementarias.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#173E3B] mb-4 flex items-center gap-3 font-heading">
              <span className="text-[#B44E2A]">2.</span> Información Recopilada
            </h2>
            <p className="leading-relaxed mb-4">
              Para brindar nuestros servicios de gestión, requerimos recopilar la siguiente información estrictamente necesaria:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#68706E]">
              <li><strong className="text-[#1F2928]">Datos de Identidad:</strong> Nombre, apellido, fecha de nacimiento y número de DNI.</li>
              <li><strong className="text-[#1F2928]">Datos de Contacto y Ubicación:</strong> Número de teléfono/WhatsApp, localidad y dirección postal exacta de entrega.</li>
              <li><strong className="text-[#1F2928]">Datos Patrimoniales:</strong> Ocupación, comprobantes de ingresos (recibos de sueldo, comprobantes de monotributo) y referencias personales o comerciales con fines de evaluación financiera.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#173E3B] mb-4 flex items-center gap-3 font-heading">
              <span className="text-[#B44E2A]">3.</span> Uso de los Datos
            </h2>
            <p className="leading-relaxed mb-4">
              La información suministrada por el cliente tiene como único fin la correcta prestación de nuestros servicios. Se utilizará para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-[#68706E]">
              <li>Realizar el <em>scoring</em> crediticio y análisis de riesgo a sola firma.</li>
              <li>Ejecutar el mandato de compra y procesar el alta de la financiación solicitada.</li>
              <li>Gestionar la logística para asegurar la entrega puerta a puerta.</li>
              <li>Administrar los procesos de facturación, cobro y seguimiento de cuotas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#173E3B] mb-4 flex items-center gap-3 font-heading">
              <span className="text-[#B44E2A]">4.</span> Red de Afiliados Independientes
            </h2>
            <p className="leading-relaxed">
              LOOP GESTIÓN INTEGRAL S.R.L. <strong>NO vende, alquila ni comercializa bases de datos</strong> a terceros con fines publicitarios. No obstante, en virtud de nuestro modelo de gestión descentralizada, informamos que compartimos los datos de contacto y el estado de cuenta del cliente con el <strong>Afiliado Independiente</strong> responsable de su zona geográfica. Esta transferencia de información tiene como propósito <strong>exclusivo</strong> la gestión logística, el seguimiento operativo y la cobranza activa en terreno.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#173E3B] mb-4 flex items-center gap-3 font-heading">
              <span className="text-[#B44E2A]">5.</span> Seguridad
            </h2>
            <p className="leading-relaxed">
              Tus archivos digitales (fotos de DNI, comprobantes) y datos personales se encuentran protegidos mediante protocolos de encriptación y son almacenados en servidores seguros con acceso restringido únicamente al personal autorizado y evaluador de LOOP GESTIÓN INTEGRAL S.R.L..
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-[#173E3B] mb-4 flex items-center gap-3 font-heading">
              <span className="text-[#B44E2A]">6.</span> Derechos del Usuario
            </h2>
            <p className="leading-relaxed">
              Como titular de los datos personales, tenés la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses. Asimismo, tenés derecho a solicitar la rectificación, actualización o eliminación de tus datos incluidos en nuestra base. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes.
            </p>
          </section>

        </article>

        <div className="mt-20 pt-8 border-t border-zinc-800 text-center text-sm text-zinc-500">
          <p>Última actualización: {new Date().toLocaleDateString('es-AR')}</p>
          <p className="mt-2">LOOP GESTIÓN INTEGRAL S.R.L. — Gerente Juan Pablo Mosqueira | Domicilio Legal: Caracas 1101, CABA, Argentina</p>
        </div>
      </main>
    </div>
  );
}
