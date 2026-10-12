import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, RotateCcw } from "lucide-react";

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
            <FileText className="w-3.5 h-3.5" /> VERSIÓN 1.0 — OCTUBRE DE 2026
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Términos y Condiciones Generales
          </h1>
          <p className="text-xs sm:text-sm text-amber-400 font-mono">
            BORRADOR PARA REVISIÓN JURÍDICA — NO APTO TODAVÍA PARA PUBLICACIÓN DEFINITIVA
          </p>

          <div className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
            <p>
              Los presentes Términos y Condiciones Generales regulan la utilización de los servicios ofrecidos bajo la marca comercial <strong className="text-[#FFD21A]">Cuenta Hogar</strong>, operada por <strong className="text-white">LOOP GESTIÓN INTEGRAL S.R.L.</strong>, con domicilio en Caracas 1101, Ciudad Autónoma de Buenos Aires, República Argentina, CUIT <strong className="text-white">[PENDIENTE DE ASIGNACIÓN]</strong>.
            </p>
            <p>
              Canal oficial de atención actualmente informado: <strong className="text-[#FFD21A]">WhatsApp 11-2565-9686</strong>.
            </p>
          </div>
        </header>

        {/* ÍNDICE RÁPIDO NAVEGABLE */}
        <nav className="bg-[#161922] border border-[#222530] p-4 sm:p-5 rounded-2xl space-y-3">
          <h2 className="text-xs font-mono font-bold text-[#FFD21A] uppercase tracking-wider">
            Índice de Secciones (34 Puntos)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-zinc-400">
            <a href="#identificacion" className="hover:text-white transition-colors">1. Identificación</a>
            <a href="#objeto" className="hover:text-white transition-colors">2. Objeto y naturaleza</a>
            <a href="#solicitud" className="hover:text-white transition-colors">3. Solicitud del cliente</a>
            <a href="#propuesta" className="hover:text-white transition-colors">4. Propuesta particular</a>
            <a href="#aceptacion-propuesta" className="hover:text-white transition-colors">5. Aceptación de propuesta</a>
            <a href="#disponibilidad" className="hover:text-white transition-colors">6. Disponibilidad y stock</a>
            <a href="#compra-proveedor" className="hover:text-white transition-colors">7. Compra al proveedor</a>
            <a href="#sena" className="hover:text-white transition-colors">8. Seña o pago anticipado</a>
            <a href="#plan-pagos" className="hover:text-white transition-colors">9. Plan de pagos</a>
            <a href="#vencimientos" className="hover:text-white transition-colors">10. Vencimientos</a>
            <a href="#medios-pago" className="hover:text-white transition-colors">11. Medios de pago</a>
            <a href="#registracion-pagos" className="hover:text-white transition-colors">12. Registración de pagos</a>
            <a href="#seguimiento" className="hover:text-white transition-colors">13. Seguimiento cumplimiento</a>
            <a href="#incumplimientos" className="hover:text-white transition-colors">14. Incumplimientos y regularización</a>
            <a href="#pagare" className="hover:text-white transition-colors">15. Pagaré de garantía</a>
            <a href="#recepcion-traslado" className="hover:text-white transition-colors">16. Recepción, traslado y entrega</a>
            <a href="#recepcion-producto" className="hover:text-white transition-colors">17. Recepción del producto</a>
            <a href="#garantias" className="hover:text-white transition-colors">18. Garantías y fallas</a>
            <a href="#danos-transporte" className="hover:text-white transition-colors">19. Daños en transporte</a>
            <a href="#revocacion" className="hover:text-white transition-colors">20. Derecho de revocación</a>
            <a href="#cancelacion-antes-compra" className="hover:text-white transition-colors">21. Cancelación previa a compra</a>
            <a href="#cambio-producto" className="hover:text-white transition-colors">22. Cambio de producto</a>
            <a href="#vendedores" className="hover:text-white transition-colors">23. Vendedores afiliados</a>
            <a href="#comunicaciones" className="hover:text-white transition-colors">24. Comunicaciones</a>
            <a href="#datos-personales" className="hover:text-white transition-colors">25. Datos personales</a>
            <a href="#informacion-terceros" className="hover:text-white transition-colors">26. Información a proveedores</a>
            <a href="#seguridad" className="hover:text-white transition-colors">27. Seguridad e identidad</a>
            <a href="#documentacion-electronica" className="hover:text-white transition-colors">28. Documentación electrónica</a>
            <a href="#prevalencia" className="hover:text-white transition-colors">29. Prevalencia de particulares</a>
            <a href="#modificaciones" className="hover:text-white transition-colors">30. Modificaciones de términos</a>
            <a href="#legislacion" className="hover:text-white transition-colors">31. Legislación aplicable</a>
            <a href="#jurisdiccion" className="hover:text-white transition-colors">32. Jurisdicción y consumidor</a>
            <a href="#canales-contacto" className="hover:text-white transition-colors">33. Canales de contacto</a>
            <a href="#aceptacion-general" className="hover:text-white transition-colors">34. Aceptación general</a>
          </div>
        </nav>

        {/* ARTÍCULO DE SECCIONES LEGALES */}
        <article className="space-y-6 text-xs sm:text-sm leading-relaxed text-zinc-300">
          
          {/* 1. IDENTIFICACIÓN */}
          <section id="identificacion" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">1.</span> Identificación
            </h2>
            <p>
              Los presentes Términos y Condiciones Generales regulan la utilización de los servicios ofrecidos bajo la marca comercial <strong className="text-[#FFD21A]">Cuenta Hogar</strong>, operada por <strong className="text-white">LOOP GESTIÓN INTEGRAL S.R.L.</strong>, con domicilio en <strong className="text-white">Caracas 1101, Ciudad Autónoma de Buenos Aires, República Argentina</strong>, CUIT <strong className="text-white">[PENDIENTE DE ASIGNACIÓN]</strong>, en adelante indistintamente “LOOP”, “Cuenta Hogar” o la “Empresa”.
            </p>
            <p className="font-bold text-white pt-1">Canal de atención actualmente informado:</p>
            <p className="text-[#FFD21A] font-mono font-bold">WhatsApp: 11-2565-9686</p>
            <p className="text-zinc-400 pt-1">
              El correo electrónico institucional, una vez habilitado, será incorporado a estos Términos y Condiciones y a los canales oficiales de contacto.
            </p>
          </section>

          {/* 2. OBJETO Y NATURALEZA DEL SERVICIO */}
          <section id="objeto" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">2.</span> Objeto y naturaleza del servicio
            </h2>
            <p>
              Cuenta Hogar presta un servicio de <strong className="text-white">gestión integral de compras por mandato</strong>, destinado principalmente a facilitar a sus clientes la adquisición de bienes ofrecidos por proveedores terceros.
            </p>
            <p className="font-bold text-amber-400">
              Cuenta Hogar no actúa como vendedor del bien adquirido por el cliente, salvo que en alguna operación futura se indique expresamente lo contrario.
            </p>
            <p>
              En las operaciones comprendidas en estos Términos, el cliente encomienda a LOOP la gestión de una compra determinada y LOOP utiliza fondos propios para realizar el pago al proveedor, por cuenta de la operación encomendada.
            </p>
            <p>
              El proveedor tercero deberá emitir, cuando corresponda conforme a la operación y normativa aplicable, la factura o comprobante de adquisición <strong className="text-white">a nombre del cliente</strong>.
            </p>
            <p className="text-zinc-400 pt-1">
              El cliente posteriormente reintegra a LOOP el capital aplicado a la compra y abona los servicios, gastos y demás conceptos que hayan sido previamente informados y aceptados en la propuesta particular correspondiente.
            </p>
          </section>

          {/* 3. SOLICITUD DEL CLIENTE */}
          <section id="solicitud" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">3.</span> Solicitud del cliente
            </h2>
            <p className="font-bold text-white">El proceso podrá comenzar mediante:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>el sitio web de Cuenta Hogar;</li>
              <li>WhatsApp;</li>
              <li>un vendedor afiliado autorizado;</li>
              <li>otros canales que LOOP habilite expresamente.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              La solicitud inicial del cliente no obliga por sí misma a LOOP a realizar ninguna compra ni implica reserva automática de stock.
            </p>
            <p className="font-bold text-white pt-1">Cuenta Hogar podrá solicitar la información razonablemente necesaria para:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>identificar al cliente;</li>
              <li>conocer el producto requerido;</li>
              <li>analizar la viabilidad de la operación;</li>
              <li>confeccionar alternativas;</li>
              <li>organizar la compra, traslado y entrega;</li>
              <li>cumplir obligaciones legales, contables, administrativas y de prevención de fraude.</li>
            </ul>
          </section>

          {/* 4. PROPUESTA PARTICULAR */}
          <section id="propuesta" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">4.</span> Propuesta particular
            </h2>
            <p>
              Antes de realizar la compra, Cuenta Hogar presentará al cliente una propuesta particular que podrá contener, según corresponda:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>producto, marca y modelo;</li>
              <li>condición de nuevo o usado y características relevantes;</li>
              <li>precio o capital necesario para la compra e importe total de la operación;</li>
              <li>cantidad e importe de las cuotas;</li>
              <li>seña, si correspondiera, y fechas o reglas de vencimiento;</li>
              <li>plazo estimado y condiciones logísticas;</li>
              <li>servicios asociados y demás condiciones particulares aplicables.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              La propuesta tendrá la vigencia que en ella se indique. Hasta que una propuesta haya sido expresamente aceptada por el cliente, <strong className="text-white">Cuenta Hogar no realizará el encargo definitivo al proveedor ni reservará stock en nombre de la operación</strong>, salvo que se informe expresamente otra modalidad.
            </p>
          </section>

          {/* 5. ACEPTACIÓN DE LA PROPUESTA */}
          <section id="aceptacion-propuesta" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">5.</span> Aceptación de la propuesta
            </h2>
            <p>
              La aceptación podrá instrumentarse mediante mecanismos electrónicos habilitados por Cuenta Hogar, incluyendo validación de identidad, código de verificación u OTP enviado al cliente y otros mecanismos razonables de autenticación.
            </p>
            <p className="font-bold text-white pt-1">La aceptación electrónica podrá registrar, con fines de prueba, seguridad y trazabilidad:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>fecha y hora;</li>
              <li>versión de la propuesta;</li>
              <li>identificación del cliente;</li>
              <li>código o mecanismo de validación utilizado;</li>
              <li>dirección IP, dispositivo o navegador;</li>
              <li>datos técnicos razonablemente necesarios para acreditar el proceso.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              La aceptación de una propuesta determina las condiciones particulares de esa operación. Una propuesta aceptada <strong className="text-white">no podrá ser modificada unilateralmente por Cuenta Hogar</strong>. Toda modificación sustancial posterior requerirá una nueva propuesta y una nueva aceptación expresa del cliente. Los derechos legales de revocación o arrepentimiento del consumidor permanecen plenamente vigentes.
            </p>
          </section>

          {/* 6. DISPONIBILIDAD, STOCK Y VARIACIONES DE PRECIO */}
          <section id="disponibilidad" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">6.</span> Disponibilidad, stock y variaciones de precio
            </h2>
            <p>
              Los precios y la disponibilidad de productos dependen de proveedores terceros y pueden variar hasta el momento en que la compra sea efectivamente concretada.
            </p>
            <p>
              Si luego de la aceptación de la propuesta y antes de concretarse la compra: el producto quedara sin stock, el proveedor modificara sustancialmente el precio, el proveedor cancelara la operación, el producto dejara de encontrarse disponible o apareciera cualquier circunstancia que impidiera cumplir la propuesta aceptada, <strong className="text-[#FFD21A]">Cuenta Hogar no podrá sustituir unilateralmente el producto, aumentar el precio ni modificar el plan acordado</strong>.
            </p>
            <p className="font-bold text-white pt-1">En tal supuesto, el cliente podrá optar entre:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li><strong>a)</strong> recibir la devolución de las sumas que hubiera abonado respecto de esa operación; o</li>
              <li><strong>b)</strong> evaluar una nueva propuesta por un producto similar o alternativo (requerirá siempre aceptación expresa de una nueva propuesta).</li>
            </ul>
          </section>

          {/* 7. COMPRA AL PROVEEDOR */}
          <section id="compra-proveedor" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">7.</span> Compra al proveedor
            </h2>
            <p>
              Una vez cumplidas las condiciones necesarias para avanzar, LOOP gestionará la adquisición solicitada ante un proveedor tercero. El proveedor será identificado en la documentación de la operación cuando corresponda.
            </p>
            <p>
              Cuenta Hogar solicitará al proveedor que la factura o comprobante de compra sea emitido a nombre del cliente.
            </p>
            <p className="text-zinc-400">
              LOOP podrá abonar al proveedor utilizando fondos propios y posteriormente requerirá al cliente el reintegro del capital y el pago de los servicios asociados conforme a la propuesta y al contrato particular aceptado. La utilización de fondos propios por LOOP no transforma por sí sola a la Empresa en vendedora del producto adquirido.
            </p>
          </section>

          {/* 8. SEÑA O PAGO ANTICIPADO */}
          <section id="sena" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">8.</span> Seña o pago anticipado
            </h2>
            <p>
              Determinadas propuestas podrán contemplar una seña o pago anticipado. La existencia, monto y oportunidad de pago de la seña deberán estar expresamente indicados en la propuesta aceptada.
            </p>
            <p>
              Cuando exista una seña, ésta será tratada como <strong className="text-white">pago anticipado imputable a la primera cuota de la operación</strong>, salvo que la documentación particular disponga legítimamente otra modalidad. La seña no incrementará por sí misma el valor contractual de la operación ni modificará unilateralmente el importe originalmente establecido para las cuotas.
            </p>
            <p className="text-zinc-400 pt-1">
              Si la compra no pudiera concretarse por causas vinculadas a indisponibilidad del producto, proveedor u otra circunstancia no imputable al cliente, éste podrá optar entre la devolución de la suma abonada o su aplicación a una nueva propuesta expresamente aceptada por él.
            </p>
          </section>

          {/* 9. PLAN DE PAGOS */}
          <section id="plan-pagos" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">9.</span> Plan de pagos
            </h2>
            <p>
              Cada operación contará con un plan de pagos particular. La propuesta y el contrato correspondiente deberán indicar de manera clara:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>importe total;</li>
              <li>cantidad de cuotas e importe de cada cuota;</li>
              <li>vencimientos;</li>
              <li>seña, cuando corresponda;</li>
              <li>conceptos incluidos y cualquier otra condición económica relevante.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              El plan particular aceptado será el que determine las obligaciones económicas de esa operación.
            </p>
          </section>

          {/* 10. VENCIMIENTOS */}
          <section id="vencimientos" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">10.</span> Vencimientos
            </h2>
            <p className="font-bold text-white">Salvo que la propuesta particular establezca legítimamente otra condición:</p>
            <p>
              <strong className="text-[#FFD21A]">Cuota 1:</strong> su vencimiento quedará vinculado a la fecha efectiva de entrega del producto.
            </p>
            <p>
              <strong className="text-[#FFD21A]">Cuota 2:</strong> tendrá el vencimiento expresamente informado y aceptado en la propuesta contractual.
            </p>
            <p>
              <strong className="text-[#FFD21A]">Cuotas siguientes:</strong> conservarán el calendario previsto en el plan aceptado, contemplando los ajustes necesarios para meses que no posean el día equivalente.
            </p>
            <p className="text-zinc-400 pt-1">
              El cronograma concreto entregado al cliente prevalecerá como referencia de cada operación.
            </p>
          </section>

          {/* 11. MEDIOS DE PAGO */}
          <section id="medios-pago" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">11.</span> Medios de pago
            </h2>
            <p className="font-bold text-white">Los medios de pago actualmente habilitados son:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>transferencia bancaria;</li>
              <li>efectivo.</li>
            </ul>
            <p>
              Cuenta Hogar podrá incorporar otros medios y los informará oportunamente. El pago en efectivo a un <strong className="text-white">vendedor afiliado</strong> será válido únicamente cuando dicho vendedor afiliado se encuentre expresamente autorizado por LOOP para recibir el pago correspondiente.
            </p>
            <p className="text-zinc-400 pt-1">
              El cliente deberá recibir o poder consultar una constancia oficial del pago. La sola entrega de dinero a una persona que no se encuentre autorizada por la Empresa no deberá interpretarse automáticamente como pago válido a LOOP. Ante cualquier duda sobre la autorización de un vendedor afiliado para recibir dinero, el cliente podrá verificarla a través del canal oficial de Cuenta Hogar.
            </p>
          </section>

          {/* 12. REGISTRACIÓN DE PAGOS */}
          <section id="registracion-pagos" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">12.</span> Registración de pagos
            </h2>
            <p>
              Los pagos serán registrados en el sistema de Cuenta Hogar y aplicados a las obligaciones correspondientes. Los pagos parciales no implicarán quita, condonación ni modificación automática del saldo restante.
            </p>
            <p className="text-zinc-400">
              Cuando exista un pago pendiente de comprobación o conciliación, podrá identificarse como informado o sujeto a validación hasta que se verifique efectivamente su recepción. Una vez acreditado, el pago se imputará conforme a las reglas vigentes de la operación.
            </p>
          </section>

          {/* 13. SEGUIMIENTO DEL CUMPLIMIENTO */}
          <section id="seguimiento" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">13.</span> Seguimiento del cumplimiento
            </h2>
            <p>
              Cuenta Hogar utiliza un mecanismo de evaluación del cumplimiento basado en el monto acumulado exigible de la operación.
            </p>
            <p>
              Para considerar cumplido regularmente un período, los pagos confirmados acumulados deberán alcanzar como mínimo el <strong className="text-[#FFD21A]">ochenta por ciento (80%) del importe exigible acumulado</strong> hasta ese momento.
            </p>
            <p className="font-bold text-white pt-1">Alcanzar dicho porcentaje:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>evita que ese vencimiento compute como incumplimiento para este mecanismo de seguimiento;</li>
              <li>no extingue el saldo restante;</li>
              <li>no significa quita ni condonación;</li>
              <li>no modifica el importe total adeudado.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              El saldo restante continuará pendiente hasta su cancelación.
            </p>
          </section>

          {/* 14. INCUMPLIMIENTOS CONSECUTIVOS Y PERÍODO DE REGULARIZACIÓN */}
          <section id="incumplimientos" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">14.</span> Incumplimientos consecutivos y período de regularización
            </h2>
            <p>
              Cuando el cliente no alcance el porcentaje mínimo de cumplimiento indicado durante <strong className="text-white">dos vencimientos consecutivos</strong>, se activará un período de regularización de <strong className="text-[#FFD21A]">diez (10) días corridos</strong>.
            </p>
            <p>
              Durante dicho período el cliente podrá regularizar su situación alcanzando, como mínimo, el porcentaje exigido sobre el monto acumulado correspondiente. Si lo hace dentro del plazo previsto, la situación será considerada regularizada a los fines del seguimiento contractual.
            </p>
            <p>
              Si vence el período sin alcanzarse dicho nivel, la operación podrá registrarse como incumplida o con período de regularización vencido y Cuenta Hogar podrá iniciar las gestiones administrativas o legales que legítimamente correspondan.
            </p>
            <p className="font-bold text-emerald-400 pt-1">
              Cuenta Hogar no aplica actualmente intereses ni punitorios moratorios automáticos dentro de este mecanismo.
            </p>
            <p className="text-zinc-400">
              Ningún recargo futuro podrá ser aplicado retroactivamente ni incorporado sin la información, documentación y fundamento contractual que legalmente corresponda.
            </p>
          </section>

          {/* 15. PAGARÉ */}
          <section id="pagare" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">15.</span> Pagaré de garantía
            </h2>
            <p>
              Como condición de formalización de las operaciones de gestión de compra que así lo prevean, y salvo excepción expresamente aprobada por LOOP, el cliente deberá suscribir un <strong className="text-white">pagaré</strong> como instrumento de garantía de las obligaciones asumidas.
            </p>
            <p className="font-bold text-amber-400">
              Para el modelo operativo actual de Cuenta Hogar, la suscripción del pagaré será obligatoria.
            </p>
            <p className="font-bold text-white pt-1">El pagaré deberá:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>identificar correctamente a las partes;</li>
              <li>expresar el importe correspondiente;</li>
              <li>cumplir los requisitos legales aplicables;</li>
              <li>guardar coherencia con la obligación documentada;</li>
              <li>ser emitido junto con la documentación contractual correspondiente.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              La existencia del pagaré no modifica ni elimina los derechos que la normativa imperativa reconozca al consumidor.
            </p>
          </section>

          {/* 16. RECEPCIÓN, TRASLADO Y ENTREGA */}
          <section id="recepcion-traslado" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">16.</span> Recepción, traslado y entrega
            </h2>
            <p>
              Cuenta Hogar podrá recibir el producto adquirido en su centro operativo o coordinar su retiro o recepción según la modalidad aplicable. Luego organizará su transporte y entrega al domicilio o punto acordado con el cliente.
            </p>
            <p className="text-zinc-400">
              Los plazos de entrega comunicados antes de la adquisición podrán ser estimativos cuando dependan de: disponibilidad del proveedor, tiempos de preparación, condiciones de ruta, eventos climáticos, restricciones de circulación, fuerza mayor u otras circunstancias objetivas no controlables razonablemente por Cuenta Hogar. Cuenta Hogar deberá informar al cliente cualquier modificación relevante que afecte la entrega.
            </p>
          </section>

          {/* 17. RECEPCIÓN DEL PRODUCTO */}
          <section id="recepcion-producto" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">17.</span> Recepción del producto por el cliente
            </h2>
            <p className="font-bold text-white">Al momento de la entrega podrán registrarse:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>fecha y hora;</li>
              <li>receptor e identidad del receptor;</li>
              <li>firma o conformidad;</li>
              <li>fotografías, observaciones y estado exterior del embalaje o producto.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              La recepción sin observaciones podrá constituir evidencia de que no se detectaron daños exteriores manifiestos al momento de entrega. <strong className="text-white">No implica renuncia del cliente a garantías legales, reclamos por vicios ocultos ni demás derechos reconocidos por la legislación aplicable.</strong>
            </p>
          </section>

          {/* 18. GARANTÍAS Y FALLAS DEL PRODUCTO */}
          <section id="garantias" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">18.</span> Garantías y fallas del producto
            </h2>
            <p>
              Los productos adquiridos a proveedores terceros se encuentran sujetos a las garantías legales y, cuando correspondan, a las garantías comerciales ofrecidas por fabricante, importador, distribuidor o vendedor. Cuenta Hogar no es un servicio técnico ni realiza por sí misma reparaciones de fábrica.
            </p>
            <p className="font-bold text-white pt-1">Sin perjuicio de los derechos legales del consumidor, Cuenta Hogar podrá brindar apoyo de gestión para:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>identificar el canal de garantía y comunicar el reclamo;</li>
              <li>coordinar documentación y gestionar administrativamente el caso;</li>
              <li>organizar, cuando esté incluido en el servicio contratado, el traslado hacia un service técnico habilitado y su posterior retorno.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              Ninguna disposición de estos Términos tiene por objeto excluir, limitar o renunciar a derechos de garantía, saneamiento o responsabilidad que resulten obligatorios conforme a la legislación aplicable.
            </p>
          </section>

          {/* 19. DAÑOS DURANTE EL TRANSPORTE */}
          <section id="danos-transporte" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">19.</span> Daños durante el transporte
            </h2>
            <p>
              Cuenta Hogar será responsable por el servicio de transporte y custodia dentro de los alcances que correspondan legalmente y según las circunstancias concretas de cada caso.
            </p>
            <p className="text-zinc-400">
              Cuando se detecten daños visibles en la recepción, traslado o entrega, podrán generarse registros fotográficos y una incidencia operativa. El cliente deberá comunicar cualquier daño o irregularidad tan pronto como razonablemente sea posible para facilitar su constatación y gestión, sin que ello implique renuncia a los plazos o derechos legales que resulten aplicables.
            </p>
          </section>

          {/* 20. DERECHO DE REVOCACIÓN O ARREPENTIMIENTO */}
          <section id="revocacion" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">20.</span> Derecho de revocación o arrepentimiento
            </h2>
            <p>
              Cuando la contratación sea celebrada a distancia y resulte aplicable la normativa de consumo, el cliente consumidor contará con el derecho irrenunciable de revocar su aceptación dentro del plazo legal vigente. Actualmente, el plazo general es de <strong className="text-white">diez (10) días</strong>, computado de acuerdo con las reglas previstas por la Ley de Defensa del Consumidor y el Código Civil y Comercial de la Nación.
            </p>
            <p>
              El ejercicio de este derecho no podrá implicar gastos para el consumidor en los casos y alcances previstos legalmente. Cuenta Hogar dispondrá en su sitio web del mecanismo de <strong className="text-[#FFD21A]">Botón de Arrepentimiento</strong> exigido por la normativa vigente. No se exigirá una nueva registración para iniciar la solicitud.
            </p>
            <p className="text-zinc-400">
              Las excepciones legales al derecho de revocación serán las previstas por la normativa vigente y no podrán ampliarse unilateralmente por estos Términos.
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

          {/* 21. CANCELACIÓN DE UNA OPERACIÓN ANTES DE LA COMPRA */}
          <section id="cancelacion-antes-compra" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">21.</span> Cancelación de una operación antes de la compra
            </h2>
            <p>
              Mientras la compra ante el proveedor aún no haya sido ejecutada, cualquier solicitud de cancelación será analizada considerando: el estado de la operación, el derecho de revocación legal cuando corresponda, los fondos efectivamente aplicados, las obligaciones ya asumidas frente a terceros y los derechos irrenunciables del consumidor.
            </p>
            <p className="text-zinc-400">
              Cuenta Hogar no utilizará esta cláusula para restringir derechos legales de revocación.
            </p>
          </section>

          {/* 22. CAMBIO DE PRODUCTO */}
          <section id="cambio-producto" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">22.</span> Cambio de producto
            </h2>
            <p>
              Cuenta Hogar no podrá reemplazar unilateralmente el producto aceptado por otro diferente. Si el producto contratado deja de estar disponible, podrá ofrecerse una alternativa similar.
            </p>
            <p className="text-zinc-400">
              El cliente tendrá libertad de aceptar la nueva propuesta, rechazarla o solicitar la devolución correspondiente cuando proceda. La falta de aceptación de una nueva propuesta no implicará aceptación tácita.
            </p>
          </section>

          {/* 23. VENDEDORES AFILIADOS */}
          <section id="vendedores" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">23.</span> Vendedores afiliados
            </h2>
            <p>
              Cuenta Hogar podrá operar mediante vendedores afiliados en distintas localidades.
            </p>
            <p className="font-bold text-white">El vendedor afiliado podrá:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-300">
              <li>facilitar el contacto y acompañar el proceso de solicitud;</li>
              <li>transmitir información autorizada y asistir al cliente;</li>
              <li>recibir pagos únicamente cuando LOOP lo haya autorizado expresamente.</li>
            </ul>
            <p className="text-zinc-400 pt-1">
              El vendedor afiliado no podrá modificar por cuenta propia precios, propuestas, planes, contratos, vencimientos, descuentos ni condiciones comerciales. Ninguna promesa o modificación realizada sin autorización de LOOP alterará automáticamente la documentación contractual vigente.
            </p>
          </section>

          {/* 24. COMUNICACIONES */}
          <section id="comunicaciones" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">24.</span> Comunicaciones
            </h2>
            <p>
              Cuenta Hogar podrá comunicarse con el cliente mediante los canales que éste haya informado o utilizado durante la relación, incluyendo WhatsApp, teléfono, portal del cliente y otros medios habilitados.
            </p>
            <p className="text-zinc-400">
              Las comunicaciones relevantes relativas a propuestas, aceptación, pagos, entrega y documentación podrán conservarse como parte de la trazabilidad de la operación. Cuando la legislación requiera una forma específica de notificación, se utilizará el medio legalmente correspondiente.
            </p>
          </section>

          {/* 25. DATOS PERSONALES */}
          <section id="datos-personales" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">25.</span> Datos personales
            </h2>
            <p>
              Los datos personales del cliente serán utilizados para finalidades vinculadas a identificación, evaluación y gestión de solicitudes, confección y aceptación de propuestas, celebración y ejecución de contratos, realización de compras, comunicación con proveedores, facturación, logística, cobranzas, seguridad, prevención de fraude, cumplimiento de obligaciones legales, atención de reclamos y ejercicio de derechos.
            </p>
            <p className="text-zinc-400">
              El tratamiento de datos personales se realizará conforme a la Ley N.º 25.326, sus normas reglamentarias y las que en el futuro resulten aplicables.
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

          {/* 26. INFORMACIÓN A PROVEEDORES Y TERCEROS */}
          <section id="informacion-terceros" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">26.</span> Información a proveedores y terceros
            </h2>
            <p>
              Para concretar una compra, Cuenta Hogar podrá comunicar al proveedor tercero los datos necesarios para que éste identifique al comprador, emita la factura a nombre del cliente, prepare la mercadería, coordine la entrega y cumpla obligaciones legales.
            </p>
            <p className="text-zinc-400">
              No deberán comunicarse datos personales ajenos a la finalidad de la operación salvo autorización o habilitación legal.
            </p>
          </section>

          {/* 27. SEGURIDAD E IDENTIDAD */}
          <section id="seguridad" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">27.</span> Seguridad e identidad
            </h2>
            <p>
              Cuenta Hogar podrá utilizar mecanismos razonables de seguridad tales como códigos OTP, validación de DNI, autenticación de usuario, registro de IP, registros técnicos de dispositivo y controles antifraude. Estos mecanismos tienen por finalidad proteger al cliente, a la Empresa y la integridad de las operaciones.
            </p>
          </section>

          {/* 28. DOCUMENTACIÓN ELECTRÓNICA */}
          <section id="documentacion-electronica" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">28.</span> Documentación electrónica
            </h2>
            <p>
              Cuando legalmente corresponda, las propuestas, aceptaciones, comunicaciones y contratos podrán instrumentarse mediante soportes electrónicos. El cliente podrá recibir o consultar copia de la documentación correspondiente a su operación. La utilización de un mecanismo electrónico de aceptación no implica por sí misma renuncia a ningún derecho del consumidor.
            </p>
          </section>

          {/* 29. PREVALENCIA DE CONDICIONES PARTICULARES */}
          <section id="prevalencia" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">29.</span> Prevalencia de condiciones particulares
            </h2>
            <p>
              Cada operación podrá contener condiciones particulares incorporadas en la propuesta aceptada, el contrato de mandato, el plan de pagos y documentación complementaria. Dichas condiciones complementarán estos Términos y Condiciones.
            </p>
            <p className="text-zinc-400">
              En ningún caso podrán interpretarse de manera que eliminen derechos imperativos reconocidos al consumidor. Si existiera una contradicción entre documentos, se aplicará la normativa vigente y la interpretación legalmente procedente.
            </p>
          </section>

          {/* 30. MODIFICACIONES DE ESTOS TÉRMINOS */}
          <section id="modificaciones" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">30.</span> Modificaciones de estos Términos
            </h2>
            <p>
              Cuenta Hogar podrá actualizar estos Términos y Condiciones para operaciones futuras cuando existan cambios normativos, operativos, tecnológicos o comerciales. Las modificaciones no alterarán retroactivamente las condiciones económicas esenciales de operaciones previamente aceptadas.
            </p>
            <p className="text-zinc-400">
              Cada versión deberá contar con fecha o identificación suficiente para determinar cuál resultaba aplicable al momento de una contratación.
            </p>
          </section>

          {/* 31. LEGISLACIÓN APLICABLE */}
          <section id="legislacion" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">31.</span> Legislación aplicable
            </h2>
            <p>
              Estos Términos y las operaciones vinculadas a Cuenta Hogar se regirán por la legislación de la República Argentina, incluyendo: Código Civil y Comercial de la Nación, Ley N.º 24.240 de Defensa del Consumidor, Ley N.º 25.326 de Protección de Datos Personales, y normas reglamentarias y complementarias vigentes.
            </p>
          </section>

          {/* 32. JURISDICCIÓN Y DERECHOS DEL CONSUMIDOR */}
          <section id="jurisdiccion" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">32.</span> Jurisdicción y derechos del consumidor
            </h2>
            <p>
              Nada en estos Términos pretende obligar al consumidor a litigar en una jurisdicción distinta de la que legalmente corresponda. En relaciones de consumo celebradas a distancia, resultarán aplicables las reglas legales de jurisdicción, competencia y lugar de cumplimiento. Los mecanismos administrativos y judiciales de protección al consumidor permanecerán disponibles conforme a la normativa aplicable.
            </p>
          </section>

          {/* 33. CANALES DE CONTACTO */}
          <section id="canales-contacto" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">33.</span> Canales de contacto
            </h2>
            <div className="space-y-1 text-zinc-300">
              <p><strong className="text-white">Cuenta Hogar — LOOP GESTIÓN INTEGRAL S.R.L.</strong></p>
              <p>Domicilio: <span className="text-white">Caracas 1101, Ciudad Autónoma de Buenos Aires</span></p>
              <p>CUIT: <span className="text-white">[PENDIENTE DE ASIGNACIÓN]</span></p>
              <p>WhatsApp oficial: <span className="text-[#FFD21A]">11-2565-9686</span></p>
              <p>Correo electrónico: <span className="text-zinc-400">[PENDIENTE DE HABILITACIÓN]</span></p>
              <p>Sitio web: <span className="text-white">Cuenta Hogar</span></p>
            </div>
          </section>

          {/* 34. ACEPTACIÓN GENERAL */}
          <section id="aceptacion-general" className="bg-[#161922] border border-[#222530] p-5 sm:p-6 rounded-2xl space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="text-[#FFD21A] font-mono">34.</span> Aceptación
            </h2>
            <p>
              La contratación de una operación concreta requerirá la aceptación expresa que corresponda conforme al procedimiento utilizado.
            </p>
            <p className="font-bold text-white">
              La simple navegación por el sitio web de Cuenta Hogar no implica la celebración automática de un contrato ni aceptación de una propuesta comercial.
            </p>
            <p className="text-zinc-400">
              La propuesta particular, su aceptación registrada, el contrato de mandato y demás documentos correspondientes determinarán el alcance concreto de cada operación.
            </p>
          </section>

        </article>

        {/* PIE DE PÁGINA CON DATOS DEL PRESTADOR */}
        <footer className="mt-12 pt-8 border-t border-[#222530] text-center text-xs text-zinc-400 space-y-3 flex flex-col items-center">
          <img src="/logo-cuenta-hogar-oficial.png" alt="Cuenta Hogar Logo" className="h-10 sm:h-12 w-auto object-contain mb-1" />
          <p className="font-mono text-[#FFD21A]">Versión 1.0 — Octubre de 2026 | Última actualización: {fechaActualizacion}</p>
          <div className="space-y-1 text-zinc-300">
            <p className="font-bold">LOOP GESTIÓN INTEGRAL S.R.L.</p>
            <p>Nombre comercial: Cuenta Hogar</p>
            <p>CUIT: [PENDIENTE DE ASIGNACIÓN] | Domicilio: Caracas 1101, CABA, Argentina</p>
          </div>
        </footer>

      </main>
    </div>
  );
}
