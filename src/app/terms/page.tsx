import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, ExternalLink, RotateCcw } from "lucide-react";

export default function TermsPage() {
  const fechaActualizacion = new Date().toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return (
    <div className="min-h-screen bg-[#111318] text-zinc-100 font-sans selection:bg-[#FFD21A] selection:text-[#111318]">
      
      {/* NAVBAR SIMPLE */}
      <nav className="sticky top-0 z-50 bg-[#161922]/95 backdrop-blur-md border-b border-[#222530]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <Link href="/" className="text-zinc-400 hover:text-[#FFD21A] flex items-center gap-2 text-xs sm:text-sm transition-colors font-bold">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" /> Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-xl font-bold text-white tracking-tight">
              CUENTA <span className="text-[#FFD21A]">HOGAR</span>
            </span>
          </div>
        </div>
      </nav>

      {/* CONTENIDO LEGAL */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
        
        {/* ENCABEZADO Y PREÁMBULO */}
        <header className="border-b border-[#222530] pb-8 space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#FFD21A]/10 border border-[#FFD21A]/30 text-[#FFD21A] px-3 py-1 rounded-full text-xs font-mono font-bold">
            <FileText className="w-3.5 h-3.5" /> MARCO GENERAL DE SERVICIOS
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Términos y Condiciones Generales de Servicio
          </h1>

          <div className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              Estos Términos y Condiciones regulan el uso de los servicios ofrecidos por <strong className="text-white">LOOP GESTIÓN INTEGRAL S.R.L.</strong>, que opera comercialmente bajo el nombre <strong className="text-[#FFD21A]">Cuenta Hogar</strong>.
            </p>
            <p>
              Cuenta Hogar brinda servicios de gestión de compras mediante mandato y servicios logísticos asociados, además del servicio Envíos Low Cost en las condiciones indicadas a continuación.
            </p>
            <p className="text-zinc-400">
              La solicitud de información, una cotización o una propuesta no implica por sí sola la contratación del servicio. Cada operación se formaliza posteriormente mediante la documentación correspondiente y las condiciones particulares aceptadas por el cliente.
            </p>
          </div>
        </header>

        {/* ÍNDICE RÁPIDO NAVEGABLE */}
        <nav className="bg-[#161922] border border-[#222530] p-4 sm:p-5 rounded-2xl space-y-3">
          <h2 className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider">
            Índice de Secciones
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-zinc-400">
            <a href="#naturaleza" className="hover:text-white transition-colors">1. Naturaleza y alcance</a>
            <a href="#solicitudes" className="hover:text-white transition-colors">2. Solicitudes y propuestas</a>
            <a href="#mandato" className="hover:text-white transition-colors">3. Servicio de Compra</a>
            <a href="#cuotas" className="hover:text-white transition-colors">4. Plan de cuotas</a>
            <a href="#evaluacion" className="hover:text-white transition-colors">5. Evaluación previa</a>
            <a href="#disponibilidad" className="hover:text-white transition-colors">6. Disponibilidad y sustitución</a>
            <a href="#plazos" className="hover:text-white transition-colors">7. Plazos estimados</a>
            <a href="#recepcion" className="hover:text-white transition-colors">8. Recepción del producto</a>
            <a href="#garantias" className="hover:text-white transition-colors">9. Garantía y soporte</a>
            <a href="#instrumentacion" className="hover:text-white transition-colors">10. Instrumentación</a>
            <a href="#envios-low-cost" className="hover:text-white transition-colors">11. Envíos Low Cost</a>
            <a href="#envios-operatoria" className="hover:text-white transition-colors">12. Recepción y traslado</a>
            <a href="#recurrentes" className="hover:text-white transition-colors">13. Clientes recurrentes</a>
            <a href="#recorridos" className="hover:text-white transition-colors">14. Recorridos</a>
            <a href="#estado-mercaderia" className="hover:text-white transition-colors">15. Estado de mercadería</a>
            <a href="#seguros" className="hover:text-white transition-colors">16. Coberturas especiales</a>
            <a href="#no-admitidos" className="hover:text-white transition-colors">17. Mercadería no admitida</a>
            <a href="#entrega" className="hover:text-white transition-colors">18. Condiciones de entrega</a>
            <a href="#autorizaciones" className="hover:text-white transition-colors">19. Persona/domicilio autorizado</a>
            <a href="#pago-envios" className="hover:text-white transition-colors">20. Pago de Envíos Low Cost</a>
            <a href="#vendedores" className="hover:text-white transition-colors">21. Vendedores afiliados</a>
            <a href="#revocacion" className="hover:text-white transition-colors">22. Revocación y arrepentimiento</a>
            <a href="#datos-personales" className="hover:text-white transition-colors">23. Datos personales</a>
            <a href="#responsabilidad" className="hover:text-white transition-colors">24. Alcance de responsabilidad</a>
            <a href="#fuerza-mayor" className="hover:text-white transition-colors">25. Situaciones extraordinarias</a>
            <a href="#jurisdiccion" className="hover:text-white transition-colors">26. Legislación aplicable</a>
            <a href="#particulares" className="hover:text-white transition-colors">27. Condiciones particulares</a>
            <a href="#actualizaciones" className="hover:text-white transition-colors">28. Actualizaciones</a>
          </div>
        </nav>

        {/* ARTÍCULO DE SECCIONES LEGALES */}
        <article className="space-y-6 text-xs sm:text-sm leading-relaxed text-zinc-300">
          
          {/* 1 */}
          <section id="naturaleza" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">1.</span> Naturaleza y alcance de los servicios
            </h2>
            <p>
              LOOP GESTIÓN INTEGRAL S.R.L. es una empresa prestadora de servicios que opera comercialmente bajo la marca Cuenta Hogar.
            </p>
            <p>
              Cuenta Hogar no actúa como fabricante de los bienes cuya compra se gestiona ni como una tienda minorista tradicional.
            </p>
            <p className="font-bold text-white pt-1">Sus servicios principales comprenden:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li><strong>a) Servicio de Compra mediante mandato</strong>, para clientes que necesitan gestionar la adquisición de un bien.</li>
              <li><strong>b) Envíos Low Cost</strong>, para clientes que realizan sus propias compras en CABA y necesitan coordinar su recepción y traslado hacia localidades del interior alcanzadas por los recorridos disponibles.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              Las características, valores, condiciones y alcances particulares de cada operación serán informados al cliente antes de su formalización.
            </p>
          </section>

          {/* 2 */}
          <section id="solicitudes" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">2.</span> Solicitudes, consultas y propuestas
            </h2>
            <p>
              El envío de un formulario, un mensaje de WhatsApp, una solicitud de cotización o cualquier otra consulta realizada a través de los canales de Cuenta Hogar no constituye por sí misma un contrato ni obliga al cliente a avanzar con una operación.
            </p>
            <p>
              A partir de la necesidad informada por el cliente, Cuenta Hogar podrá buscar alternativas y presentar una propuesta que detalle las condiciones aplicables a la operación.
            </p>
            <p>
              El cliente podrá evaluar dicha propuesta antes de decidir si desea avanzar.
            </p>
            <p className="text-[#FFD21A] font-medium pt-1">
              La operación se considerará formalizada únicamente una vez cumplidos los pasos de aceptación y suscripta la documentación contractual correspondiente.
            </p>
          </section>

          {/* 3 */}
          <section id="mandato" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">3.</span> Servicio de Compra mediante mandato
            </h2>
            <p>
              Cuando el cliente acepta avanzar con una propuesta, la gestión se formaliza mediante un contrato de mandato de compra y la documentación particular correspondiente.
            </p>
            <p>
              A través del mandato, el cliente encomienda a LOOP GESTIÓN INTEGRAL S.R.L. la realización de las gestiones necesarias para adquirir el bien solicitado en los términos acordados.
            </p>
            <p className="font-bold text-white pt-1">Cuenta Hogar podrá gestionar:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>Búsqueda de alternativas;</li>
              <li>Coordinación con proveedores;</li>
              <li>Adquisición conforme al mandato;</li>
              <li>Recepción del producto en CABA;</li>
              <li>Organización logística;</li>
              <li>Traslado;</li>
              <li>Entrega en el domicilio acordado;</li>
              <li>Y demás servicios expresamente incluidos en la propuesta y documentación particular.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              Los alcances y condiciones concretas de cada operación serán los establecidos en la propuesta y contrato correspondiente.
            </p>
          </section>

          {/* 4 */}
          <section id="cuotas" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">4.</span> Plan de cuotas y condiciones económicas
            </h2>
            <p>
              Cuando corresponda, la propuesta podrá contemplar un plan de cuotas fijas para la operación completa.
            </p>
            <p>
              Antes de formalizar la contratación, el cliente recibirá información sobre las condiciones económicas aplicables a su operación.
            </p>
            <p>
              La primera cuota se abona al momento de la entrega del producto, salvo que en la documentación particular se establezca una condición diferente.
            </p>
            <p>
              En operaciones de mayor valor, Cuenta Hogar podrá solicitar una seña previa. La seña abonada se computará a cuenta del valor total de la operación.
            </p>
            <p className="text-zinc-400 pt-1">
              Las condiciones particulares del plan de cuotas, importes, vencimientos y demás conceptos aplicables serán informados y documentados antes de la formalización.
            </p>
          </section>

          {/* 5 */}
          <section id="evaluacion" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">5.</span> Evaluación previa
            </h2>
            <p>
              Las solicitudes están sujetas a evaluación previa.
            </p>
            <p>
              Cuenta Hogar podrá considerar, entre otros elementos, las referencias disponibles y los antecedentes relacionados con la operación.
            </p>
            <p>
              La presentación de una solicitud no implica aprobación automática.
            </p>
            <p className="text-zinc-400">
              Cuenta Hogar comunicará al cliente si corresponde avanzar con una propuesta y las condiciones aplicables.
            </p>
          </section>

          {/* 6 */}
          <section id="disponibilidad" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">6.</span> Disponibilidad y sustitución
            </h2>
            <p>
              La disponibilidad de los bienes depende de proveedores externos y puede variar entre el momento de la propuesta y la realización efectiva de la compra.
            </p>
            <p>
              Si el producto inicialmente seleccionado dejara de estar disponible, Cuenta Hogar podrá buscar alternativas y presentar una nueva propuesta al cliente.
            </p>
            <p className="font-bold text-white">
              No se adquirirá una alternativa diferente sin la conformidad del cliente.
            </p>
            <p className="text-zinc-400">
              Si el cliente hubiera abonado una seña y la operación finalmente no pudiera concretarse, dicha seña será reintegrada en su totalidad.
            </p>
          </section>

          {/* 7 */}
          <section id="plazos" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">7.</span> Plazos estimados
            </h2>
            <p>
              Para el Servicio de Compra, el plazo habitual estimado es de aproximadamente 7 días corridos desde la confirmación y formalización de la operación hasta la entrega.
            </p>
            <p className="font-bold text-white">Este plazo es orientativo y puede variar según:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>Disponibilidad del producto;</li>
              <li>Proveedor;</li>
              <li>Coordinación de recepción;</li>
              <li>Localidad;</li>
              <li>Recorrido;</li>
              <li>Condiciones logísticas;</li>
              <li>Situaciones de fuerza mayor u otros factores razonablemente ajenos al control de Cuenta Hogar.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              Cuando exista una modificación relevante del plazo estimado, Cuenta Hogar procurará mantener informado al cliente.
            </p>
          </section>

          {/* 8 */}
          <section id="recepcion" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">8.</span> Recepción del producto
            </h2>
            <p>
              Cuenta Hogar recibe e identifica los productos vinculados a las operaciones previamente coordinadas y los prepara para su traslado.
            </p>
            <p>
              La recepción ordinaria no implica una inspección técnica del producto.
            </p>
            <p>
              Cuando el cliente lo solicite previamente y resulte posible coordinarlo, Cuenta Hogar podrá realizar una verificación visual destinada a detectar daños externos evidentes.
            </p>
            <p className="text-zinc-400">
              Esta verificación visual no constituye una revisión técnica, prueba de funcionamiento ni reemplaza la garantía que corresponda.
            </p>
          </section>

          {/* 9 */}
          <section id="garantias" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">9.</span> Garantía y acompañamiento técnico
            </h2>
            <p>
              En productos nuevos, las garantías que correspondan serán las otorgadas por el vendedor, fabricante, importador o demás sujetos responsables conforme a la operación y normativa aplicable.
            </p>
            <p>
              Cuenta Hogar no fabrica los productos ni presta directamente servicios técnicos de reparación.
            </p>
            <p className="font-bold text-white">Cuando corresponda, Cuenta Hogar podrá brindar un servicio logístico de acompañamiento que incluya:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>Retiro del equipo en el domicilio acordado;</li>
              <li>Traslado hasta el servicio técnico oficial o indicado;</li>
              <li>Y posterior traslado de regreso.</li>
            </ul>
            <p className="text-zinc-400">
              Los tiempos de diagnóstico, reparación, provisión de repuestos y resolución dependen del servicio técnico correspondiente y no son determinados por Cuenta Hogar.
            </p>
            <p className="text-zinc-400">
              En productos usados, las condiciones de garantía serán las que correspondan a la operación, al proveedor y a la normativa aplicable, y deberán quedar documentadas cuando corresponda.
            </p>
          </section>

          {/* 10 */}
          <section id="instrumentacion" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">10.</span> Instrumentación de las obligaciones
            </h2>
            <p>
              Las obligaciones asumidas en cada operación podrán documentarse mediante los instrumentos previstos en la documentación contractual particular.
            </p>
            <p>
              Cuando corresponda, podrá requerirse la suscripción de un pagaré u otro instrumento de garantía del cumplimiento de las obligaciones asumidas por el cliente.
            </p>
            <p className="text-zinc-400">
              Las condiciones específicas de dichos instrumentos serán informadas y documentadas antes de su firma.
            </p>
          </section>

          {/* 11 */}
          <section id="envios-low-cost" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">11.</span> Envíos Low Cost
            </h2>
            <p className="text-[#FFD21A] font-bold">
              El servicio Envíos Low Cost estará disponible comercialmente desde el 25 de noviembre de 2026.
            </p>
            <p>
              Este servicio está dirigido a clientes que realizan sus propias compras en CABA y desean coordinar su recepción y traslado hacia las localidades comprendidas en los recorridos de Cuenta Hogar.
            </p>
          </section>

          {/* 12 */}
          <section id="envios-operatoria" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">12.</span> Recepción y traslado
            </h2>
            <p>
              Para utilizar Envíos Low Cost, la recepción de la mercadería deberá ser coordinada previamente con Cuenta Hogar.
            </p>
            <p>
              En la operatoria estándar para clientes particulares, el proveedor o vendedor del cliente entrega la compra en el centro de recepción de Cuenta Hogar ubicado en <strong className="text-white">Caracas 1101, CABA</strong>.
            </p>
            <p className="font-bold text-amber-400">
              No debe enviarse mercadería sin coordinación previa.
            </p>
            <p>
              Una vez recibida, Cuenta Hogar identifica y organiza la mercadería para incorporarla al recorrido correspondiente y coordinar su posterior entrega en destino.
            </p>
            <p className="text-zinc-400">
              El traslado se cotiza por bulto, de acuerdo con sus características y el recorrido correspondiente.
            </p>
          </section>

          {/* 13 */}
          <section id="recurrentes" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">13.</span> Condiciones para clientes recurrentes
            </h2>
            <p>
              Cuenta Hogar podrá ofrecer condiciones específicas a clientes recurrentes, comercios y emprendedores.
            </p>
            <p>
              Para este segmento, y sujeto a cupos generales de capacidad, la recepción, consolidación y custodia temporal de mercadería podrán encontrarse bonificadas.
            </p>
            <p>
              La custodia temporal bonificada contempla hasta una semana, salvo condición particular expresamente acordada.
            </p>
            <p>
              El traslado al interior se cotiza y cobra por bulto.
            </p>
            <p className="text-zinc-400">
              La consolidación de distintos pedidos no implica que todos los bultos pasen a considerarse un único bulto a efectos de la tarifa de traslado.
            </p>
          </section>

          {/* 14 */}
          <section id="recorridos" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">14.</span> Recorridos
            </h2>
            <p>
              En la etapa inicial de Envíos Low Cost se prevé una frecuencia aproximada de un recorrido semanal.
            </p>
            <p>
              La frecuencia podrá aumentar en función de la demanda y capacidad operativa.
            </p>
            <p className="text-zinc-400">
              Las fechas, horarios y ventanas de entrega son estimativas y se coordinan según el recorrido correspondiente.
            </p>
          </section>

          {/* 15 */}
          <section id="estado-mercaderia" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">15.</span> Estado de la mercadería
            </h2>
            <p>
              Cuenta Hogar podrá registrar el estado externo de la mercadería al momento de su recepción y nuevamente al momento de la entrega.
            </p>
            <p className="text-zinc-400">
              Este registro tiene finalidad operativa y de trazabilidad y no constituye una inspección técnica del producto ni una certificación de su funcionamiento.
            </p>
          </section>

          {/* 16 */}
          <section id="seguros" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">16.</span> Coberturas especiales
            </h2>
            <p>
              Cuando por el valor, características o circunstancias de una mercadería resulte conveniente contratar una cobertura especial de seguro, dicha cobertura podrá coordinarse y cotizarse por separado.
            </p>
            <p className="text-zinc-400">
              La existencia, alcance, franquicias, exclusiones y condiciones de cualquier seguro especial serán las correspondientes a la cobertura efectivamente contratada.
            </p>
          </section>

          {/* 17 */}
          <section id="no-admitidos" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">17.</span> Mercadería no admitida
            </h2>
            <p>
              Cuenta Hogar no transporta alimentos ni mercaderías cuya circulación o transporte requiera autorizaciones especiales que no formen parte de la operatoria habitual del servicio.
            </p>
            <p className="text-zinc-400">
              Cuenta Hogar podrá rechazar una mercadería cuando su traslado no resulte compatible con las características del servicio o con la normativa aplicable.
            </p>
          </section>

          {/* 18 */}
          <section id="entrega" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">18.</span> Condiciones de entrega
            </h2>
            <p>
              La entrega estándar se realiza en la puerta del domicilio coordinado.
            </p>
            <p>
              Cuenta Hogar podrá colaborar razonablemente con el ingreso del producto cuando las condiciones lo permitan, pero no realiza subida de mercadería por escaleras.
            </p>
            <p>
              El servicio tampoco incluye instalación de electrodomésticos ni armado de muebles, salvo contratación expresa de un servicio diferente si eventualmente fuera ofrecido.
            </p>
            <p className="text-zinc-400">
              Las entregas de Envíos Low Cost están diseñadas para operar con una sola persona.
            </p>
          </section>

          {/* 19 */}
          <section id="autorizaciones" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">19.</span> Persona o domicilio autorizado
            </h2>
            <p>
              Si el cliente no pudiera recibir personalmente la mercadería, podrá autorizar previamente y por escrito:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>A otra persona para recibirla;</li>
              <li>O un domicilio alternativo para la entrega.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              La autorización debe realizarse antes de la entrega y estar suficientemente identificada.
            </p>
          </section>

          {/* 20 */}
          <section id="pago-envios" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">20.</span> Pago de Envíos Low Cost
            </h2>
            <p>
              Los servicios de Envíos Low Cost podrán abonarse mediante transferencia o efectivo.
            </p>
            <p className="text-zinc-400">
              Para determinados clientes recurrentes, Cuenta Hogar podrá habilitar una modalidad de cuenta corriente, sujeta a aprobación y condiciones comerciales particulares.
            </p>
          </section>

          {/* 21 */}
          <section id="vendedores" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">21.</span> Vendedores afiliados
            </h2>
            <p>
              Cuenta Hogar trabaja con una red de vendedores afiliados que mantienen un vínculo cercano con clientes de las localidades donde la empresa desarrolla su actividad.
            </p>
            <p className="font-bold text-white">El vendedor afiliado puede:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>Conocer la necesidad del cliente;</li>
              <li>Acercar una solicitud;</li>
              <li>Aportar referencias;</li>
              <li>Acompañar la relación con Cuenta Hogar;</li>
              <li>Y mantener el contacto durante el desarrollo de la operación.</li>
            </ul>
            <p>
              La evaluación de la solicitud, la elaboración de la propuesta, la formalización contractual y la administración de la operación corresponden a Cuenta Hogar.
            </p>
            <p className="text-zinc-400">
              Los vendedores afiliados no deben presentarse como personas autorizadas a otorgar créditos, aprobar operaciones ni administrar fondos de Cuenta Hogar, salvo autorización expresa para una función específica. Las comisiones del vendedor afiliado se generan sobre las cuotas que el cliente efectivamente paga por esa compra.
            </p>
          </section>

          {/* 22 */}
          <section id="revocacion" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">22.</span> Revocación y arrepentimiento
            </h2>
            <p>
              Cuando la contratación quede comprendida en los supuestos previstos por la normativa de defensa del consumidor para contrataciones a distancia o fuera del establecimiento comercial, el cliente podrá ejercer los derechos de revocación que correspondan conforme a la legislación vigente.
            </p>
            <p>
              Cuenta Hogar dispone en su sitio web del mecanismo de Botón de Arrepentimiento para los supuestos en que resulte aplicable.
            </p>
            <p className="text-zinc-400">
              El ejercicio de derechos reconocidos legalmente no podrá quedar limitado por estos Términos y Condiciones.
            </p>

            <div className="pt-2">
              <Link 
                href="/arrepentimiento" 
                className="inline-flex items-center gap-2 bg-[#111318] hover:bg-[#252A32] text-[#FFD21A] border border-[#FFD21A]/40 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ir al Botón de Arrepentimiento</span>
              </Link>
            </div>
          </section>

          {/* 23 */}
          <section id="datos-personales" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">23.</span> Datos personales
            </h2>
            <p>
              El tratamiento de datos personales se regirá por la Política de Privacidad publicada por Cuenta Hogar y por la normativa aplicable.
            </p>
            <p className="text-zinc-400">
              Para conocer el alcance del tratamiento y los canales correspondientes, el usuario puede consultar la sección Política de Privacidad del sitio.
            </p>

            <div className="pt-2">
              <Link 
                href="/privacy" 
                className="inline-flex items-center gap-2 bg-[#111318] hover:bg-[#252A32] text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ver Política de Privacidad</span>
              </Link>
            </div>
          </section>

          {/* 24 */}
          <section id="responsabilidad" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">24.</span> Alcance de responsabilidad
            </h2>
            <p>
              Cuenta Hogar será responsable por las obligaciones que asuma expresamente en cada servicio, conforme a la documentación aplicable y a la normativa vigente.
            </p>
            <p>
              Ninguna disposición de estos Términos podrá interpretarse como una renuncia o limitación de derechos que la legislación reconozca al consumidor con carácter irrenunciable.
            </p>
            <p className="text-zinc-400">
              Los hechos atribuibles a proveedores, fabricantes, servicios técnicos, aseguradoras u otros terceros se analizarán de acuerdo con el rol efectivo de cada participante y las normas aplicables.
            </p>
          </section>

          {/* 25 */}
          <section id="fuerza-mayor" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">25.</span> Situaciones extraordinarias
            </h2>
            <p>
              Los plazos y recorridos pueden verse afectados por circunstancias extraordinarias o ajenas razonablemente al control operativo de Cuenta Hogar.
            </p>
            <p className="text-zinc-400">
              En esas situaciones se procurará informar al cliente y reprogramar la prestación cuando corresponda, respetando los derechos que resulten aplicables.
            </p>
          </section>

          {/* 26 */}
          <section id="jurisdiccion" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">26.</span> Legislación aplicable y resolución de controversias
            </h2>
            <p>
              Estos Términos se rigen por las leyes de la República Argentina.
            </p>
            <p>
              En caso de controversia, serán competentes las autoridades administrativas o judiciales que correspondan conforme a la normativa aplicable y a los derechos del consumidor.
            </p>
            <p className="text-zinc-400">
              Nada de lo establecido en estos Términos implica una renuncia a una jurisdicción o derecho que la legislación determine como irrenunciable.
            </p>
          </section>

          {/* 27 */}
          <section id="particulares" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">27.</span> Condiciones particulares de cada operación
            </h2>
            <p>
              Estos Términos establecen las condiciones generales de los servicios de Cuenta Hogar.
            </p>
            <p className="font-bold text-white">Cada operación podrá contar con:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>Propuesta;</li>
              <li>Contrato de mandato;</li>
              <li>Plan de cuotas;</li>
              <li>Pagaré u otros instrumentos de garantía;</li>
              <li>Condiciones logísticas;</li>
              <li>Y demás documentación específica.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              En caso de existir condiciones particulares válidamente acordadas para una operación, estas complementarán los presentes Términos, siempre dentro del marco de la normativa aplicable y sin afectar derechos irrenunciables del consumidor.
            </p>
          </section>

          {/* 28 */}
          <section id="actualizaciones" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">28.</span> Actualización de los Términos
            </h2>
            <p>
              Cuenta Hogar podrá actualizar estos Términos cuando resulte necesario por cambios en sus servicios, operatoria o normativa aplicable.
            </p>
            <p>
              La versión vigente estará publicada en este sitio con indicación de la fecha de última actualización.
            </p>
            <p className="text-zinc-400">
              Las modificaciones no alterarán retroactivamente condiciones particulares ya acordadas cuando ello resulte incompatible con la normativa aplicable.
            </p>
          </section>

        </article>

        {/* PIE DE PÁGINA CON DATOS DEL PRESTADOR */}
        <footer className="mt-12 pt-8 border-t border-[#222530] text-center text-xs text-zinc-400 space-y-3 flex flex-col items-center">
          <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-10 sm:h-12 w-auto object-contain mb-1" />
          <p className="font-mono text-[#FFD21A]">Última actualización: {fechaActualizacion}</p>
          <div className="space-y-1 text-zinc-300">
            <p className="font-bold">LOOP GESTIÓN INTEGRAL S.R.L.</p>
            <p>Nombre comercial: Cuenta Hogar</p>
            <p>CUIT: 30-71829384-9 | Domicilio: Caracas 1101, CABA, Argentina</p>
          </div>
        </footer>

      </main>
    </div>
  );
}
