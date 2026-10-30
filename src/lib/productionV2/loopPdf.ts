import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {createHash} from 'node:crypto';
import source from './proposedPackages/loop-consolidated-20261030.json';
import {assertLoopContractForIssuance} from '../loopContractIssuance';
import {snapshotCommercial} from '../contractCommercialPreparation';
import {formatDraftAmount,amountWords} from '../contractDocuments/amountWords';
import {contractValueHash} from '../contractIntegrityV2';
import {drawCuentaHogarLogo} from '../pdfBranding';
import type {FinalPackage,FinalSnapshot,FinalDocumentKind} from './catalog';
function section(text:string,start:string,end:string){const a=text.indexOf(start),b=text.indexOf(end,a);if(a<0||b<0)throw Error('LOOP_LEGAL_SOURCE_SECTION_MISSING');return text.slice(a,b).replace(/\s+/g,' ').trim();}
export function renderLoopFinal(s:FinalSnapshot,p:FinalPackage,kind:FinalDocumentKind,test:boolean){
 const commercial=snapshotCommercial(s.documentContext.parameters,s.economicTerms);
 const x=assertLoopContractForIssuance({economicTerms:s.economicTerms,commercialPreparation:commercial,paymentScheduleDraft:[...s.paymentSchedule.installments],acceptedReferenceSnapshot:s.acceptedReference},Date.parse(s.freeze.termsFrozenAt));
 const doc=new jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});let y=30;
 doc.setCreationDate('D:'+s.freeze.termsFrozenAt.slice(0,19).replace(/\D/g,'')+"+00'00'");
 doc.setFileId(contractValueHash({snapshot:s.integrity.payloadHash,package:p.sha256,kind,test}).slice(0,32));
 doc.setProperties({title:p.templates[kind].title,author:s.issuer.legalName,subject:test?'DOCUMENTO DE PRUEBA - SIN VALIDEZ':s.contractNumber});
 const money=(n:number)=>n<0?'-'+formatDraftAmount(-n/100):formatDraftAmount(n/100),date=(v:string)=>v.split('-').reverse().join('/'),rate=(v:number|null)=>v===null?'No corresponde':(v*100).toLocaleString('es-AR',{maximumFractionDigits:6})+' %';
 const c=s.personalData,context=s.documentContext,provider=s.acceptedReference.proveedorSnapshot;
 const address=[c.address,c.locality,s.addressInterpretation.provinceDisplayName,c.postalCode].filter(Boolean).join(', ');
 function room(n:number){if(y+n>267){doc.addPage();y=30;}}
 function line(t:string,bold=false){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(bold?11:9.5);doc.setTextColor(28,40,38);for(const text of doc.splitTextToSize(t.replace(/\s+/g,' ').trim(),174) as string[]){room(5);doc.text(text,18,y);y+=4.7;}y+=3;}
 function table(head:string[],body:string[][]){room(20);autoTable(doc,{startY:y,head:[head],body,margin:{left:18,right:18,top:30,bottom:28},styles:{font:'helvetica',fontSize:8.5,cellPadding:1.6,overflow:'linebreak'},headStyles:{fillColor:[23,62,59]},rowPageBreak:'avoid'});y=(doc as jsPDF&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+6;}
 function page(title:string){doc.addPage();y=30;line(title,true);line(`Contrato ${s.contractNumber} | Mandante: ${c.fullName} | DNI: ${c.dni}`);}
 function signatures(labels:string[]){room(24);y+=12;doc.setFontSize(9);labels.forEach((label,i)=>{const pos=18+i*88;doc.line(pos,y,pos+78,y);doc.text(label,pos,y+5);});y+=22;}
 if(kind==='PAGARE'){
  line('PAGARÉ SIN PROTESTO - VENCIMIENTO ÚNICO',true);
  line(`Lugar de suscripción: ${context.promissoryNoteIssuePlace}. Fecha: ${date(context.promissoryNoteIssueDate)}.`);
  line(`Por este PAGARÉ, prometo pagar pura y simplemente, a la orden de ${s.issuer.legalName}, CUIT ${s.issuer.taxId}, la suma de ${amountWords(s.economicTerms.contractTotal)} (${money(x.totalCents)}), el día fijo ${date(x.noteDueDate)}, en ${x.notePaymentPlace}, sin protesto.`);
  line(`Suscriptor: ${c.fullName}. DNI: ${c.dni}. Domicilio real: ${address}.`);signatures(['Firma manuscrita del suscriptor']);
  line(section(source.sources['05'].text,'El pagaré tiene un único vencimiento.','ADVERTENCIA DE USO:'));
 }else if(kind==='MANDATE'){
  line(p.templates.MANDATE.title,true);line(`Contrato N.º ${s.contractNumber} | Lugar: ${context.contractIssuePlace} | Fecha: ${date(context.contractIssueDate)}`);
  let parties=section(source.sources['01'].text,'Entre LOOP','1. Objeto');
  const replacements:Record<string,string>={'[acreditar representación]':`${s.issuer.representative.fullName}, ${s.issuer.representative.capacity}`,'[CLIENTE]':c.fullName,'DNI [___]':`DNI ${c.dni}`,'CUIT/CUIL [___]':`CUIT/CUIL ${s.employmentData.cuil||'No informado'}`,'domicilio real [___]':`domicilio real ${c.address}`,'localidad/partido/provincia [___]':`localidad/partido/provincia ${c.locality}, ${s.addressInterpretation.provinceDisplayName}`,'correo [___]':`correo ${c.email}`,'teléfono [___]':`teléfono ${c.whatsapp}`};
  for(const [from,to] of Object.entries(replacements))parties=parties.replace(from,to);line(parties);
  for(const clause of source.clauses){doc.setFontSize(9.5);room((doc.splitTextToSize(clause.body,174) as string[]).length*4.7+18);line(`${clause.number}. ${clause.title}`,true);line(clause.body);}
  signatures(['Firma y aclaración MANDANTE','Por LOOP: firma, aclaración y carácter']);line('La firma de una persona que interviene en la entrega no la convierte en representante contractual de LOOP si carece de autorización.');
  page('Anexo I | Identificación del bien y autorización de compra');
  table(['Dato','Detalle'],[['Tipo / marca / modelo',s.acceptedReference.nombre],['Cantidad / condición',`${s.productDetails!.quantity} / ${s.productDetails!.condition==='NEW'?'Nuevo':'Usado'}`],['Especificaciones autorizadas',s.acceptedReference.descripcion||s.acceptedReference.nombre],['Proveedor / CUIT',`${provider} / ${x.supplierTaxId}`],['Precio de adquisición autorizado',money(x.capitalCents)],['Domicilio de entrega',address],['Serie / IMEI (si está disponible)','____________________________']]);
  line('Autorización previa',true);line(section(source.sources['02'].text,'EL MANDANTE autoriza','Trazabilidad de aceptación'));
  line('Trazabilidad de aceptación electrónica anterior a la compra',true);
  table(['Dato','Registro'],[['Propuesta / versión',`${s.sourceDraft.budgetId} / ${s.sourceDraft.budgetVersion}`],['Canal',x.acceptanceChannel==='WHATSAPP'?'WhatsApp':'Email'],['Contacto del cliente',x.acceptanceChannel==='WHATSAPP'?c.whatsapp:c.email],['Fecha/hora de envío (Argentina)',x.proposalSentAt.replace('T',' ')],['Fecha/hora de aceptación (Argentina)',x.clientAcceptedAt.replace('T',' ')],['Referencia respuesta original',String(s.documentContext.parameters.loopConformityEvidence)],['Huella de las condiciones aceptadas',String(s.documentContext.parameters.loopClientTermsDigest)]]);
  line(section(source.sources['02'].text,'Se adjuntará copia fiel','Ratificación física en entrega'));line('Ratificación física en entrega',true);signatures(['Firma MANDANTE, aclaración y DNI','Fecha de ratificación']);
  page('Anexo II | Liquidación económica, servicios y financiación');
  line(`Moneda: ARS | Categoría: ${x.category} | Propuesta: ${s.sourceDraft.budgetId} / ${s.sourceDraft.budgetVersion}`);
  line('A. Liquidación pactada',true);
  table(['Concepto','Neto','IVA incluido (21%)','Total'],[['Capital adelantado al proveedor (factura cliente)','—','Según factura del proveedor',money(x.capitalCents)],...x.services.filter(r=>r.grossCents>0).map(r=>[r.label,money(r.netCents),money(r.vatCents),money(r.grossCents)]),['Total servicios',money(x.serviceNetCents),money(x.serviceVatCents),money(x.serviceGrossCents)],['PRECIO COMPLETO SIN FINANCIACIÓN','—','—',money(x.cashPriceCents)],['Financiación',money(x.financeNetCents),money(x.financeVatCents),money(x.financeGrossCents)],['TOTAL CONTRACTUAL','—','—',money(x.totalCents)]]);
  line(section(source.sources['03'].text,'La liquidación debe corresponder','B. Condiciones financieras'));
  line('B. Condiciones financieras',true);
  table(['Dato','Valor'],[['Anticipo adicional fuera de cuotas',money(0)],['Capital efectivamente financiado, antes de cuota en entrega',money(x.cashPriceCents)],['Sistema de amortización','Cuotas de importe fijo anticipadas; tasa efectiva diaria entre fechas'],['Cantidad de cuotas',String(s.economicTerms.contractPlanCuotas)],['TEA implícita de los flujos, IVA financiero incluido',rate(x.effectiveAnnualRate)],['TNA mensual equivalente de referencia, IVA incluido',rate(x.nominalMonthlyAnnualRate)],['Convención nominal de referencia','12 × tasa efectiva mensual equivalente; año de 365 días'],['CFT efectivo anual informado',x.cftAnnualPercent!.toLocaleString('es-AR',{maximumFractionDigits:6})+' %'],['Criterio informado para CFT',x.cftBasis],['Intereses moratorios, punitorios, multas y recargos','NO SE APLICAN'],['Cancelación anticipada','Sin penalidad; exclusión de intereses futuros no devengados']]);
  room(35);line('C. Cronograma y amortización por fechas reales',true);
  table(['Cuota','Vencimiento','Importe','Capital','Interés neto','IVA interés','Saldo'],x.amortization.map(r=>[String(r.installmentNumber),date(r.dueDate),money(r.paymentCents),money(r.principalCents),money(r.interestNetCents),money(r.interestVatCents),money(r.balanceCents)]));
  line(`Total cuotas: ${money(x.totalCents)}. Anticipo adicional: ${money(0)}. Total pagos: ${money(x.totalCents)}. Primera cuota en la entrega: ${date(x.deliveryDate)}. Si cambia el cronograma, solicitar nueva aceptación.`);
  line('D. Servicio logístico incluido',true);line(section(source.sources['03'].text,'Una (1) gestión completa','E. Cancelación anticipada').replace('[____]',c.locality));
  line('E. Cancelación anticipada',true);line(section(source.sources['03'].text,'Saldo = capital pendiente','Conformidad'));signatures(['Firma MANDANTE, aclaración y DNI','Fecha']);
  page('Anexo III | Remito y constancia de entrega');
  line('Completar en la entrega: este documento emitido no acredita recepción ni firma.');
  table(['Dato','Completar / verificar en la entrega'],[['Producto / marca / modelo',s.acceptedReference.nombre],['Serie / IMEI','____________________________'],['Localidad / provincia',`${c.locality}, ${s.addressInterpretation.provinceDisplayName}`],['Domicilio efectivo de entrega',address],['Fecha y hora','____________________________'],['Responsable y carácter','____________________________ (Conductor LOOP / vendedor afiliado autorizado)']]);
  line('Inspección exterior y resultado',true);line('[ ] RECIBIDO sin daños visibles   [ ] RECIBIDO con observaciones aceptadas expresamente   [ ] RECHAZADO - NO ENTREGADO');line('Observaciones / embalaje / daños: __________________________________________________');line('Fotos y evidencia: __________  Responsable de custodia en rechazo: __________  Administración informada: __________');
  line(section(source.sources['04'].text,'La recepción física','Control documental de entrega por mandato'));
  line('Control documental de entrega por mandato',true);line('[ ] Aceptación previa por WhatsApp/email archivada [ ] Coincidencia con propuesta aceptada verificada [ ] Contrato físico firmado [ ] Anexo I firmado [ ] Anexo II firmado [ ] Pagaré original firmado [ ] Remito/constancia de rechazo');
  line(section(source.sources['04'].text,'El responsable verificará','Firmas'));signatures(['Cliente / destinatario: firma y DNI','Responsable: firma y aclaración']);
 }else throw Error('LOOP_DOCUMENT_KIND_INVALID');
 const pages=doc.getNumberOfPages();for(let i=1;i<=pages;i++){doc.setPage(i);if(kind!=='PAGARE')drawCuentaHogarLogo(doc,175,4,16);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(45);doc.text(`${s.issuer.legalName} | CUIT ${s.issuer.taxId}`,18,21);if(test){doc.setTextColor(150,30,30);doc.text('DOCUMENTO DE PRUEBA - SIN VALIDEZ CONTRACTUAL O FISCAL',18,11);}doc.text(`${s.contractNumber} | ${p.version} | ${i}/${pages}`,18,281);doc.text(`Revisión ${s.sourceDraft.revision} | ${s.integrity.payloadHash.slice(0,24)}`,18,287);}
 const bytes=Buffer.from(doc.output('arraybuffer'));return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),pages};
}
