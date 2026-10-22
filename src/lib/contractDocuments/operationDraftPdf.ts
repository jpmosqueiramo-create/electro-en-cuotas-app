import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createHash } from 'node:crypto';
import { contractValueHash } from '../contractIntegrityV2';
import type { OperationDraftProjection } from './operationDraft';
import { OPERATION_DOCUMENT_VERSION } from './operationDraft';
import { draftClauses,draftWarning,noteDraftText } from './operationDraftTemplates';
import { amountWords,formatDraftAmount } from './amountWords';
import { DocumentPreviewError } from './previewErrors';
export type OperationDocumentKind='mandate'|'promissoryNote';
// Exact display policy: never round saved fractional values.
const money=formatDraftAmount;
const pending='PENDIENTE DE REVISIÓN';
// Hash the loaded renderer instead of reading TS source files absent from standalone.
const rendererHash=contractValueHash({version:OPERATION_DOCUMENT_VERSION,render:renderOperationDraftPair.toString(),amountFormat:formatDraftAmount.toString(),amountWords:amountWords.toString(),jsPDF:jsPDF.version});
export function generateOperationDraftPair(p:OperationDraftProjection){
 if(!p.canPreview)throw new DocumentPreviewError(p.pending.some(x=>x.section==='identity')?'DOCUMENT_IDENTITY_REVIEW_REQUIRED':'DOCUMENT_CONFORMITY_PENDING','RENDER',p.pending.some(x=>x.section==='identity')?'IDENTITY_BLOCK':'CONFORMITY_BLOCK');
 try{return renderOperationDraftPair(p);}catch(error){
  if(error instanceof DocumentPreviewError)throw error;
  throw new DocumentPreviewError('DOCUMENT_RENDER_FAILED','RENDER','PDF_GENERATION_FAILED');
 }
}
function renderOperationDraftPair(p:OperationDraftProjection){
 const templateHash=contractValueHash({version:OPERATION_DOCUMENT_VERSION,draftClauses,draftWarning,noteDraftText});
 const render=(kind:OperationDocumentKind)=>{
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});let y=34;
  doc.setCreationDate('D:'+p.updatedAt.slice(0,19).replace(/\D/g,'')+"+00'00'");
  doc.setFileId(contractValueHash({projection:p.projectionHash,templateHash,rendererHash,kind}).slice(0,32));
  const title=kind==='mandate'?'CONTRATO DE MANDATO COMERCIAL Y GESTIÓN DE COMPRA':'PAGARÉ A LA VISTA Y SIN PROTESTO';
  doc.setProperties({title:title+' — BORRADOR',author:'Cuenta Hogar',subject:'Revisión jurídica pendiente. Sin emisión definitiva.'});
  // Helvetica's WinAnsi repertoire includes bullets and these punctuation glyphs.
  // Normalize only the rendered copy; never alter source records or their digests.
  function check(s:string){const text=s.normalize('NFC').replace(/\r\n?/g,'\n').replace(/\t/g,'    ');if(/[^\x20-\xff\n\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/u.test(text))throw new DocumentPreviewError('DOCUMENT_RENDER_FAILED','RENDER','UNSUPPORTED_TEXT');return text;}
  function line(s:string,size=10,bold=false){
   doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(30,50,47);
   const lines=doc.splitTextToSize(check(s),174) as string[];
   for(const t of lines){if(y>268){doc.addPage();y=24;}doc.text(t,18,y);y+=size*0.46;}y+=3;
  }
  function table(head:string[],body:string[][]){
   autoTable(doc,{startY:y,head:[head.map(check)],body:body.map(row=>row.map(check)),margin:{top:24,bottom:27,left:18,right:18},styles:{font:'helvetica',fontSize:9,cellPadding:2.5,overflow:'linebreak'},headStyles:{fillColor:[23,62,59],textColor:255},columnStyles:{0:{cellWidth:body[0]?.length===3?24:118}},pageBreak:'auto'});
   y=(doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+6;
  }
  line(title,14,true);line('Propuesta para revisión jurídica · Sin numeración contractual definitiva',9);
  const c=p.customer,e=p.economics;
  if(kind==='mandate'){
   line(`Entre ${p.issuer.legalName}, CUIT ${p.issuer.taxId}, que opera bajo la marca ${p.issuer.tradeName}, domicilio legal: ${p.issuer.legalAddress}; representación societaria y facultades de firma: ${pending}, en adelante la MANDATARIA, y ${c.fullName||pending}, DNI ${c.dni||pending}, CUIL ${c.cuil||pending}, domicilio ${c.address||pending}, ${c.locality||pending}, ${c.province||pending}, CP ${c.postalCode||pending}, correo ${c.email||pending}, WhatsApp ${c.whatsapp||pending}, en adelante el MANDANTE o CLIENTE, se presenta el siguiente borrador de mandato específico.`);
   for(const [index,clause] of draftClauses.entries()){
    if(y>240){doc.addPage();y=24;}line(clause[0],11,true);clause.slice(1).forEach(s=>line(s));
    if(index===0){table(['Cantidad','Bien solicitado','Condición'],[[pending,`${p.product.name} — ${p.product.description}`,pending]]);}
    if(index===1)table(['Concepto','Importe'],[['Capital aplicado a la adquisición',e?money(e.capital):pending],['Servicios de Cuenta Hogar',e?money(e.service):pending],['Total contractual',e?money(e.total):pending]]);
    if(index===2){line(e?`Plan guardado: ${e.count} cuotas. Importe por cuota: ${money(e.installment)}.`:'Plan contractual: '+pending);if(p.schedule.length)table(['Cuota','Importe','Vencimiento'],p.schedule.map(r=>[String(r.installmentNumber),money(r.amount),r.dueDate.split('-').reverse().join('/')]));else line('Cronograma: '+pending);}
   }
  }else{
   line('Sin garante',11,true);line('Por '+(e?money(e.total):pending),15,true);
   line(e?amountWords(e.total):'Importe en letras: '+pending,11,true);
   line(`Beneficiario: ${p.issuer.legalName}. CUIT ${p.issuer.taxId}. Nombre comercial: ${p.issuer.tradeName}. Domicilio legal: ${p.issuer.legalAddress}.`,11,true);
   line(noteDraftText,10);
   line('DATOS DEL DEUDOR',11,true);
   for(const s of [`Nombre y apellido: ${c.fullName||pending}`,`DNI: ${c.dni||pending} · CUIL: ${c.cuil||pending}`,`Domicilio: ${c.address||pending}`,`Localidad: ${c.locality||pending} · Provincia: ${c.province||pending} · CP: ${c.postalCode||pending}`,`Contacto: ${c.whatsapp||pending}`,`Lugar y fecha de emisión: ${pending}`,`Domicilio de pago y jurisdicción: ${pending}`])line(s);
   line('La referencia de vinculación con el mandato es el mismo borrador persistido. No se asigna número contractual. Este documento no acredita una firma ni aprobación jurídica.');
  }
  if(kind==='mandate'){
   line('CAMPOS PENDIENTES',11,true);p.pending.forEach(x=>line('- '+x.label,9));
  }
  if(y>237){doc.addPage();y=24;}y+=12;
  line('____________________________________',11);line('Firma física del cliente — NO FIRMAR ESTE BORRADOR',9);
  if(kind==='mandate'){y+=7;line('____________________________________',11);line(`Por ${p.issuer.legalName} — representación pendiente`,9);}
  const pages=doc.getNumberOfPages();
  for(let n=1;n<=pages;n++){doc.setPage(n);doc.setTextColor(150,35,35);doc.setFontSize(9);doc.setFont('helvetica','bold');doc.text(draftWarning,18,12);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('APROBACIÓN JURÍDICA PENDIENTE · SIN EMISIÓN DEFINITIVA',18,282);doc.setTextColor(80);doc.setFontSize(7);doc.text(`${OPERATION_DOCUMENT_VERSION} · Revisión ${p.draftRevision} · ${n}/${pages}`,18,287);doc.text(`Origen ${p.sourceHash.slice(0,20)} · Sin numeración definitiva`,18,291);}
  const bytes=Buffer.from(doc.output('arraybuffer'));return {base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex'),pages};
 };
 return {projection:p,templateVersion:OPERATION_DOCUMENT_VERSION,templateHash,rendererHash,mandate:render('mandate'),promissoryNote:render('promissoryNote')};
}
