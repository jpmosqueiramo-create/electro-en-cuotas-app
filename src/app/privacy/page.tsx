import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-yellow-500 selection:text-black">
      
      {/* NAVBAR SIMPLE */}
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
            Política de Privacidad y Tratamiento de Datos
          </h1>
          <p className="text-lg text-gray-600 font-light">
            Conocé cómo cuidamos tu información y protegemos tu confianza, en estricto cumplimiento con la Ley de Protección de Datos Personales N° 25.326.
          </p>
        </header>

        <article className="prose prose-lg max-w-none text-gray-700 space-y-12">
          
          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">1.</span> Marco Legal
            </h2>
            <p className="leading-relaxed">
              Cuenta Hogar SRL respeta tu derecho a la privacidad. La presente política se encuentra regulada por la legislación vigente de la República Argentina, en especial la Ley de Protección de Datos Personales N° 25.326 y sus disposiciones complementarias.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">2.</span> Información Recopilada
            </h2>
            <p className="leading-relaxed mb-4">
              Para brindar nuestros servicios de gestión, requerimos recopilar la siguiente información estrictamente necesaria:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li><strong className="text-black">Datos de Identidad:</strong> Nombre, apellido, fecha de nacimiento y número de DNI.</li>
              <li><strong className="text-black">Datos de Contacto y Ubicación:</strong> Número de teléfono/WhatsApp, localidad y dirección postal exacta de entrega.</li>
              <li><strong className="text-black">Datos Patrimoniales:</strong> Ocupación, comprobantes de ingresos (recibos de sueldo, comprobantes de monotributo) y referencias personales o comerciales con fines de evaluación financiera.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">3.</span> Uso de los Datos
            </h2>
            <p className="leading-relaxed mb-4">
              La información suministrada por el cliente tiene como único fin la correcta prestación de nuestros servicios. Se utilizará para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Realizar el <em>scoring</em> crediticio y análisis de riesgo a sola firma.</li>
              <li>Ejecutar el mandato de compra y procesar el alta de la financiación solicitada.</li>
              <li>Gestionar la logística para asegurar la entrega puerta a puerta.</li>
              <li>Administrar los procesos de facturación, cobro y seguimiento de cuotas.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">4.</span> Red de Afiliados Independientes
            </h2>
            <p className="leading-relaxed">
              Cuenta Hogar SRL <strong>NO vende, alquila ni comercializa bases de datos</strong> a terceros con fines publicitarios. No obstante, en virtud de nuestro modelo de gestión descentralizada, informamos que compartimos los datos de contacto y el estado de cuenta del cliente con el <strong>Afiliado Independiente</strong> responsable de su zona geográfica. Esta transferencia de información tiene como propósito <strong>exclusivo</strong> la gestión logística, el seguimiento operativo y la cobranza activa en terreno.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">5.</span> Seguridad
            </h2>
            <p className="leading-relaxed">
              Tus archivos digitales (fotos de DNI, comprobantes) y datos personales se encuentran protegidos mediante protocolos de encriptación y son almacenados en servidores seguros con acceso restringido únicamente al personal autorizado y evaluador de Cuenta Hogar SRL.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-black mb-4 flex items-center gap-3">
              <span className="text-yellow-500">6.</span> Derechos del Usuario
            </h2>
            <p className="leading-relaxed">
              Como titular de los datos personales, tenés la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses. Asimismo, tenés derecho a solicitar la rectificación, actualización o eliminación de tus datos incluidos en nuestra base. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes.
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
