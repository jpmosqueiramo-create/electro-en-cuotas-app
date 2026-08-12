import { jsPDF } from "jspdf";

export interface DatosContrato {
  nroContrato: string;
  nombreComprador: string;
  dni: string;
  domicilio: string;
  email: string;
  whatsapp: string;
  producto: string;
  nserie: string;
  precioContado: string;
  factorFinanciado: string;
  totalFinanciado: string;
  cuotas: string;
  importeCuota: string;
  primeraCuota: string;
  tnaComp: string;
  tnaPun: string;
  cftEa: string;
  lugarFecha: string;
  cuotasPlan: Array<{
    numero: number;
    vencimiento: string;
    montoOriginal: number;
    observacion?: string;
  }>;
}

export const formatARS = (amount: string | number): string => {
  if (amount === undefined || amount === null || amount === "") return "$ 0";
  
  if (typeof amount === "number") {
    const rounded = Math.round(amount);
    return `$ ${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  }
  
  let clean = amount.replace(/[\$\s]/g, "");
  
  if (clean.includes(",") && clean.indexOf(",") > clean.indexOf(".")) {
    clean = clean.split(",")[0];
  } else if (clean.includes(".") && clean.indexOf(".") > clean.indexOf(",")) {
    clean = clean.split(".")[0];
  }
  
  const finalDigits = clean.replace(/[^0-9-]/g, "");
  const numericVal = parseInt(finalDigits, 10);
  if (isNaN(numericVal)) return "$ 0";
  
  return `$ ${numericVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
};

const drawFormBox = (doc: jsPDF, label: string, value: string, x: number, y: number, w: number, h: number) => {
  // Draw background box in light blue
  doc.setFillColor(219, 234, 254);
  doc.rect(x, y, w, h, "F");
  // Draw border in gray/light blue
  doc.setDrawColor(191, 219, 254);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, "S");
  // Draw label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label, x + 2, y + 3.5);
  // Draw value
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(value || "", x + 2, y + 8.5);
};

export const generarContratoModelo = (datos: DatosContrato) => {
  const doc = new jsPDF();
  const nombre = datos.nombreComprador || "Cliente";
  
  // Page 1
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("CONTRATO DE COMPRAVENTA EN CUOTAS CON RESERVA DE DOMINIO", 15, 15);
  
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Y CONSENTIMIENTO DE BLOQUEO REMOTO — ELECTRO EN CUOTAS — Juan Pablo Mosqueira Morales (CUIT 20-30137724-0) — MONEDA: ARS", 15, 20);
  
  drawFormBox(doc, "N° de contrato / legajo:", datos.nroContrato, 135, 25, 60, 11);
  
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Datos del Contrato", 15, 41);
  
  // Row 1
  drawFormBox(doc, "Comprador/a (Nombre y Apellido):", datos.nombreComprador, 15, 45, 180, 11);
  // Row 2
  drawFormBox(doc, "DNI:", datos.dni, 15, 59, 60, 11);
  drawFormBox(doc, "Domicilio (PBA):", datos.domicilio, 78, 59, 117, 11);
  // Row 3
  drawFormBox(doc, "Email:", datos.email, 15, 73, 95, 11);
  drawFormBox(doc, "WhatsApp:", datos.whatsapp, 113, 73, 82, 11);
  // Row 4
  drawFormBox(doc, "Producto/Bien (tipo y Marca/Modelo):", datos.producto, 15, 87, 180, 11);
  // Row 5
  drawFormBox(doc, "Identificación (IMEI / N° de serie):", datos.nserie, 15, 101, 180, 11);
  // Row 6
  drawFormBox(doc, "Precio de contado ($):", formatARS(datos.precioContado), 15, 115, 90, 11);
  drawFormBox(doc, "Factor financiado:", datos.factorFinanciado, 108, 115, 87, 11);
  // Row 7
  drawFormBox(doc, "Total financiado ($):", formatARS(datos.totalFinanciado), 15, 129, 90, 11);
  drawFormBox(doc, "Cuotas (n):", datos.cuotas, 108, 129, 87, 11);
  // Row 8
  drawFormBox(doc, "Importe por cuota ($):", formatARS(datos.importeCuota), 15, 143, 90, 11);
  drawFormBox(doc, "1ª cuota:", datos.primeraCuota, 108, 143, 87, 11);
  // Row 9
  drawFormBox(doc, "TNA comp. (%):", datos.tnaComp, 15, 157, 58, 11);
  drawFormBox(doc, "TNA pun. (%):", datos.tnaPun, 76, 157, 58, 11);
  drawFormBox(doc, "CFT EA (%):", datos.cftEa, 137, 157, 58, 11);
  // Row 10
  drawFormBox(doc, "Lugar y fecha de firma/entrega:", datos.lugarFecha, 15, 171, 180, 11);

  let y = 190;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Cláusulas", 15, y); y += 5;

  const printClausula = (label: string, text: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const labelLines = doc.splitTextToSize(label, 180);
    labelLines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 25;
      }
      doc.text(line, 15, y);
      y += 4;
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const textLines = doc.splitTextToSize(text, 180);
    textLines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 25;
      }
      doc.text(line, 15, y);
      y += 3.8;
    });
    y += 3;
  };

  printClausula(
    "1) Objeto – Identificación del bien.",
    "El Vendedor entrega al Comprador el/los bien(es) mueble(s) individualizado(s) en los datos del contrato —incluyendo, según corresponda, teléfonos celulares, electrodomésticos y/o dispositivos electrónicos— en correcto funcionamiento."
  );
  printClausula(
    "2) Precio, financiación, cronograma y pagaré.",
    `El Comprador reconoce el precio de contado indicado y el total financiado. El pago se realizará en ${datos.cuotas} cuotas conforme el Cronograma de Vencimientos (Anexo I), aceptando expresamente sus fechas e importes. Para documentar y garantizar el saldo, el Comprador suscribe un pagaré por el monto total, con vencimiento único (día fijo) indicado en dicho título. Los pagos parciales efectuados se imputarán a cuenta del total adeudado y, cancelada íntegramente la obligación, el pagaré será devuelto/cancelado. A los efectos operativos, el pago podrá efectuarse en el lugar de pago (domicilio del Deudor en PBA) y/o mediante transferencia/depósito a la cuenta informada por el Vendedor, lo que se considerará pago válido.`
  );
  printClausula(
    "3) Mora y vencimiento anticipado.",
    "La falta de pago de una cuota por más de cuarenta y cinco (45) días, o el incumplimiento de tres (3) cuotas, faculta al Vendedor a declarar el vencimiento anticipado del saldo impago y a exigir su pago inmediato, con más intereses."
  );
  printClausula(
    "4) Reserva de dominio.",
    "Hasta el pago total, la propiedad del bien queda reservada a favor del Vendedor, quedando el Comprador como poseedor. Si se resuelve la compraventa por mora, el Comprador se obliga a entregar voluntariamente el bien dentro de cinco (5) días hábiles de intimado. De no mediar entrega voluntaria, la restitución forzosa del bien sólo procederá mediante orden judicial. Se prohíbe toda forma de autotutela."
  );
  printClausula(
    "5) Bloqueo remoto por software (consentimiento y preaviso).",
    "El Comprador autoriza la instalación y uso de un mecanismo de gestión/seguridad que permita el bloqueo temporal y reversible de funcionalidades del bien cuando ello sea técnicamente posible —sin borrar datos y manteniendo llamadas de emergencia cuando aplique— exclusivamente ante mora superior a 45 días y previa notificación fehaciente con una antelación mínima de 72 horas a los domicilios constituidos. Regularizada la situación, el Vendedor desactivará el bloqueo de inmediato."
  );
  printClausula(
    "6) Datos personales.",
    "El Comprador presta consentimiento libre, expreso e informado para el tratamiento mínimo y proporcional de los datos estrictamente necesarios para la gestión del crédito y eventual activación técnica del bloqueo (p. ej., IMEI/número de serie, estado de pago, últimos contactos), conforme Ley 25.326. Podrá ejercer derechos de acceso, rectificación y supresión en la casilla del Vendedor. No se recaba geolocalización sin consentimiento adicional."
  );
  printClausula(
    "7) Conservación y prohibiciones.",
    "El Comprador debe conservar el bien, no modificar ni ocultar IMEI/número de serie (si aplica), ni enajenarlo antes del pago total sin autorización escrita del Vendedor."
  );
  printClausula(
    "8) Comunicaciones y domicilios.",
    "El Comprador constituye domicilio físico y electrónico (email/WhatsApp). Las notificaciones cursadas a dichos domicilios se tendrán por fehacientes."
  );
  printClausula(
    "9) Cesión.",
    "El Vendedor podrá ceder/endosar el crédito y el pagaré, notificándolo por los medios del punto 8."
  );
  printClausula(
    "10) Garantía legal.",
    "El bien nuevo goza de garantía legal de seis (6) meses —tres (3) si usado—, sin perjuicio de garantías comerciales adicionales que se entreguen por escrito."
  );
  printClausula(
    "11) Identificación y reporte de robo/hurto.",
    "El Vendedor no reportará el bien como robado/hurtado por mora. Cualquier gestión de bloqueo por identificadores (IMEI/serie) será la que corresponda por normativa y únicamente para los supuestos previstos para ello."
  );
  printClausula(
    "12) Jurisdicción y ley aplicable.",
    "Se aplican las leyes de la República Argentina y resultará competente el fuero del domicilio del consumidor, o el que corresponda por normativa vigente."
  );

  // Signatures
  if (y > 230) {
    doc.addPage();
    y = 25;
  }
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Firmas", 15, y); y += 15;
  
  doc.setDrawColor(148, 163, 184);
  doc.line(15, y, 90, y);
  doc.line(115, y, 190, y); y += 5;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Vendedor:", 15, y);
  doc.text("Comprador/a:", 115, y); y += 15;

  const aclaracion = doc.splitTextToSize("Aclaración: Modelo referencial. Revise y adecúe con su asesoría legal. El retiro físico del bien sólo por entrega voluntaria o mediante orden judicial. El bloqueo remoto se aplica con consentimiento expreso y preaviso.", 180);
  doc.text(aclaracion, 15, y);

  // Page 3: Anexo I
  doc.addPage();
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`ANEXO I — CRONOGRAMA DE VENCIMIENTOS (${datos.cuotas} CUOTAS)`, 15, 15);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`Completar las ${datos.cuotas} cuotas en forma continua. Moneda: ARS.`, 15, 20);
  
  drawFormBox(doc, "N° de contrato / legajo:", datos.nroContrato, 135, 25, 60, 11);
  
  // Table headers
  let rowY = 42;
  doc.setFillColor(219, 234, 254);
  doc.rect(15, rowY, 180, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("N°", 17, rowY + 5.5);
  doc.text("Fecha vencimiento (dd/mm/aaaa)", 27, rowY + 5.5);
  doc.text("Importe ($)", 92, rowY + 5.5);
  doc.text("Observación", 142, rowY + 5.5);
  
  // Table border line
  doc.setDrawColor(191, 219, 254);
  doc.rect(15, rowY, 180, 8, "S");
  rowY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  
  if (datos.cuotasPlan && datos.cuotasPlan.length > 0) {
    datos.cuotasPlan.forEach((c) => {
      doc.setFillColor(c.numero % 2 === 0 ? 248 : 255, c.numero % 2 === 0 ? 250 : 255, c.numero % 2 === 0 ? 252 : 255);
      doc.rect(15, rowY, 180, 8, "F");
      
      doc.setDrawColor(228, 228, 231);
      doc.rect(15, rowY, 180, 8, "S");
      
      doc.text(String(c.numero).padStart(2, '0'), 17, rowY + 5.5);
      
      const formattedDate = c.vencimiento ? (c.vencimiento.includes("T") ? new Date(c.vencimiento).toLocaleDateString("es-AR") : c.vencimiento) : "";
      doc.text(formattedDate, 27, rowY + 5.5);
      doc.text(formatARS(c.montoOriginal), 92, rowY + 5.5);
      doc.text(c.observacion || "Cuota mensual ordinaria", 142, rowY + 5.5);
      rowY += 8;
    });
  } else {
    const cantCuotas = Number(datos.cuotas) || 12;
    for (let i = 1; i <= cantCuotas; i++) {
      doc.setDrawColor(228, 228, 231);
      doc.rect(15, rowY, 180, 8, "S");
      doc.text(String(i).padStart(2, '0'), 17, rowY + 5.5);
      doc.text("____ / ____ / ________", 27, rowY + 5.5);
      doc.text(formatARS(datos.importeCuota), 92, rowY + 5.5);
      doc.text("Cuota mensual ordinaria", 142, rowY + 5.5);
      rowY += 8;
    }
  }
  
  rowY += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("El Comprador declara haber leído y aceptado el cronograma precedente (Anexo I).", 15, rowY); rowY += 12;
  
  doc.setDrawColor(148, 163, 184);
  doc.line(15, rowY, 115, rowY); rowY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Firma/Iniciales Comprador (Anexo I):", 15, rowY); rowY += 10;
  
  doc.text(`Aclaración y DNI (Anexo I): __________________________________________________`, 15, rowY);
  
  // Footer page numbers on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
  }

  doc.save(`Contrato_${nombre.replace(/\s/g,"_")}.pdf`);
};

export const generarPagareModelo = (datos: DatosContrato) => {
  const doc = new jsPDF();
  const nombre = datos.nombreComprador || "Cliente";
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PAGARE A LA VISTA SIN PROTESTO", 105, 20, { align: "center" });
  
  doc.setFontSize(14);
  doc.text(`POR ${formatARS(datos.totalFinanciado)}`, 155, 35);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  let y = 55;
  doc.text(`Lugar y fecha de emisión: ____________________, ${new Date().toLocaleDateString("es-AR")}`, 15, y); y+=12;
  
  doc.text(`Por este PAGARE me/nos comprometemos incondicionalmente a pagar a la orden de`, 15, y); y+=6;
  doc.setFont("helvetica", "bold");
  doc.text("ELECTRO EN CUOTAS (Juan Pablo Mosqueira Morales)", 15, y); y+=6;
  doc.setFont("helvetica", "normal");
  doc.text(`la cantidad de PESOS (ARS): ${formatARS(datos.totalFinanciado)} (Son ${datos.cuotas} cuotas de ${formatARS(datos.importeCuota)}).`, 15, y); y+=12;
  
  doc.text(`Por igual valor recibido en electrodomésticos (${datos.producto}) a mi entera satisfacción.`, 15, y); y+=12;
  
  const punitorio = datos.tnaPun ? `${datos.tnaPun}% diario` : "la tasa del 0.5% diario";
  doc.text(`La falta de pago a su presentación producirá la mora automática. Operada la mora, la deuda`, 15, y); y+=6;
  doc.text(`devengará en concepto de interés punitorio la tasa del ${punitorio}.`, 15, y); y+=20;
  
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL LIBRADOR / DEUDOR:", 15, y); y+=6;
  doc.setFont("helvetica", "normal");
  doc.text(`Nombre y Apellido: ${datos.nombreComprador}`, 15, y); y+=6;
  doc.text(`Documento de Identidad (DNI): ${datos.dni}`, 15, y); y+=6;
  doc.text(`Domicilio: ${datos.domicilio}`, 15, y); y+=6;
  doc.text(`Teléfono / WhatsApp: ${datos.whatsapp}`, 15, y); y+=20;
  
  doc.text("Firma: __________________________________________________", 15, y); y+=10;
  doc.text("Aclaración manuscrita: _____________________________________", 15, y);
  
  doc.save(`Pagare_${nombre.replace(/\s/g,"_")}.pdf`);
};

export interface DatosRemito {
  nroRemito: string;
  fecha: string;
  clienteNombre: string;
  clienteDni: string;
  clienteDireccion: string;
  clienteTelefono: string;
  productoNombre: string;
  nserie: string;
  origen: string;
  destino: string;
  afiliadoEmail?: string;
}

export const generarRemitoModelo = (datos: DatosRemito) => {
  const doc = new jsPDF();
  const nombre = datos.clienteNombre || "Cliente";

  // Box title
  doc.setFillColor(244, 244, 245);
  doc.rect(15, 15, 180, 20, "F");
  doc.setDrawColor(234, 179, 8); // Yellow/gold border
  doc.setLineWidth(0.5);
  doc.rect(15, 15, 180, 20, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(234, 179, 8);
  doc.text("REMITO DE TRASLADO / ENTREGA DE MERCADERÍA", 20, 23);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("CUENTA HOGAR / ELECTRO EN CUOTAS", 20, 29);

  // Remito numbers & date
  drawFormBox(doc, "Remito N°:", datos.nroRemito, 15, 40, 90, 11);
  drawFormBox(doc, "Fecha Emisión:", datos.fecha, 105, 40, 90, 11);

  // Origen and Destino
  drawFormBox(doc, "Origen de Stock (Despacho):", datos.origen, 15, 54, 90, 11);
  drawFormBox(doc, "Destino (Localidad del Cliente):", datos.destino, 105, 54, 90, 11);

  // Destinatario
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Datos del Destinatario", 15, 75);

  drawFormBox(doc, "Destinatario (Nombre / Vendedor / Afiliado):", datos.clienteNombre, 15, 79, 180, 11);
  drawFormBox(doc, "DNI / CUIT:", datos.clienteDni, 15, 93, 60, 11);
  drawFormBox(doc, "Teléfono / WhatsApp:", datos.clienteTelefono, 78, 93, 117, 11);
  drawFormBox(doc, "Dirección de Entrega:", datos.clienteDireccion, 15, 107, 180, 11);

  // Product Detail
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Detalle del Producto a Entregar", 15, 128);

  drawFormBox(doc, "Producto / Modelo:", datos.productoNombre, 15, 132, 120, 11);
  drawFormBox(doc, "IMEI / N° Serie:", datos.nserie || "Sin IMEI/Serie registrado", 138, 132, 57, 11);

  // Legalese info
  let y = 155;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("El presente documento certifica el traslado y entrega del producto detallado.", 15, y); y += 5;
  doc.text("La mercadería viaja por cuenta y orden de la empresa para ser entregada al cliente.", 15, y); y += 12;

  if (datos.afiliadoEmail) {
    doc.setFont("helvetica", "bold");
    doc.text(`Vendedor/Afiliado asignado: ${datos.afiliadoEmail}`, 15, y); y += 15;
  }

  // Signatures
  y += 20;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(15, y, 90, y);
  doc.line(120, y, 195, y);
  
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Firma Despachante (Central)", 15, y);
  doc.text("Firma de Conformidad Cliente", 120, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Aclaración: ________________________", 15, y);
  doc.text("Aclaración: ________________________", 120, y);
  
  y += 5;
  doc.text("DNI/Legajo: ________________________", 15, y);
  doc.text("DNI: ________________________", 120, y);

  doc.save(`Remito_${datos.nroRemito}_${nombre.replace(/\s/g,"_")}.pdf`);
};

export interface LineaRemitoMulti {
  productoNombre: string;
  cantidad: number;
  nseries: string[]; // list of serial/IMEI
}

export interface DatosRemitoMulti {
  nroRemito: string;
  fecha: string;
  origen: string;
  destino: string;
  lineas: LineaRemitoMulti[];
  comentario?: string;
}

export const generarRemitoMultiProducto = (datos: DatosRemitoMulti) => {
  const doc = new jsPDF();

  // Header Box
  doc.setFillColor(244, 244, 245);
  doc.rect(15, 15, 180, 20, "F");
  doc.setDrawColor(234, 179, 8); // Yellow/gold
  doc.setLineWidth(0.5);
  doc.rect(15, 15, 180, 20, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(234, 179, 8);
  doc.text("REMITO DE TRASLADO INTERNO DE STOCK", 20, 23);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("CUENTA HOGAR / REABASTECIMIENTO DE LOCALIDADES", 20, 29);

  // General info
  drawFormBox(doc, "Remito N°:", datos.nroRemito, 15, 40, 90, 11);
  drawFormBox(doc, "Fecha Emisión:", datos.fecha, 105, 40, 90, 11);
  drawFormBox(doc, "Origen (Despacho):", datos.origen, 15, 54, 90, 11);
  drawFormBox(doc, "Destino (Punto de Venta):", datos.destino, 105, 54, 90, 11);

  // Table header
  let y = 75;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.rect(15, y, 180, 7, "F");
  doc.text("Producto / Modelo", 18, y + 5);
  doc.text("Cant.", 120, y + 5);
  doc.text("Números de Serie / IMEI", 135, y + 5);

  y += 7;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  datos.lineas.forEach((linea) => {
    // List serial numbers
    const seriesText = linea.nseries.length > 0 ? linea.nseries.join(", ") : "N/A";
    
    // We split serial text to fit if it's too long
    const splitSeries = doc.splitTextToSize(seriesText, 55);
    const rowHeight = Math.max(8, splitSeries.length * 4.5 + 2);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(15, y, 180, rowHeight, "S");
    
    doc.setFont("helvetica", "bold");
    doc.text(linea.productoNombre, 18, y + 5);
    doc.setFont("helvetica", "normal");
    doc.text(String(linea.cantidad), 120, y + 5);
    
    let sy = y + 5;
    splitSeries.forEach((txt: string) => {
      doc.text(txt, 135, sy);
      sy += 4.5;
    });
    
    y += rowHeight;
  });

  y += 10;
  if (datos.comentario) {
    doc.setFont("helvetica", "bold");
    doc.text("Observaciones:", 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(datos.comentario, 40, y);
    y += 15;
  }

  // Signatures
  y += 20;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(15, y, 90, y);
  doc.line(120, y, 195, y);
  
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Despachado por (Firma y Aclaración)", 15, y);
  doc.text("Recibido por (Firma y Aclaración)", 120, y);

  doc.save(`Remito_Traslado_${datos.nroRemito}.pdf`);
};

export interface ElementoPresupuesto {
  producto: string;
  contado: number;
  cuotas: number;
  valorCuota: number;
  proveedor?: string;
  linkProveedor?: string;
}

export interface DatosPresupuestoPdf {
  nroPresupuesto: string;
  fecha: string;
  clienteNombre: string;
  clienteDni: string;
  clienteWhatsapp: string;
  clienteLocalidad: string;
  items: ElementoPresupuesto[];
  notas?: string;
}

export const generarPdfPresupuesto = (datos: DatosPresupuestoPdf) => {
  const doc = new jsPDF();

  // Header Box with logo inclusion
  doc.setFillColor(15, 23, 42); // Dark slate background matching premium aesthetics
  doc.rect(15, 15, 180, 26, "F");
  
  // Draw modern yellow/gold Circle Logo Badge (representing Electro en Cuotas)
  doc.setFillColor(234, 179, 8); // Gold/yellow
  doc.circle(26, 28, 6, "F");
  
  // Letter "E" inside the circle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // Dark slate
  doc.text("E", 24.5, 31.8);
  
  // Brand name and Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(234, 179, 8); // Gold/yellow
  doc.text("ELECTRO EN CUOTAS", 36, 24);
  
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255); // White
  doc.text("PRESUPUESTO A MEDIDA DE COMPRA FINANCIADA", 36, 30);
  
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175); // Light gray
  doc.text("CUENTA HOGAR — TU PLAN A TU MEDIDA", 36, 36);
  
  // Right side: Doc Number and Date (Right Aligned)
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`Presupuesto N°: ${datos.nroPresupuesto}`, 190, 24, { align: "right" });
  doc.text(`Fecha Emisión: ${datos.fecha}`, 190, 30, { align: "right" });

  // Customer info section
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("Detalles del Cliente", 15, 48);

  drawFormBox(doc, "Cliente (Nombre y Apellido):", datos.clienteNombre, 15, 52, 110, 11);
  drawFormBox(doc, "DNI:", datos.clienteDni, 130, 52, 65, 11);
  
  drawFormBox(doc, "WhatsApp de Contacto:", datos.clienteWhatsapp, 15, 66, 110, 11);
  drawFormBox(doc, "Localidad:", datos.clienteLocalidad, 130, 66, 65, 11);

  // Table header
  let y = 88;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(15, y, 180, 7, "F");
  
  // Table columns text alignment
  doc.text("Producto / Modelo Propuesto", 18, y + 5);
  doc.text("Cuotas", 120, y + 5, { align: "right" });
  doc.text("Valor Cuota", 155, y + 5, { align: "right" });
  doc.text("Total Financiado", 190, y + 5, { align: "right" });

  y += 7;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  let totalCombinedFinanciado = 0;
  let totalCombinedCuotaMensual = 0;

  datos.items.forEach((item) => {
    const totalFinanciado = item.cuotas * item.valorCuota;
    totalCombinedFinanciado += totalFinanciado;
    totalCombinedCuotaMensual += item.valorCuota;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(15, y, 180, 8, "S");

    // Word-wrap long product names inside the product column
    const splitProd = doc.splitTextToSize(item.producto, 85);
    let tempY = y + 5;
    if (splitProd.length > 1) {
      tempY = y + 3.5;
    }
    doc.setFont("helvetica", "bold");
    splitProd.forEach((line: string, idx: number) => {
      if (idx < 2) {
        doc.text(line, 18, tempY + (idx * 3.5));
      }
    });
    
    doc.setFont("helvetica", "normal");
    doc.text(`${item.cuotas} cuotas`, 120, y + 5, { align: "right" });
    doc.text(formatARS(item.valorCuota), 155, y + 5, { align: "right" });
    doc.text(formatARS(totalFinanciado), 190, y + 5, { align: "right" });

    y += 8;
  });

  // Summary Row with Right Alignment
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, 180, 8, "F");
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(15, y, 180, 8, "S");
  
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PRESUPUESTO COMBINADO", 18, y + 5);
  doc.text(formatARS(totalCombinedCuotaMensual) + " / mes", 155, y + 5, { align: "right" });
  doc.text(formatARS(totalCombinedFinanciado), 190, y + 5, { align: "right" });

  y += 15;

  // Defensive Check for Pagination safety
  if (y > 245) {
    doc.addPage();
    y = 25;
  }

  // Notes
  if (datos.notas) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Detalles Adicionales y Notas del Plan:", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const splitNotas = doc.splitTextToSize(datos.notas, 175);
    splitNotas.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 25;
      }
      doc.text(line, 15, y);
      y += 4.5;
    });
    y += 5;
  }

  // Defensive Check before footnotes
  if (y > 260) {
    doc.addPage();
    y = 25;
  }

  // Legal and validation footnotes
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Nota: Los precios y cuotas indicadas en este presupuesto están sujetos a la aprobación del legajo de scoring crediticio.", 15, y);
  y += 4;
  doc.text("Este presupuesto tiene una validez de 7 días corridos a partir de la fecha de emisión.", 15, y);

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Gracias por elegir a Cuenta Hogar. Si estás de acuerdo con esta propuesta, avisanos para iniciar tu trámite.", 15, y);

  doc.save(`Presupuesto_${datos.nroPresupuesto}_${datos.clienteNombre.replace(/\s/g,"_")}.pdf`);
};

export interface DatosComprobantePago {
  nroRecibo: string;
  fecha: string;
  clienteNombre: string;
  clienteDni: string;
  productoNombre: string;
  cuotaNumero: number;
  montoAbonado: number;
  metodoPago: string;
  nroComprobante?: string;
  cuentaDestino?: string;
  proximaCuotaValor?: number;
  proximaCuotaNumero?: number;
  esPagoParcial?: boolean;
}

export const generarComprobantePago = (datos: DatosComprobantePago) => {
  const doc = new jsPDF();
  
  // Header box
  doc.setFillColor(244, 244, 245);
  doc.rect(15, 15, 180, 22, "F");
  doc.setDrawColor(234, 179, 8); // Gold border
  doc.setLineWidth(0.5);
  doc.rect(15, 15, 180, 22, "S");

  // Logo text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(234, 179, 8); // Gold
  doc.text("CUENTA HOGAR", 20, 24);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("COMPROBANTE OFICIAL DE PAGO", 115, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Gestión de Compras y Créditos a Medida", 20, 30);
  doc.text("ELECTRO EN CUOTAS", 115, 30);

  // Recibo details box
  drawFormBox(doc, "Recibo N°:", datos.nroRecibo, 15, 43, 90, 11);
  drawFormBox(doc, "Fecha Cobro:", datos.fecha, 105, 43, 90, 11);

  // Client info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Datos del Cliente / Titular", 15, 68);

  drawFormBox(doc, "Cliente (Nombre y Apellido):", datos.clienteNombre, 15, 72, 180, 11);
  drawFormBox(doc, "DNI:", datos.clienteDni, 15, 86, 180, 11);

  // Payment details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Detalle de la Acreditación", 15, 112);
  
  drawFormBox(doc, "Concepto:", `Pago Cuota N° ${datos.cuotaNumero} - ${datos.productoNombre}`, 15, 116, 180, 11);
  drawFormBox(doc, "Monto Abonado:", `$${datos.montoAbonado}`, 15, 130, 90, 11);
  drawFormBox(doc, "Forma de Pago:", datos.metodoPago, 105, 130, 90, 11);

  drawFormBox(doc, "N° de Transacción / Comprobante:", datos.nroComprobante || "N/A", 15, 144, 90, 11);
  drawFormBox(doc, "Cuenta de Destino:", datos.cuentaDestino || "N/A", 105, 144, 90, 11);

  // Adjustments notice if applicable
  let y = 168;
  if (datos.proximaCuotaValor !== undefined && datos.proximaCuotaNumero !== undefined) {
    doc.setFillColor(254, 243, 199); // light amber background
    doc.rect(15, y, 180, 12, "F");
    doc.setDrawColor(245, 158, 11);
    doc.rect(15, y, 180, 12, "S");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14);
    doc.text(`Ajuste financiero aplicado: La diferencia de pago se trasladó a la Cuota N° ${datos.proximaCuotaNumero}.`, 20, y + 5);
    doc.text(`Nuevo valor establecido para la Cuota N° ${datos.proximaCuotaNumero}: $${datos.proximaCuotaValor}`, 20, y + 9);
    y += 18;
  } else {
    y += 5;
  }

  // Legal note
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Este comprobante posee validez administrativa como constancia de pago de la cuota mencionada.", 15, y); y += 5;
  doc.text("Conserve este documento. Ante cualquier duda comuníquese con su vendedor oficial.", 15, y); y += 20;

  // Signature
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(70, y, 140, y);
  
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Firma Autorizada", 93, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Cuenta Hogar", 96, y + 4);

  const clientClean = datos.clienteNombre.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const productClean = datos.productoNombre.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const suffix = datos.esPagoParcial ? " (Pago Parcial)" : "";
  doc.save(`${clientClean} - ${productClean} - Cuota ${datos.cuotaNumero}${suffix}.pdf`);
};
