import { jsPDF } from "jspdf";

export const generarContrato = (solicitud: any) => {
  const doc = new jsPDF();
  const nombre = solicitud.datosPersonales?.nombreCompleto || "Cliente";
  const dni = solicitud.datosPersonales?.numeroDni || "S/D";
  const domicilio = `${solicitud.datosPersonales?.direccion || ""}, ${solicitud.datosPersonales?.localidad || ""}`;
  const producto = solicitud.productoDeseado || "S/D";
  const plan = solicitud.planElegido || "0";
  const cuota = solicitud.montoCuota || 0;
  const total = plan * cuota;
  const fecha = new Date().toLocaleDateString("es-AR");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRATO DE COMPRAVENTA EN CUOTAS", 105, 20, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  let y = 40;
  doc.text(`En el día de la fecha ${fecha}, se celebra el presente contrato entre ELECTRO EN CUOTAS`, 20, y); y+=7;
  doc.text(`(en adelante "EL AFILIADO") y el Sr/a. ${nombre}, DNI ${dni},`, 20, y); y+=7;
  doc.text(`con domicilio en ${domicilio} (en adelante "EL COMPRADOR").`, 20, y); y+=15;
  
  doc.setFont("helvetica", "bold");
  doc.text("1. OBJETO DEL CONTRATO:", 20, y); y+=7;
  doc.setFont("helvetica", "normal");
  doc.text(`EL AFILIADO entrega a EL COMPRADOR, quien acepta de conformidad, un(a) ${producto}.`, 20, y); y+=15;
  
  doc.setFont("helvetica", "bold");
  doc.text("2. PRECIO Y FORMA DE PAGO:", 20, y); y+=7;
  doc.setFont("helvetica", "normal");
  doc.text(`El precio total financiado de la venta es de $${total}.`, 20, y); y+=7;
  doc.text(`El mismo será abonado en ${plan} cuotas mensuales, iguales y consecutivas de $${cuota}.`, 20, y); y+=15;
  
  doc.setFont("helvetica", "bold");
  doc.text("3. CONDICIONES GENERALES:", 20, y); y+=7;
  doc.setFont("helvetica", "normal");
  const legales = doc.splitTextToSize(`La falta de pago de una cuota a su vencimiento producirá la mora automática sin necesidad de interpelación alguna, devengando un interés punitorio diario sujeto a las condiciones vigentes al momento del atraso. EL COMPRADOR suscribe en garantía un pagaré por el total de la deuda.`, 170);
  doc.text(legales, 20, y); y += (legales.length * 7) + 20;

  doc.text("_____________________________________", 20, y);
  doc.text("_____________________________________", 120, y); y+=7;
  doc.text("Firma de EL AFILIADO", 30, y);
  doc.text("Firma de EL COMPRADOR", 130, y); y+=7;
  doc.text(`Aclaración: _________________________`, 120, y);
  
  doc.save(`Contrato_${nombre.replace(/\s/g,"_")}.pdf`);
};

export const generarPagare = (solicitud: any) => {
  const doc = new jsPDF();
  const nombre = solicitud.datosPersonales?.nombreCompleto || "Cliente";
  const dni = solicitud.datosPersonales?.numeroDni || "S/D";
  const domicilio = `${solicitud.datosPersonales?.direccion || ""}, ${solicitud.datosPersonales?.localidad || ""}`;
  const producto = solicitud.productoDeseado || "S/D";
  const plan = solicitud.planElegido || "0";
  const cuota = solicitud.montoCuota || 0;
  const total = plan * cuota;
  const fecha = new Date().toLocaleDateString("es-AR");

  doc.setFont("helvetica", "bold");
  doc.text("PAGARE A LA VISTA SIN PROTESTO", 105, 20, { align: "center" });
  
  doc.setFontSize(14);
  doc.text(`POR $ ${total}`, 160, 40);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  let y = 60;
  doc.text(`Lugar y fecha de emisión: ____________________, ${fecha}`, 20, y); y+=15;
  
  doc.text(`Por este PAGARE me/nos comprometemos incondicionalmente a pagar a la orden de`, 20, y); y+=7;
  doc.setFont("helvetica", "bold");
  doc.text(`ELECTRO EN CUOTAS`, 20, y); y+=7;
  doc.setFont("helvetica", "normal");
  doc.text(`la cantidad de PESOS: $${total} (Son ${plan} cuotas de $${cuota}).`, 20, y); y+=15;
  
  doc.text(`Por igual valor recibido en electrodomésticos (${producto}) a mi entera satisfacción.`, 20, y); y+=15;
  
  doc.text(`La falta de pago a su presentación producirá la mora automática. Operada la mora, la deuda`, 20, y); y+=7;
  doc.text(`devengará en concepto de interés punitorio la tasa activa máxima vigente en el Banco Nación.`, 20, y); y+=25;
  
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL LIBRADOR / DEUDOR:", 20, y); y+=7;
  doc.setFont("helvetica", "normal");
  doc.text(`Nombre y Apellido: ${nombre}`, 20, y); y+=7;
  doc.text(`Documento de Identidad (DNI): ${dni}`, 20, y); y+=7;
  doc.text(`Domicilio: ${domicilio}`, 20, y); y+=7;
  doc.text(`Teléfono: ${solicitud.datosPersonales?.telefono || ""}`, 20, y); y+=25;
  
  doc.text("Firma: __________________________________________________", 20, y); y+=7;
  doc.text("Aclaración manuscrita: _____________________________________", 20, y);
  
  doc.save(`Pagare_${nombre.replace(/\s/g,"_")}.pdf`);
};
