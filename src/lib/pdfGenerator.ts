
export const generarNumeroContratoEstructurado = (sol: any, index: number = 1): string => {
  if (sol?.nroContrato && sol.nroContrato.startsWith("CH-")) {
    return sol.nroContrato;
  }
  if (sol?.numeroContrato && sol.numeroContrato.startsWith("CH-")) {
    return sol.numeroContrato;
  }

  const dniClean = (sol?.datosPersonales?.numeroDni || sol?.numeroDni || sol?.dni || "").toString().replace(/\D/g, "");
  const dniPart = dniClean ? dniClean : (sol?.id ? sol.id.substring(0, 6).toUpperCase() : "000000");
  
  let fecha = new Date();
  if (sol?.fechaCreacion?.toDate) {
    fecha = sol.fechaCreacion.toDate();
  } else if (sol?.fechaCreacion) {
    fecha = new Date(sol.fechaCreacion);
  } else if (sol?.fecha) {
    fecha = new Date(sol.fecha);
  }
  
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const seqPart = String(index).padStart(2, "0");
  
  return "CH-" + year + month + "-" + dniPart + "-" + seqPart;
};

import { LOGO_BASE64 } from "./logoBase64";
import { jsPDF } from "jspdf";

export const buildStandardPdfFilename = (
  tipoDoc: string,
  nroReferencia: string | undefined,
  nombreCliente: string | undefined,
  extraInfo?: string
): string => {
  const sanitize = (str: string) =>
    (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

  const cleanTipo = sanitize(tipoDoc);
  const cleanRef = sanitize(nroReferencia || "");
  const cleanNombre = sanitize(nombreCliente || "CLIENTE");
  const cleanExtra = sanitize(extraInfo || "");

  const parts = [cleanTipo];
  if (cleanExtra) parts.push(cleanExtra);
  if (cleanRef) parts.push(cleanRef);
  if (cleanNombre) parts.push(cleanNombre);

  return `${parts.join("_")}.pdf`;
};

export interface ItemContratoDetalle {
  producto: string;
  nserie?: string;
  cantidad?: number;
  estadoBien?: string;
  precioContado?: number | string;
  cuotas?: number | string;
  valorCuota?: number | string;
  totalFinanciado?: number | string;
  proveedor?: string;
  linkProveedor?: string;
}

export interface DatosContrato {
  items?: ItemContratoDetalle[];
  facturaProveedorOriginal?: string;
  nroContrato: string;
  nombreComprador: string;
  dni: string;
  cuil?: string;
  domicilio: string;
  localidad?: string;
  provincia?: string;
  email: string;
  whatsapp: string;
  producto: string;
  cantidad?: number | string;
  estadoBien?: string;
  nserie: string;
  precioContado: string;
  cftTotal?: string;
  factorFinanciado?: string;
  totalFinanciado: string;
  montoAnticipo?: string;
  fechaAnticipo?: string;
  cuotas: string;
  importeCuota: string;
  primeraCuota: string;
  tnaComp: string;
  tnaPun: string;
  cftEa?: string;
  lugarFecha: string;
  jurisdiccion?: string;
  tieneGarante?: boolean;
  garanteNombre?: string;
  garanteDni?: string;
  garanteDomicilio?: string;
  garanteTelefono?: string;
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

  // Margins & Dimensions
  const marginLeft = 15;
  const contentWidth = 180;
  let y = 15;

  const checkAddPage = (needed: number = 10) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
    }
  };

  // --- ENCABEZADO Y TÍTULO PRINCIPAL SIN SOLAPAMIENTO ---
  const nroContratoFinal = datos.nroContrato && !datos.nroContrato.includes("${") 
    ? datos.nroContrato 
    : generarNumeroContratoEstructurado({ dni: datos.dni });

  // Right-aligned Box for Contract Number
  drawFormBox(doc, "N° de Contrato / Legajo:", nroContratoFinal, 130, 12, 65, 12);

  // Left-aligned Title (Left margin = 15mm, width up to 125mm)
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // Dark slate
  doc.text("CONTRATO DE MANDATO COMERCIAL Y", 15, 17);
  doc.text("GESTIÓN DE COMPRA", 15, 23);
  y = 30;

  // Parrafo Introductorio
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);

  const cuitSrl = "30-71829384-9";
  const cuilCli = datos.cuil || datos.dni || "-";
  const locCli = datos.localidad || "CABA";
  const provCli = datos.provincia || "Buenos Aires";
  const emailCli = datos.email || "-";
  const telCli = datos.whatsapp || "-";

  const textIntro = `Entre LOOP GESTIÓN INTEGRAL S.R.L. (operando comercialmente bajo su nombre de fantasía "Cuenta Hogar"), CUIT N° ${cuitSrl}, con domicilio legal en Caracas 1101, Ciudad Autónoma de Buenos Aires, representada en este acto por su Socio Gerente, Sr. Juan Pablo Mosqueira Morales, en adelante denominado el "MANDATARIO" o la "EMPRESA", por una parte; y por la otra el/la Sr./Sra. ${datos.nombreComprador.toUpperCase()}, D.N.I. N° ${datos.dni}, CUIT/CUIL N° ${cuilCli}, con domicilio en la calle ${datos.domicilio.toUpperCase()}, de la localidad de ${locCli.toUpperCase()}, provincia de ${provCli.toUpperCase()}, correo electrónico ${emailCli}, teléfono ${telCli}, en adelante denominado el "MANDANTE" o el "CLIENTE", convienen en celebrar el presente Contrato de Mandato Comercial, sujeto a las disposiciones del Código Civil y Comercial de la Nación y a las siguientes cláusulas y condiciones:`;

  const linesIntro = doc.splitTextToSize(textIntro, contentWidth);
  doc.text(linesIntro, marginLeft, y);
  y += linesIntro.length * 4 + 4;

  // --- SECCIÓN: CLÁUSULAS Y CONDICIONES ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 58, 138); // Dark Blue
  doc.text("CLÁUSULAS Y CONDICIONES", marginLeft, y);
  y += 7;

  // --- CLÁUSULA PRIMERA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("PRIMERA: Objeto del Contrato y Documentación de Compra", marginLeft, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const tP1 = "El MANDANTE encomienda a la EMPRESA, y esta acepta, el mandato irrevocable para gestionar, adquirir y abonar por cuenta y orden del MANDANTE los siguientes bienes muebles (en adelante, los \"Bienes\"):";
  const lP1 = doc.splitTextToSize(tP1, contentWidth);
  doc.text(lP1, marginLeft, y);
  y += lP1.length * 4 + 2;

  // Tabla de Bienes (Headers)
  doc.setFillColor(241, 245, 249);
  doc.rect(marginLeft, y, contentWidth, 6, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginLeft, y, contentWidth, 6, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Cantidad", marginLeft + 3, y + 4.5);
  doc.text("Descripción del Bien (Marca, Modelo, Color)", marginLeft + 30, y + 4.5);
  doc.text("Estado (Nuevo/Usado)", marginLeft + 140, y + 4.5);
  y += 6;

  const parseNum = (val: string | number | undefined) => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    return parseFloat(val.toString().replace(/[^0-9.-]/g, "")) || 0;
  };

  const rawItemsList = datos.items || (datos as any).itemsContrato;
  const itemsList = rawItemsList && rawItemsList.length > 0 ? rawItemsList : [{
    producto: datos.producto,
    nserie: datos.nserie,
    cantidad: datos.cantidad || 1,
    estadoBien: datos.estadoBien || "Nuevo",
    precioContado: datos.precioContado,
    cuotas: datos.cuotas || 12,
    valorCuota: datos.importeCuota,
    totalFinanciado: datos.totalFinanciado
  }];

  itemsList.forEach((it: any) => {
    const cantStr = String(it.cantidad || 1);
    const estadoStr = it.estadoBien || datos.estadoBien || "Nuevo";
    const prodDescFull = `${it.producto} ${it.nserie ? "(IMEI/Serie: " + it.nserie + ")" : ""}`;

    const pLines = doc.splitTextToSize(prodDescFull, 105);
    const rowH = Math.max(8, pLines.length * 4.5 + 3);

    doc.rect(marginLeft, y, contentWidth, rowH, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(cantStr, marginLeft + 8, y + 5.5);

    doc.setFont("helvetica", "normal");
    doc.text(pLines, marginLeft + 30, y + 5);

    doc.text(estadoStr, marginLeft + 142, y + 5.5);
    y += rowH;
  });

  y += 4;

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("La EMPRESA actuará exclusivamente en calidad de intermediario y gestor de compra.", marginLeft, y);
  y += 4;

  let tFact = "ACLARACIÓN SOBRE FACTURACIÓN: El MANDANTE acepta y declara conocer que la adquisición de los Bienes puede ser realizada a distintos proveedores (humanos o jurídicos). Por lo tanto, la provisión de una factura de compra original emitida por el proveedor tercero estará supeditada exclusivamente a la disponibilidad de la misma según el origen y la condición del Bien (nuevo o usado). En ningún caso la falta de factura del proveedor original eximirá al MANDANTE de sus obligaciones de pago frente a la EMPRESA por el servicio de gestión y financiación aquí pactado.";
  if (datos.facturaProveedorOriginal) {
    tFact += `\nReferencia de Origen / Ticket de Compra Proveedor N° ${datos.facturaProveedorOriginal}.`;
  }
  const lFact = doc.splitTextToSize(tFact, contentWidth);
  doc.text(lFact, marginLeft, y);
  y += lFact.length * 3.8 + 6;

  checkAddPage(20);

  // --- CLÁUSULA SEGUNDA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("SEGUNDA: Liquidación de Costos, Honorarios y Financiación", marginLeft, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const tSeg = "El costo total de la operación, que incluye el valor de los Bienes, los honorarios por la gestión del mandato, los gastos logísticos y el costo financiero por el otorgamiento de facilidades de pago con capital propio de la EMPRESA, se detalla a continuación:";
  const lSeg = doc.splitTextToSize(tSeg, contentWidth);
  doc.text(lSeg, marginLeft, y);
  y += lSeg.length * 3.8 + 3;

  if (itemsList.length > 1) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text("Desglose Individual de los Bienes Adquiridos:", marginLeft, y);
    y += 4.5;

    itemsList.forEach((it: any, idx: number) => {
      const cNum = parseNum(it.precioContado);
      const qNum = Number(it.cuotas) || 12;
      const vNum = parseNum(it.valorCuota);
      const tNum = parseNum(it.totalFinanciado) || (vNum * qNum);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Bien ${idx + 1}: ${it.producto} — ${qNum} cuotas de ${formatARS(vNum)} (Total Financiado: ${formatARS(tNum)})`, marginLeft + 3, y);
      y += 4;
    });
    y += 3;
  }

  // 1. Variables Base (Input): Costo_Bien & Valor_Total_Financiar acumulados
  let costoBien = 0;
  let valorTotalFinanciar = 0;

  if (itemsList.length > 1) {
    itemsList.forEach((it: any) => {
      costoBien += parseNum(it.precioContado);
      const qNum = Number(it.cuotas) || 12;
      const vNum = parseNum(it.valorCuota);
      const tNum = parseNum(it.totalFinanciado) || (vNum * qNum);
      valorTotalFinanciar += tNum;
    });
  }

  if (costoBien <= 0) costoBien = Math.round(parseNum(datos.precioContado));
  if (valorTotalFinanciar <= 0) valorTotalFinanciar = Math.round(parseNum(datos.totalFinanciado));

  // 2. Cálculos Internos Ocultos:
  // - Base de ganancia: Monto_Gravado = Valor_Total_Financiar - Costo_Bien
  const montoGravado = Math.max(0, valorTotalFinanciar - costoBien);
  // - 60% para servicios: Gastos_Soporte = Monto_Gravado * 0.60
  const gastosSoporte = Math.round(montoGravado * 0.60);
  // - 40% para intereses: Costo_Financiero = Monto_Gravado * 0.40
  const costoFinanciero = Math.round(montoGravado * 0.40);

  // 3. Salida en el PDF (Cláusula Segunda del Contrato):
  const strCostoBien = formatARS(costoBien);
  const strGastosSoporte = formatARS(gastosSoporte);
  const strCostoFinanciero = formatARS(costoFinanciero);
  const strValorTotalFinanciar = formatARS(valorTotalFinanciar);

  doc.setFont("helvetica", "bold");
  doc.text(`• Valor Neto del Bien: ${strCostoBien}`, marginLeft + 5, y); y += 4.5;
  doc.text(`• Gastos de logística + Servicio de Soporte técnico: ${strGastosSoporte}`, marginLeft + 5, y); y += 4.5;
  doc.text(`• Costo Financiero Total (CFT): ${strCostoFinanciero}`, marginLeft + 5, y); y += 4.5;
  doc.text(`• VALOR TOTAL A FINANCIAR: ${strValorTotalFinanciar}`, marginLeft + 5, y); y += 7;

  checkAddPage(25);

  // --- CLÁUSULA TERCERA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("TERCERA: Forma de Pago y Garantía de Cumplimiento (Pagaré)", marginLeft, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const tTer = "El MANDANTE se compromete a abonar a la EMPRESA el Valor Total indicado en la Cláusula Segunda, mediante el siguiente plan de pagos:";
  const lTer = doc.splitTextToSize(tTer, contentWidth);
  doc.text(lTer, marginLeft, y);
  y += lTer.length * 3.8 + 3;

  // Tabla Plan de Pagos
  doc.setFillColor(241, 245, 249);
  doc.rect(marginLeft, y, contentWidth, 6, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginLeft, y, contentWidth, 6, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Anticipo / Cuota N°", marginLeft + 5, y + 4.5);
  doc.text("Monto ($)", marginLeft + 75, y + 4.5);
  doc.text("Fecha de Vencimiento", marginLeft + 130, y + 4.5);
  y += 6;

  // Filas de Tabla
  if (datos.montoAnticipo && Number(datos.montoAnticipo.replace(/[^0-9.-]/g, "")) > 0) {
    doc.rect(marginLeft, y, contentWidth, 6, "S");
    doc.setFont("helvetica", "normal");
    doc.text("Anticipo (si lo hubiere)", marginLeft + 5, y + 4.5);
    doc.text(formatARS(datos.montoAnticipo), marginLeft + 75, y + 4.5);
    doc.text(datos.fechaAnticipo || "Al momento de la firma", marginLeft + 130, y + 4.5);
    y += 6;
  }

  doc.rect(marginLeft, y, contentWidth, 6, "S");
  doc.setFont("helvetica", "normal");
  doc.text("Cuota 1", marginLeft + 5, y + 4.5);
  doc.text(formatARS(datos.cuotasPlan[0]?.montoOriginal || datos.importeCuota), marginLeft + 75, y + 4.5);
  doc.text(datos.cuotasPlan[0]?.vencimiento || datos.primeraCuota, marginLeft + 130, y + 4.5);
  y += 6;

  doc.rect(marginLeft, y, contentWidth, 6, "S");
  doc.setFont("helvetica", "normal");
  doc.text(`Cuota 2 a ${datos.cuotas}`, marginLeft + 5, y + 4.5);
  doc.text(formatARS(datos.importeCuota), marginLeft + 75, y + 4.5);
  doc.text("Del 1 al 10 de cada mes", marginLeft + 130, y + 4.5);
  y += 8;

  const tPagare = "Como garantía del fiel cumplimiento de las obligaciones de pago aquí asumidas, el MANDANTE suscribe en este acto, a favor de \"LOOP GESTIÓN INTEGRAL S.R.L.\", un (1) Pagaré \"Sin Protesto\" por la suma total financiada.";
  const lPagare = doc.splitTextToSize(tPagare, contentWidth);
  doc.text(lPagare, marginLeft, y);
  y += lPagare.length * 3.8 + 6;

  checkAddPage(20);

  // --- CLÁUSULA CUARTA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("CUARTA: Mora e Incumplimiento", marginLeft, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const moraPct = datos.tnaPun || "0.5";
  const tCua = `La mora se producirá de pleno derecho por el mero vencimiento de los plazos estipulados, sin necesidad de interpelación judicial o extrajudicial previa. La falta de pago en término de una (1) sola cuota facultará a la EMPRESA a declarar la caducidad de todos los plazos pendientes y a exigir de inmediato el pago íntegro de la totalidad del saldo adeudado, devengando un interés punitorio compensatorio del ${moraPct}% mensual sobre el saldo en mora hasta su efectivo pago.`;
  const lCua = doc.splitTextToSize(tCua, contentWidth);
  doc.text(lCua, marginLeft, y);
  y += lCua.length * 3.8 + 5;

  checkAddPage(20);

  // --- CLÁUSULA QUINTA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("QUINTA: Entregas, Logística y Aceptación", marginLeft, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const tQui = "La firma del remito de entrega o acuse de recibo por parte del MANDANTE o persona autorizada en el domicilio consignado implicará la total conformidad con el estado exterior, integridad y funcionamiento inicial del Bien gestionado.";
  const lQui = doc.splitTextToSize(tQui, contentWidth);
  doc.text(lQui, marginLeft, y);
  y += lQui.length * 3.8 + 5;

  checkAddPage(30);

  // --- CLÁUSULA SEXTA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("SEXTA: Limitación de Responsabilidad, Soporte Técnico Integral y Roturas", marginLeft, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const tSex = "La garantía por defectos o vicios de fabricación es otorgada exclusivamente por el fabricante y/o proveedor originario del producto según sus propios términos. La EMPRESA, como parte de sus servicios de gestión, brindará al MANDANTE un Plan de Soporte Técnico Integral, limitándose a mediar y gestionar administrativamente los reclamos ante los servicios técnicos oficiales o vendedores originarios, asumiendo exclusivamente la prestación del servicio logístico de traslado físico del bien desde la localidad del MANDANTE hasta los Centros de Servicio Técnico Oficial correspondientes ubicados en la Ciudad Autónoma de Buenos Aires (CABA), así como su posterior retorno. La EMPRESA no asume responsabilidad técnica ni reparaciones directas de fábrica bajo ninguna circunstancia. En bienes usados, el MANDANTE acepta expresamente el estado del bien \"tal como está\" al momento de la entrega, salvo pacto expreso en contrario.";
  const lSex = doc.splitTextToSize(tSex, contentWidth);
  doc.text(lSex, marginLeft, y);
  y += lSex.length * 3.8 + 3;

  doc.setFont("helvetica", "bold");
  const tRotura = "Se deja expresa constancia de que cualquier rotura, desperfecto, hurto, robo, pérdida, destrucción o inutilización del Bien ocurrida con posterioridad a su entrega, por cualquier causa que fuere, no exime, suspende ni extingue bajo ninguna circunstancia la obligación del MANDANTE de cancelar la totalidad de las cuotas adeudadas a la EMPRESA por el servicio de gestión y financiación aquí formalizado.";
  const lRotura = doc.splitTextToSize(tRotura, contentWidth);
  doc.text(lRotura, marginLeft, y);
  y += lRotura.length * 3.8 + 5;

  checkAddPage(25);

  // --- CLÁUSULA SÉPTIMA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("SÉPTIMA: Autonomía de las Obligaciones", marginLeft, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const tSep = "Las partes ratifican que el presente contrato constituye un mandato de compra y administración de facilidades de pago con fondos propios, revistiendo la EMPRESA el carácter exclusivo de mandataria y prestadora de servicios de gestión. Toda contingencia respecto del uso, goce o funcionamiento del bien se regirá por los canales correspondientes al soporte técnico y las garantías de origen, manteniéndose irrevocables las obligaciones de pago asumidas.";
  const lSep = doc.splitTextToSize(tSep, contentWidth);
  doc.text(lSep, marginLeft, y);
  y += lSep.length * 3.8 + 5;

  checkAddPage(25);

  // --- CLÁUSULA OCTAVA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("OCTAVA: Autorización de Información Crediticia", marginLeft, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const tOct = "El MANDANTE autoriza en forma expresa, libre e irrevocable a la EMPRESA a consultar, registrar, procesar, informar y reportar información sobre su comportamiento de pago, estado de morosidad y cumplimiento de las obligaciones crediticias y de servicios aquí asumidas ante bases de datos de antecedentes comerciales y de riesgo crediticio públicas o privadas (incluyendo, sin limitación, Veraz, Nosis, Fidelitas, Banco Central de la República Argentina y entidades afines), en los términos de la Ley de Protección de Datos Personales N° 25.326 y sus normas reglamentarias.";
  const lOct = doc.splitTextToSize(tOct, contentWidth);
  doc.text(lOct, marginLeft, y);
  y += lOct.length * 3.8 + 5;

  checkAddPage(20);

  // --- CLÁUSULA NOVENA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("NOVENA: Cesión de Derechos y Créditos", marginLeft, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const tNov = "La EMPRESA queda expresamente facultada para ceder, transferir, titularizar o negociar, total o parcialmente, los derechos de cobro derivados del presente contrato, los créditos emergentes y el pagaré que garantiza la operación a favor de terceros, personas humanas o jurídicas, fideicomisos financieros o entidades de inversión, sin necesidad de notificación previa por acto público ni conformidad expresa del MANDANTE, conforme a lo establecido en los artículos 1614 y subsiguientes del Código Civil y Comercial de la Nación.";
  const lNov = doc.splitTextToSize(tNov, contentWidth);
  doc.text(lNov, marginLeft, y);
  y += lNov.length * 3.8 + 5;

  checkAddPage(30);

  // --- CLÁUSULA DÉCIMA ---
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("DÉCIMA: Jurisdicción, Competencia y Domicilios", marginLeft, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const jurisStr = datos.jurisdiccion || provCli || "CABA";
  const tDec = `Para todos los efectos judiciales o extrajudiciales derivados del presente contrato, las partes fijan sus domicilios especiales en los indicados en el encabezamiento, donde se tendrán por válidas y eficaces todas las notificaciones que se cursen, y se someten expresamente a la jurisdicción de los Tribunales Ordinarios de ${jurisStr}, renunciando a cualquier otro fuero o jurisdicción que pudiera corresponderles.`;
  const lDec = doc.splitTextToSize(tDec, contentWidth);
  doc.text(lDec, marginLeft, y);
  y += lDec.length * 3.8 + 4;

  const lugarStr = datos.lugarFecha || `Buenos Aires, ${new Date().toLocaleDateString("es-AR")}`;
  const tConformidad = `En prueba de plena conformidad, se firman dos (2) ejemplares de un mismo tenor y a un solo efecto en la ciudad/provincia de ${lugarStr}.`;
  const lConf = doc.splitTextToSize(tConformidad, contentWidth);
  doc.text(lConf, marginLeft, y);
  y += lConf.length * 3.8 + 15;

  checkAddPage(35);

  // --- BLOQUE DE FIRMAS ---
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(15, y, 90, y);
  doc.line(115, y, 190, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Firma y Aclaración MANDANTE", 15, y);
  doc.text("Por LOOP GESTIÓN INTEGRAL S.R.L.", 115, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`D.N.I. N°: ${datos.dni}`, 15, y);
  doc.text("Juan Pablo Mosqueira Morales - Socio Gerente", 115, y);

  const fileName = buildStandardPdfFilename("CONTRATO", datos.nroContrato, datos.nombreComprador);
  doc.save(fileName);
};


export const numeroALetras = (amount: number | string): string => {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString().replace(/[^0-9.-]/g, "")) || 0;
  const entero = Math.floor(Math.abs(num));
  const centavos = Math.round((Math.abs(num) - entero) * 100);

  const Unidades = (n: number): string => {
    switch (n) {
      case 1: return "UN";
      case 2: return "DOS";
      case 3: return "TRES";
      case 4: return "CUATRO";
      case 5: return "CINCO";
      case 6: return "SEIS";
      case 7: return "SIETE";
      case 8: return "OCHO";
      case 9: return "NUEVE";
      default: return "";
    }
  };

  const DecenasY = (n: number): string => {
    if (n < 10) return Unidades(n);
    if (n >= 10 && n <= 19) {
      switch (n) {
        case 10: return "DIEZ";
        case 11: return "ONCE";
        case 12: return "DOCE";
        case 13: return "TRECE";
        case 14: return "CATORCE";
        case 15: return "QUINCE";
        case 16: return "DIECISEIS";
        case 17: return "DIECISIETE";
        case 18: return "DIECIOCHO";
        case 19: return "DIECINUEVE";
      }
    }
    if (n >= 20 && n <= 29) {
      if (n === 20) return "VEINTE";
      return "VEINTI" + Unidades(n - 20);
    }
    const dec = Math.floor(n / 10);
    const uni = n % 10;
    let name = "";
    switch (dec) {
      case 3: name = "TREINTA"; break;
      case 4: name = "CUARENTA"; break;
      case 5: name = "CINCUENTA"; break;
      case 6: name = "SESENTA"; break;
      case 7: name = "SETENTA"; break;
      case 8: name = "OCHENTA"; break;
      case 9: name = "NOVENTA"; break;
    }
    return uni > 0 ? `${name} Y ${Unidades(uni)}` : name;
  };

  const Centenas = (n: number): string => {
    const cen = Math.floor(n / 100);
    const dec = n % 100;
    if (n === 100) return "CIEN";
    let name = "";
    switch (cen) {
      case 1: name = "CIENTO"; break;
      case 2: name = "DOSCIENTOS"; break;
      case 3: name = "TRESCIENTOS"; break;
      case 4: name = "CUATROCIENTOS"; break;
      case 5: name = "QUINIENTOS"; break;
      case 6: name = "SEISCIENTOS"; break;
      case 7: name = "SETECIENTOS"; break;
      case 8: name = "OCHOCIENTOS"; break;
      case 9: name = "NOVECIENTOS"; break;
    }
    return dec > 0 ? `${name} ${DecenasY(dec)}` : name;
  };

  const Secciones = (n: number): string => {
    if (n === 0) return "CERO";
    if (n < 100) return DecenasY(n);
    if (n < 1000) return Centenas(n);

    const miles = Math.floor(n / 1000);
    const restoMiles = n % 1000;
    let strMiles = "";

    if (miles === 1) strMiles = "UN MIL";
    else if (miles > 1) strMiles = `${Secciones(miles)} MIL`;

    if (restoMiles > 0) strMiles += ` ${Centenas(restoMiles)}`;
    return strMiles;
  };

  const Millones = (n: number): string => {
    if (n < 1000000) return Secciones(n);
    const mill = Math.floor(n / 1000000);
    const resto = n % 1000000;
    let strMill = mill === 1 ? "UN MILLÓN" : `${Secciones(mill)} MILLONES`;
    if (resto > 0) strMill += ` ${Secciones(resto)}`;
    return strMill;
  };

  const strLetras = Millones(entero);
  const centStr = centavos < 10 ? `0${centavos}` : `${centavos}`;
  return `(Son PESOS: ${strLetras} CON ${centStr}/100 M.N.)`;
};

export const generarPagareModelo = (datos: DatosContrato) => {
  const doc = new jsPDF();
  const nombre = datos.nombreComprador || "Cliente";
  let y = 45;

  const checkAddPage = (needed: number = 10) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
    }
  };

  const totalNum = parseFloat(datos.totalFinanciado?.toString().replace(/[^0-9.-]/g, "") || "0") || 0;
  const strMontoLetras = numeroALetras(totalNum);

  // 1. Header Box (Hardcode Title: "PAGARÉ A LA VISTA Y SIN PROTESTO")
  doc.setFillColor(15, 23, 42);
  doc.rect(15, 12, 180, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(234, 179, 8); // Gold
  doc.text("PAGARÉ A LA VISTA Y SIN PROTESTO", 105, 22, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text("Garantía Ejecutiva de Cumplimiento de Obligaciones de Mandato Comercial", 105, 28, { align: "center" });

  doc.setLineWidth(0.4);
  doc.setDrawColor(15, 23, 42);

  // Box Amount Number
  doc.setFillColor(241, 245, 249);
  doc.rect(130, 38, 65, 12, "F");
  doc.rect(130, 38, 65, 12, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`POR ${formatARS(totalNum)}`, 162.5, 45.5, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);

  const lugarStr = datos.lugarFecha || `Buenos Aires, ${new Date().toLocaleDateString("es-AR")}`;
  doc.text(`Lugar y fecha de emisión: ${lugarStr}`, 15, y); 
  y += 12;

  // Promesa Incondicional & Beneficiario Hardcode
  const t1 = `Por este PAGARÉ me/nos comprometemos incondicionalmente a pagar a la vista y sin protesto a la orden de la razón social:`;
  doc.text(t1, 15, y); y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("LOOP GESTIÓN INTEGRAL S.R.L. (CUIT 30-71829384-9)", 15, y); y += 6;

  // Monto en Números y Letras
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const tMonto = `o a su orden, la cantidad de PESOS: ${formatARS(totalNum)} ${strMontoLetras}.`;
  const lMonto = doc.splitTextToSize(tMonto, 180);
  doc.text(lMonto, 15, y); y += lMonto.length * 4 + 4;

  // Cláusula de Justificación (VITAL - TEXTO EXACTO MANDATORIO):
  // "Valor recibido en servicios de gestión y financiación según mandato comercial, a mi entera satisfacción."
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const tJust = "Valor recibido en servicios de gestión y financiación según mandato comercial, a mi entera satisfacción.";
  const lJust = doc.splitTextToSize(tJust, 180);
  doc.text(lJust, 15, y); y += lJust.length * 4.5 + 4;

  // Cláusula de Mora Automática
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const moraPct = datos.tnaPun || "0.5";
  const tMora = `La falta de pago a su presentación producirá la mora automática de pleno derecho. Operada la mora, la suma adeudada devengará en concepto de interés punitorio la tasa del ${moraPct}% mensual sobre el saldo en mora hasta su efectivo pago.`;
  const lMora = doc.splitTextToSize(tMora, 180);
  doc.text(lMora, 15, y); y += lMora.length * 4 + 6;

  // DATOS DEUDOR PRINCIPAL BOX
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, 180, 32, "F");
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, y, 180, 32, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("DATOS DEL LIBRADOR / DEUDOR PRINCIPAL:", 20, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Nombre y Apellido: ${datos.nombreComprador.toUpperCase()}`, 20, y + 13);
  doc.text(`DNI: ${datos.dni} ${datos.cuil ? " | CUIT/CUIL: " + datos.cuil : ""}`, 120, y + 13);
  doc.text(`Domicilio: ${datos.domicilio.toUpperCase()} (${datos.localidad || "CABA"})`, 20, y + 20);
  doc.text(`Teléfono / WhatsApp: ${datos.whatsapp}`, 120, y + 20);
  doc.text(`Email: ${datos.email || "-"}`, 20, y + 27);

  y += 40;

  // LÓGICA CONDICIONAL DE GARANTE / AVALISTA
  const tieneGarante = datos.tieneGarante || (datos.garanteNombre && datos.garanteNombre.trim().length > 0);

  if (tieneGarante) {
    // Recuadro del Avalista con la cláusula legal obligatoria:
    // "Firma como fiador liso, llano y principal pagador, renunciando a los beneficios de excusión y división"
    doc.setFillColor(254, 243, 199); // Light Amber
    doc.rect(15, y, 180, 42, "F");
    doc.setDrawColor(245, 158, 11);
    doc.rect(15, y, 180, 42, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.text("AVAL Y GARANTÍA DE CUMPLIMIENTO:", 20, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    const tClausulaGarante = "Firma como fiador liso, llano y principal pagador, renunciando a los beneficios de excusión y división.";
    doc.text(tClausulaGarante, 20, y + 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    const tAvalDetail = `Me constituyo en fiador liso, llano y principal pagador de la totalidad de las obligaciones del presente pagaré a favor de LOOP GESTIÓN INTEGRAL S.R.L. (Art. 1583 y ss. CCyCN).`;
    doc.text(tAvalDetail, 20, y + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Garante / Avalista: ${(datos.garanteNombre || "Garante").toUpperCase()}`, 20, y + 27);
    doc.text(`DNI Garante: ${datos.garanteDni || "-"}`, 120, y + 27);
    doc.text(`Domicilio Garante: ${(datos.garanteDomicilio || "-").toUpperCase()}`, 20, y + 34);
    doc.text(`Teléfono Garante: ${datos.garanteTelefono || "-"}`, 120, y + 34);

    y += 50;
  }

  // FIRMAS
  checkAddPage(30);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  if (tieneGarante) {
    // 2 FIRMAS (DEUDOR + GARANTE)
    doc.line(15, y, 90, y);
    doc.line(115, y, 190, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Firma del Deudor Principal", 15, y);
    doc.text("Firma del Garante / Avalista", 115, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Aclaración: ${datos.nombreComprador} (DNI: ${datos.dni})`, 15, y);
    doc.text(`Aclaración: ${datos.garanteNombre || "Garante"} (DNI: ${datos.garanteDni || "-"})`, 115, y);
  } else {
    // 1 FIRMA (SOLO DEUDOR PRINCIPAL)
    doc.line(60, y, 150, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Firma del Librador / Deudor Principal", 105, y, { align: "center" });
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Aclaración Manuscrita y DNI: ${datos.nombreComprador} (DNI: ${datos.dni})`, 105, y, { align: "center" });
  }

  const fileName = buildStandardPdfFilename("PAGARE", datos.nroContrato, datos.nombreComprador);
  doc.save(fileName);
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
  doc.text("CUENTA HOGAR (Nombre de Fantasía de Loop Gestión Integral S.R.L. — Gerente Juan Pablo Mosqueira)", 20, 29);

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
  doc.text("Firma Despachante (Loop Gestión Integral S.R.L. — Gerente Juan Pablo Mosqueira)", 15, y);
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
  doc.text("CUENTA HOGAR (Nombre de Fantasía de Loop Gestión Integral S.R.L. — Gerente Juan Pablo Mosqueira)", 20, 29);

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
  doc.text("Despachado por (Loop Gestión Integral S.R.L. — Gerente Juan Pablo Mosqueira)", 15, y);
  doc.text("Recibido por (Firma y Aclaración)", 120, y);

  const fileName = buildStandardPdfFilename("REMITO_TRASLADO", datos.nroRemito, (datos as any).choferNombre || "DEPOSITO");
  doc.save(fileName);
};

export interface ElementoPresupuesto {
  producto: string;
  contado: number;
  cuotas: number;
  valorCuota: number;
  proveedor?: string;
  linkProveedor?: string;
  imagenUrl?: string;
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

  // 1. Header Box with Corporate Orange background & New Logo
  doc.setFillColor(254, 80, 0); // Corporate Orange #FE5000
  doc.rect(15, 10, 180, 32, "F");
  
  // Draw Official Brand Logo Image (New Square Yellow Lightning Bolt Logo)
  try {
    doc.addImage(LOGO_BASE64, "PNG", 17, 12, 28, 28);
  } catch (e) {}
  
  // Brand name and Subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255); // White text
  doc.text("CUENTA HOGAR", 48, 20);
  
  doc.setFontSize(9.5);
  doc.text("PRESUPUESTO A MEDIDA Y DETALLE DE SERVICIO", 48, 26.5);
  
  doc.setFontSize(7.5);
  doc.setTextColor(254, 235, 200); // Light amber
  doc.text("LOOP GESTIÓN INTEGRAL S.R.L. | Caracas 1101, CABA", 48, 33);
  
  // Right side: Doc Number and Date (Right Aligned)
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`Presupuesto N°: ${datos.nroPresupuesto}`, 190, 20, { align: "right" });
  doc.text(`Fecha Emisión: ${datos.fecha}`, 190, 26.5, { align: "right" });

  // 2. Customer info section
  doc.setTextColor(18, 19, 22);
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.text("1. Datos del Cliente Solicitante", 15, 50);

  drawFormBox(doc, "Cliente (Nombre y Apellido):", datos.clienteNombre, 15, 54, 110, 11);
  drawFormBox(doc, "DNI:", datos.clienteDni, 130, 54, 65, 11);
  
  drawFormBox(doc, "WhatsApp de Contacto:", datos.clienteWhatsapp, 15, 68, 110, 11);
  drawFormBox(doc, "Localidad de Destino:", datos.clienteLocalidad, 130, 68, 65, 11);

  // 3. Table header for items / options
  let y = 92;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(18, 19, 22);
  doc.text("2. Propuesta Económica y Financiación", 15, y - 3);

  doc.setTextColor(255, 255, 255);
  doc.setFillColor(254, 80, 0); // Corporate Orange header bar
  doc.rect(15, y, 180, 8, "F");
  
  doc.setFontSize(8.5);
  doc.text("Opción / Producto Propuesto", 18, y + 5.5);
  doc.text("Cuotas", 120, y + 5.5, { align: "right" });
  doc.text("Valor Cuota", 155, y + 5.5, { align: "right" });
  doc.text("Total Financiado", 190, y + 5.5, { align: "right" });

  y += 8;
  doc.setTextColor(18, 19, 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  datos.items.forEach((item, index) => {
    const totalFinanciado = item.cuotas * item.valorCuota;
    const isMulti = datos.items.length > 1;
    const labelProd = isMulti ? `Opción ${index + 1}: ${item.producto}` : item.producto;

    const splitProd = doc.splitTextToSize(labelProd, 85);
    const rowHeight = Math.max(9, splitProd.length * 4.5 + 4);

    doc.setDrawColor(254, 180, 120); // Soft orange border
    doc.setLineWidth(0.2);
    doc.rect(15, y, 180, rowHeight, "S");

    let tempY = y + 5.5;
    if (splitProd.length > 1) {
      tempY = y + 4.5;
    }
    doc.setFont("helvetica", "bold");
    splitProd.forEach((line: string, idx: number) => {
      doc.text(line, 18, tempY + (idx * 4));
    });
    
    doc.setFont("helvetica", "normal");
    doc.text(`${item.cuotas} cuotas`, 120, y + 5.5, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatARS(item.valorCuota), 155, y + 5.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(formatARS(totalFinanciado), 190, y + 5.5, { align: "right" });

    y += rowHeight;
  });

  if (datos.items.length > 1) {
    y += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("* Las opciones indicadas son alternativas independientes. Al confirmar tu solicitud elegís la opción que mejor se adapte a tu presupuesto.", 15, y);
    y += 6;
  } else {
    y += 6;
  }

  // 4. DETALLE DEL SERVICIO E INFORMACIÓN DE LO QUE INCLUYE
  if (y > 190) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(18, 19, 22);
  doc.text("3. Detalle de Cobertura y Alcance del Servicio Incluido", 15, y);
  y += 5;

  // Outer Box for Service Details
  const boxStartY = y;
  const boxHeight = 52;
  doc.setFillColor(248, 250, 252); // Light grayish slate
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, boxStartY, 180, boxHeight, "FD");

  doc.setFontSize(7.8);
  let svcY = boxStartY + 7;

  const servicioPuntos = [
    {
      titulo: "• MANDATO COMERCIAL Y FINANCIACIÓN PROPIA: ",
      desc: "Gestión directa a sola firma sin intermediarios ni requisitos bancarios."
    },
    {
      titulo: "• RECEPCIÓN Y CUSTODIA EN CABA: ",
      desc: "Recepción, guarda y verificación del producto en nuestro local (Caracas 1101, CABA)."
    },
    {
      titulo: "• CONTROL DE CALIDAD Y PRECINTADO SEGURO: ",
      desc: "Inspección física de embalaje y emisión de remito R."
    },
    {
      titulo: "• TRASLADO Y LOGÍSTICA AL INTERIOR: ",
      desc: "Coordinación administrativa de envío protegido desde CABA hasta tu localidad."
    },
    {
      titulo: "• ASISTENCIA CONTINUA VÍA WHATSAPP: ",
      desc: "Acompañamiento post-venta y atención personalizada durante todo el plan."
    }
  ];

  servicioPuntos.forEach(p => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(254, 80, 0); // Corporate Orange
    doc.text(p.titulo, 18, svcY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    const titleWidth = doc.getTextWidth(p.titulo);
    doc.text(p.desc, 18 + titleWidth + 1.5, svcY);

    svcY += 9.2;
  });

  y = boxStartY + boxHeight + 6;

  // Notes
  if (datos.notas) {
    if (y > 235) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(18, 19, 22);
    doc.text("Detalles Adicionales y Observaciones:", 15, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitNotas = doc.splitTextToSize(datos.notas, 175);
    splitNotas.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 15, y);
      y += 4.5;
    });
    y += 5;
  }

  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  // Legal and validation footnotes
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text("• Nota: Los valores y cuotas de este presupuesto están sujetos a scoring crediticio y verificación documental.", 15, y);
  y += 4;
  doc.text("• La reserva de productos queda sujeta a disponibilidad de stock al momento de la aprobación final.", 15, y);
  y += 4;
  doc.text("• Validez de la propuesta: 7 días corridos a partir de su fecha de emisión.", 15, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(254, 80, 0);
  doc.text("Gracias por elegir a Cuenta Hogar (LOOP GESTIÓN INTEGRAL S.R.L. — Domicilio Legal: Caracas 1101, CABA).", 15, y);

  const fileName = buildStandardPdfFilename("PRESUPUESTO", datos.nroPresupuesto, datos.clienteNombre);
  doc.save(fileName);
};

export interface DatosComprobantePago {
  nroContrato?: string;
  nroRecibo: string;
  fecha: string;
  clienteNombre: string;
  clienteDni: string;
  productoNombre?: string;
  cuotaNumero: number;
  cuotasTotal?: number;
  montoAbonado: number;
  montoExento?: number;
  montoGravado?: number;
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
  doc.setFillColor(15, 23, 42);
  doc.rect(15, 12, 180, 28, "F");

  // Official Circular Logo Image
  try {
    doc.addImage(LOGO_BASE64, "PNG", 17, 14, 24, 24);
  } catch (e) {}

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(234, 179, 8); // Gold
  doc.text("CUENTA HOGAR", 45, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("COMPROBANTE OFICIAL DE PAGO", 190, 22, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text("Lo que te haga falta, te lo llevamos y financiamos.", 45, 28);
  doc.text(`Recibo N°: ${datos.nroRecibo}`, 190, 28, { align: "right" });

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
  doc.text("Detalle de la Acreditación", 15, 110);
  
  const nroContratoStr = datos.nroContrato || `CH-${datos.nroRecibo.replace("REC-", "").substring(0, 8)}`;
  const totalCuotasStr = datos.cuotasTotal || 12;
  const conceptoTexto = `Pago Cuota N° ${datos.cuotaNumero}/${totalCuotasStr} - Servicios de gestión, administración de crédito y soporte técnico. (Ref. Contrato Mandato N° ${nroContratoStr})`;

  drawFormBox(doc, "Concepto:", conceptoTexto, 15, 114, 180, 13);

  const mExento = datos.montoExento !== undefined ? datos.montoExento : Math.round(datos.montoAbonado * 0.70);
  const mGravado = datos.montoGravado !== undefined ? datos.montoGravado : Math.max(0, datos.montoAbonado - mExento);

  drawFormBox(doc, "Recupero de Capital (Préstamo Mandato):", formatARS(mExento), 15, 131, 90, 11);
  drawFormBox(doc, "Honorarios e Intereses de Gestión:", formatARS(mGravado), 105, 131, 90, 11);

  drawFormBox(doc, "TOTAL ABONADO:", formatARS(datos.montoAbonado), 15, 145, 90, 11);
  drawFormBox(doc, "Forma de Pago:", datos.metodoPago, 105, 145, 90, 11);

  drawFormBox(doc, "N° de Transacción / Comprobante:", datos.nroComprobante || "N/A", 15, 159, 90, 11);
  drawFormBox(doc, "Cuenta de Destino:", datos.cuentaDestino || "N/A", 105, 159, 90, 11);

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
  doc.text("Firma Autorizada: Loop Gestión Integral S.R.L.", 75, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Gerente Juan Pablo Mosqueira", 75, y + 4);
  doc.text("(Nombre de Fantasía: Cuenta Hogar)", 75, y + 8);

  const refId = datos.nroContrato || datos.nroRecibo;
  const fileName = buildStandardPdfFilename("RECIBO_CUOTA", refId, datos.clienteNombre, String(datos.cuotaNumero));
  doc.save(fileName);
};

export interface DatosEstadoCuenta {
  nroLegajo: string;
  fechaEmision: string;
  clienteNombre: string;
  clienteDni: string;
  productoNombre: string;
  totalPlan: number;
  totalAbonado: number;
  totalPendiente: number;
  planPagos: Array<{
    numero: number;
    montoOriginal: number;
    montoAbonado?: number;
    estado: string;
    vencimiento: string;
    fechaPago?: string;
    metodoPagoManual?: string;
    metodoPago?: string;
    cuentaDestino?: string;
    nroComprobante?: string;
  }>;
}

export const generarEstadoCuenta = (datos: DatosEstadoCuenta) => {
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
  doc.text("RESUMEN DE CUENTA / ESTADO DE PAGOS", 100, 24);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Gestión de Compras y Créditos a Medida", 20, 30);
  doc.text("Loop Gestión Integral S.R.L. — Gerente Juan Pablo Mosqueira", 100, 30);

  // Recibo details box
  drawFormBox(doc, "Legajo de Referencia:", datos.nroLegajo, 15, 43, 90, 11);
  drawFormBox(doc, "Fecha Emisión:", datos.fechaEmision, 105, 43, 90, 11);

  // Client info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Datos del Cliente / Titular", 15, 68);

  drawFormBox(doc, "Cliente (Nombre y Apellido):", datos.clienteNombre, 15, 72, 180, 11);
  drawFormBox(doc, "DNI:", datos.clienteDni, 15, 86, 180, 11);

  // Financial Stats
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Resumen Financiero del Plan", 15, 112);

  drawFormBox(doc, "Monto Total Plan:", `$${datos.totalPlan}`, 15, 116, 60, 11);
  drawFormBox(doc, "Monto Total Abonado:", `$${datos.totalAbonado}`, 75, 116, 60, 11);
  drawFormBox(doc, "Monto Total Pendiente:", `$${datos.totalPendiente}`, 135, 116, 60, 11);

  // Installments Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Plan de Pagos y Estado de Cuotas", 15, 142);

  let y = 148;
  doc.setFillColor(244, 244, 245);
  doc.rect(15, y, 180, 8, "F");
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(15, y, 180, 8, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Cuota", 17, y + 5.5);
  doc.text("Vencimiento", 30, y + 5.5);
  doc.text("Valor Original", 58, y + 5.5);
  doc.text("Estado", 88, y + 5.5);
  doc.text("Monto Abonado", 118, y + 5.5);
  doc.text("Fecha y Cuenta de Pago", 148, y + 5.5);
  
  y += 8;
  doc.setFont("helvetica", "normal");
  datos.planPagos.forEach((c) => {
    // Check pagination safety
    if (y > 275) {
      doc.addPage();
      y = 25;
      // redraw table header
      doc.setFillColor(244, 244, 245);
      doc.rect(15, y, 180, 8, "F");
      doc.rect(15, y, 180, 8, "S");
      doc.setFont("helvetica", "bold");
      doc.text("Cuota", 17, y + 5.5);
      doc.text("Vencimiento", 30, y + 5.5);
      doc.text("Valor Original", 58, y + 5.5);
      doc.text("Estado", 88, y + 5.5);
      doc.text("Monto Abonado", 118, y + 5.5);
      doc.text("Fecha y Cuenta de Pago", 148, y + 5.5);
      y += 8;
      doc.setFont("helvetica", "normal");
    }

    doc.rect(15, y, 180, 8, "S");
    doc.text(String(c.numero), 17, y + 5.5);
    doc.text(new Date(c.vencimiento).toLocaleDateString("es-AR"), 30, y + 5.5);
    doc.text(`$${c.montoOriginal}`, 58, y + 5.5);
    
    // state text
    const stateStr = c.estado === "PAGADO" ? "PAGADA" : c.estado === "EN_REVISION" ? "EN REVISIÓN" : "PENDIENTE";
    if (c.estado === "PAGADO") {
      doc.setTextColor(22, 163, 74);
      doc.setFont("helvetica", "bold");
    } else if (c.estado === "EN_REVISION") {
      doc.setTextColor(37, 99, 235);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "normal");
    }
    doc.text(stateStr, 88, y + 5.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    
    doc.text(c.estado === "PAGADO" ? `$${c.montoAbonado || c.montoOriginal}` : "-", 118, y + 5.5);
    
    let info = "-";
    if (c.estado === "PAGADO") {
      const fPago = c.fechaPago ? new Date(c.fechaPago).toLocaleDateString("es-AR") : "";
      const medio = c.cuentaDestino || c.metodoPagoManual || c.metodoPago || "";
      info = `${fPago} ${medio ? `(${medio.substring(0,12)})` : ""}`;
    }
    doc.text(info, 148, y + 5.5);
    
    y += 8;
  });

  // Footer / Notes
  y += 10;
  if (y > 260) {
    doc.addPage();
    y = 25;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Detalle del Producto:", 15, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Producto Adquirido: ${datos.productoNombre}`, 15, y);
  y += 10;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Este estado de cuenta refleja los cobros validados en las cuentas de la administración central de Cuenta Hogar.", 15, y);
  y += 4;
  doc.text("Para reclamos o aclaraciones, presente los comprobantes de pago emitidos por el sistema.", 15, y);

  const refId = datos.nroLegajo;
  const fileName = buildStandardPdfFilename("ESTADO_CUENTA", refId, datos.clienteNombre);
  doc.save(fileName);
};


export interface DatosEmpresaRemito {
  razonSocial?: string;
  nombreFantasia?: string;
  domicilioFiscal?: string;
  cuit?: string;
  condicionIva?: string;
  iibb?: string;
  fechaInicioActividades?: string;
  emailContacto?: string;
  telefonoContacto?: string;
}

export interface DatosRemitoTipoR {
  codigoProducto?: string;
  nroRemito: string;
  fechaEmision: string;
  nroContratoInterno: string;
  facturaProveedorOriginal?: string;
  clienteNombre: string;
  clienteDni: string;
  clienteDomicilio: string;
  clienteTelefono?: string;
  productoDescripcion: string;
  nserie?: string;
  cantidad?: number;
  empresaConfig?: DatosEmpresaRemito;
}

export const generarRemitoTipoR = (datos: DatosRemitoTipoR) => {
  const doc = new jsPDF();

  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);

  // -------------------------------------------------------------
  // 1. TOP HEADER BOX (X=10 to 200, Y=10 to 46)
  // -------------------------------------------------------------
  doc.rect(10, 10, 190, 36, "S");

  // Vertical dividers for Center "R COD. 91" box (X=93 and X=117)
  doc.line(93, 10, 93, 46);
  doc.line(117, 10, 117, 46);
  // Horizontal divider inside Center box
  doc.line(93, 33, 117, 33);

  const emp = datos.empresaConfig || {};
  const razonSocial = emp.razonSocial || "LOOP GESTIÓN INTEGRAL S.R.L.";
  const nombreFantasia = emp.nombreFantasia || "Cuenta Hogar";
  const domicilio = emp.domicilioFiscal || "Caracas 1101, CABA";
  const cuit = emp.cuit || "30-71829384-9";
  const condicionIva = emp.condicionIva || "RESP. INSCRIPTO";
  const iibb = emp.iibb || "30-71829384-9";
  const fechaInicio = emp.fechaInicioActividades || "01/09/2018";
  const email = emp.emailContacto || "administracion@cuentahogar.com";
  const telefono = emp.telefonoContacto || "+54 9 11 3013-7724";

  // --- LEFT COLUMN: Emisor Info ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(razonSocial.toUpperCase(), 12, 16);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Razón Social: ${razonSocial.toUpperCase()}`, 12, 22);
  doc.text(`Domicilio: ${domicilio.toUpperCase()}`, 12, 26);
  doc.text(`Nombre de Fantasía: ${nombreFantasia.toUpperCase()}`, 12, 30);
  doc.text(`E-Mail: ${email}`, 12, 34);
  doc.text(`TE: ${telefono}`, 12, 38);

  // --- CENTER BOX: "R COD. 91" ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("R", 105, 26, { align: "center" });

  doc.setFontSize(7.5);
  doc.text("COD. 91", 105, 40, { align: "center" });

  // --- RIGHT COLUMN: Remito Details ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REMITO", 121, 17);

  doc.setFontSize(9);
  doc.text(`N°:     ${datos.nroRemito}`, 148, 17);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha:   ${datos.fechaEmision}`, 148, 22);

  doc.text(`CUIT:   ${cuit}`, 121, 28);
  doc.text(`Condición IVA:   ${condicionIva.toUpperCase()}`, 121, 33);
  doc.text(`Ingresos Brutos:   ${iibb}`, 121, 38);
  doc.text(`Fecha de Inicio de Actividades:   ${fechaInicio}`, 121, 42);

  // -------------------------------------------------------------
  // 2. DESTINATARIO (CLIENTE) BOX (Y=46 to 76)
  // -------------------------------------------------------------
  doc.rect(10, 46, 190, 30, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Cliente: ${datos.clienteNombre.toUpperCase()} - (DNI:${datos.clienteDni})`, 12, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const domClean = (datos.clienteDomicilio || "CABA").toUpperCase();
  doc.text(`Domicilio: ${domClean}`, 12, 58);
  doc.text(`Teléfono: ${datos.clienteTelefono || "-"}`, 135, 58);

  doc.text("Condición venta: MARKETPLACE / MANDATO COMERCIAL", 12, 65);
  doc.text("Condición IVA: CONSUMIDOR FINAL", 135, 65);

  doc.text("Transporte: -", 12, 72);
  doc.text(`Comp.Asociado: Contrato N° ${datos.nroContratoInterno}`, 135, 72);

  // -------------------------------------------------------------
  // 3. TABLA DE MERCADERÍA (Y=76 to 100)
  // -------------------------------------------------------------
  // Header Row (Gray Fill)
  doc.setFillColor(220, 225, 230);
  doc.rect(10, 76, 190, 7, "FD");

  doc.line(40, 76, 40, 100);
  doc.line(165, 76, 165, 100);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Código", 12, 81);
  doc.text("Producto / Servicio", 43, 81);
  doc.text("Cantidad", 195, 81, { align: "right" });

  // Data Row Box
  doc.rect(10, 83, 190, 17, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const codigoProd = datos.codigoProducto || `779${datos.clienteDni.slice(0, 6) || "688540"}`;
  doc.text(codigoProd, 12, 91);

  doc.setFont("helvetica", "bold");
  const prodDesc = `${datos.productoDescripcion.toUpperCase()} ${datos.nserie ? "(SERIE/IMEI: " + datos.nserie + ")" : ""}`;
  const prodLines = doc.splitTextToSize(prodDesc, 120);
  doc.text(prodLines, 43, 91);

  doc.text(String(datos.cantidad || 1), 195, 91, { align: "right" });

  // -------------------------------------------------------------
  // 4. LEYENDA LEGAL DE MARCO NORMATIVO (Y=100 to 124)
  // -------------------------------------------------------------
  doc.setFillColor(254, 243, 199); // Light Amber
  doc.rect(10, 100, 190, 24, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14);
  doc.text("LEYENDA LEGAL DE TRASLADO Y MARCO NORMATIVO (MANDATO COMERCIAL):", 12, 105);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 53, 15);
  const textLeyenda = `Traslado y entrega a domicilio de bien mueble adquirido por cuenta y orden de terceros. Operación respaldada bajo Contrato de Mandato de Compra N° ${datos.nroContratoInterno}.\nReferencia de origen: Factura del proveedor original N° ${datos.facturaProveedorOriginal || "S/N"}.`;
  const linesLeyenda = doc.splitTextToSize(textLeyenda, 184);
  doc.text(linesLeyenda, 12, 111);

  // -------------------------------------------------------------
  // 5. RESUMEN Y VALOR DECLARADO (Y=124 to 132)
  // -------------------------------------------------------------
  doc.setTextColor(0, 0, 0);
  doc.rect(10, 124, 190, 8, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Valor Declarado: Sin Valor Comercial (Operación respaldada por Mandato)", 12, 129.5);
  doc.text(`Cantidad Total: ${datos.cantidad || 1}`, 195, 129.5, { align: "right" });

  // -------------------------------------------------------------
  // 6. OBSERVACIONES Y CONFORMIDAD DE RECEPCIÓN (Y=132 to 184)
  // -------------------------------------------------------------
  doc.rect(10, 132, 190, 52, "S");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Observaciones: Proveedor Original Ticket N° ${datos.facturaProveedorOriginal || "S/N"} | Contrato N° ${datos.nroContratoInterno}`, 12, 137);
  doc.text("Entrega: Domicilio del cliente titular o Punto de Venta asignado.", 12, 142);

  doc.line(10, 145, 200, 145);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CONFORMIDAD DE RECEPCIÓN Y GARANTÍA TÉCNICA:", 12, 150);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const textConformidad = "Recibí de conformidad el producto arriba detallado. Declaro haber realizado la inspección visual del mismo, constatando que se encuentra en perfectas condiciones estéticas, sin rayas ni golpes, y que incluye todos sus accesorios de fábrica. Comprendo que la garantía técnica corresponde exclusivamente al fabricante del equipo.";
  const linesConf = doc.splitTextToSize(textConformidad, 184);
  doc.text(linesConf, 12, 155);

  // -------------------------------------------------------------
  // 7. FIRMAS DE CONFORMIDAD (Y=195)
  // -------------------------------------------------------------
  let ySign = 195;
  doc.setDrawColor(0, 0, 0);
  doc.line(15, ySign, 85, ySign);
  doc.line(115, ySign, 185, ySign);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Firma del Despachante / Conductor", 15, ySign + 5);
  doc.text("Firma del Cliente (Conformidad)", 115, ySign + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Loop Gestión Integral S.R.L.", 15, ySign + 9);
  doc.text("Aclaración y DNI: ________________________", 115, ySign + 9);

  // -------------------------------------------------------------
  // 8. PIE DE PÁGINA INSTITUCIONAL (Y=280)
  // -------------------------------------------------------------
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  
  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);
  doc.text(`Usuario: OPERADOR - Fecha: ${nowStr}`, 10, 282);
  doc.text("Página 1/1   |   www.cuentahogar.com - Sistema de Gestión Logística", 105, 282, { align: "center" });
  doc.text(`Id Remito: ${datos.nroRemito}`, 200, 282, { align: "right" });

  const refCombined = datos.nroContratoInterno ? `${datos.nroRemito}_${datos.nroContratoInterno}` : datos.nroRemito;
  const fileName = buildStandardPdfFilename("REMITO", refCombined, datos.clienteNombre);
  doc.save(fileName);
};
