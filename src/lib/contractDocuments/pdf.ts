// Offline review renderer. Does not persist, download, email or publish anything.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { contractValueHash } from '../contractIntegrityV2';
import type { ContractSnapshotV2,ContractDocumentDefinitionV2 } from '../contractSnapshotV2';
import { projectContractReview,PROJECTION_SOURCE_SHA256,type ContractReviewProjection } from './projection';
import { templates,REVIEW_WARNING,type ReviewDocumentKind } from './templates';
const layout=Object.freeze({format:'a4',margin:17,font:'Helvetica',fontSize:10,bodyBottom:274,renderer:'CONTRACT_REVIEW_PDF_V1'});
const rendererHash=contractValueHash({pdfSource:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),projectionSource:PROJECTION_SOURCE_SHA256,jsPDF:jsPDF.version,layout});
export function reviewDocumentDefinitions():ContractSnapshotV2['documentDefinitions']{
 const definition=(kind:ReviewDocumentKind):ContractDocumentDefinitionV2=>({templateId:templates[kind].id,templateVersion:templates[kind].version,templateHash:contractValueHash({warning:REVIEW_WARNING,...templates[kind]}),rendererBundleId:layout.renderer,rendererBundleHash:rendererHash,resourcesManifestHash:contractValueHash(layout),legalApprovalId:'SYNTHETIC_NOT_A_LEGAL_APPROVAL'});
 return {contract:definition('mandate'),promissoryNote:definition('promissoryNote')};
}
export function formatSnapshotAmount(n:number){
 if(!Number.isFinite(n)||n<0)throw Error('INVALID_REVIEW_AMOUNT');
 const [coefficient,exponent='0']=n.toString().split('e'),parts=coefficient.split('.'),digits=parts.join(''),position=parts[0].length+Number(exponent);
 const decimal=position<=0?'0.'+'0'.repeat(-position)+digits:position>=digits.length?digits+'0'.repeat(position-digits.length):digits.slice(0,position)+'.'+digits.slice(position);
 const [integer,fraction='']=decimal.split('.');return '$ '+integer.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+fraction.padEnd(2,'0');
}
const money=formatSnapshotAmount;
const date=(s:string)=>s.split('-').reverse().join('/');
function render(kind:ReviewDocumentKind,p:ContractReviewProjection){
 const template=templates[kind],doc=new jsPDF({unit:'mm',format:'a4',compress:false,putOnlyUsedFonts:true});
 // Technical metadata comes from the snapshot, never an issuance/signature date or local clock.
 doc.setCreationDate("D:"+p.technicalFrozenAt.slice(0,19).replace(/\D/g,'')+"+00'00'");doc.setFileId(contractValueHash({kind,p,template,rendererHash}).slice(0,32));
 doc.setProperties({title:`${template.title} - ${p.contractNumber} - BORRADOR`,subject:'Revisión jurídica pendiente; datos sintéticos',author:'Cuenta Hogar - revisión técnica',creator:layout.renderer});
 let y=40;
 function page(){doc.addPage();y=40;}
 function space(height:number){if(y+height>layout.bodyBottom)page();}
 function text(value:string,size=10,bold=false){
  doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
  const lines=doc.splitTextToSize(value,176) as string[];
  for(const line of lines){space(size*0.42+1);doc.setTextColor(35,48,45);doc.text(line,17,y);y+=size*0.42+1;}y+=2;
 }
 function heading(value:string){space(15);y+=3;text(value,12,true);}
 function table(head:string[],rows:(string|number)[][]){
  autoTable(doc,{startY:y,head:[head],body:rows,margin:{top:40,bottom:24,left:17,right:17},styles:{font:'helvetica',fontSize:9,cellPadding:1.6,overflow:'linebreak',textColor:[35,48,45]},headStyles:{fillColor:[23,62,59],textColor:[255,255,255]},alternateRowStyles:{fillColor:[245,247,245]},rowPageBreak:'avoid',showHead:'everyPage',didDrawPage:data=>{y=data.cursor?.y??40;}});
  y=(doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+5;
 }
 text(template.title.toUpperCase(),20,true);text('Documento de trabajo para revisión jurídica. Datos completamente sintéticos.',10);
 heading('1. Identificación de la operación');table(['Dato','Contenido derivado del snapshot'],[['Número contractual compartido',p.contractNumber],['Referencia de compra',p.reference.name],['Descripción',p.reference.description]]);
 heading('2. Datos personales del ejemplo');table(['Campo','Dato sintético'],Object.entries({Nombre:p.customer.fullName,DNI:p.customer.dni,Domicilio:p.customer.address,Localidad:p.customer.locality,Provincia:p.customer.province,'Código postal':p.customer.postalCode,Email:p.customer.email,WhatsApp:p.customer.whatsapp}));
 heading('3. Identidad empresarial pendiente');text('LOOP GESTIÓN INTEGRAL S.R.L. - identidad propuesta pendiente de validación documental.',10,true);text('CUIT, domicilio legal, representación y facultades: pendientes de validación. No se trasladan datos jurídicos legacy ni el identificador fiscal sintético como identidad válida.');
 space(76);heading('4. Datos económicos del snapshot');table(['Concepto','Valor de referencia'],[['Capital aplicado a la compra',money(p.economics.capital)],['Servicio Cuenta Hogar',money(p.economics.service)],['Total contractual',money(p.economics.total)],['Cantidad de cuotas',p.economics.count],['Importe de cada cuota',money(p.economics.installment)]]);
 if(kind==='promissoryNote')text('El importe del pagaré no está definido jurídicamente. No se presume que sea el total contractual, el capital o una cuota.',10,true);
 space(26+(p.schedule.length+1)*7.2);heading('5. Cronograma materializado - referencia contractual');text('Transcripción de las cuotas del snapshot. No determina por sí sola el vencimiento o exigibilidad del pagaré.');table(['Cuota','Vencimiento','Importe'],p.schedule.map(row=>[row.number,date(row.date),money(row.amount)]));
 space(52);heading(`6. ${template.legalHeading}`);text(template.legalText);text(template.pending);
 heading('7. Lugar, fechas y parámetros pendientes');const issue=p.testIssue[kind];text(`Lugar y fecha de prueba del snapshot (no aprobados): ${issue.place}, ${date(issue.date)}.`);text('Lugar y fecha de emisión jurídicamente válidos, lugar de pago y demás parámetros legales: pendientes. La fecha de revisión o congelamiento no acredita firma física.');
 space(55);heading('8. Espacios de firma reservados - NO FIRMAR');text('La ubicación, cantidad, calidad de los firmantes y requisitos de firma deberán aprobarse jurídicamente. Estos espacios no acreditan consentimiento.');
 y+=12;doc.setDrawColor(120);doc.line(17,y,93,y);doc.line(117,y,193,y);y+=6;text('Espacio reservado                               Espacio reservado',9);text('NO VÁLIDO PARA FIRMA',10,true);
 heading('Trazabilidad del borrador');text(`Plantilla: ${template.id} / ${template.version}`,8);text(`Snapshot SHA-256: ${p.snapshotHash}`,8);text(`Renderer: ${layout.renderer}. Aprobación legal: PENDIENTE.`,8);
 const pages=doc.getNumberOfPages();for(let pageNo=1;pageNo<=pages;pageNo++){
  doc.setPage(pageNo);doc.setFillColor(248,235,213);doc.rect(0,0,210,28,'F');doc.setTextColor(112,55,23);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(doc.splitTextToSize(REVIEW_WARNING,176),17,11);
  doc.setFontSize(9);doc.setTextColor(23,62,59);doc.text(`${p.contractNumber} | DATOS SINTÉTICOS`,17,33);
  doc.setDrawColor(210);doc.line(17,277,193,277);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('BORRADOR - NO FIRMAR - REVISIÓN LEGAL PENDIENTE',17,283);doc.text(`${pageNo} / ${pages}`,193,283,{align:'right'});
 }
 return {bytes:new Uint8Array(doc.output('arraybuffer')),pages};
}
export function generateContractReviewPair(snapshot:ContractSnapshotV2){
 if(process.env.NODE_ENV==='production')throw Error('PRODUCTION_DOCUMENT_ISSUANCE_DISABLED');
 if(contractValueHash(snapshot.documentDefinitions)!==contractValueHash(reviewDocumentDefinitions()))throw Error('REVIEW_TEMPLATE_PACKAGE_MISMATCH');
 const projection=projectContractReview(snapshot),projectionHash=contractValueHash(projection),mandate=render('mandate',projection),promissoryNote=render('promissoryNote',projection);
 return {mandate,promissoryNote,manifest:{schemaVersion:'CONTRACT_DOCUMENT_REVIEW_V1',legalApproval:'PENDING',syntheticOnly:true,contractNumber:projection.contractNumber,snapshotHash:projection.snapshotHash,projectionHash,definitions:reviewDocumentDefinitions(),artifacts:{mandate:{sha256:createHash('sha256').update(mandate.bytes).digest('hex'),pages:mandate.pages},promissoryNote:{sha256:createHash('sha256').update(promissoryNote.bytes).digest('hex'),pages:promissoryNote.pages}}}};
}
