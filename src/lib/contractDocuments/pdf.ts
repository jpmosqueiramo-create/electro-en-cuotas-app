// Offline review renderer. Does not persist, download, email or publish anything.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { drawCuentaHogarLogo,PDF_BRAND_RESOURCE_HASH } from '../pdfBranding';
import { jsPDF } from 'jspdf';
import { contractValueHash } from '../contractIntegrityV2';
import type { ContractSnapshotV2,ContractDocumentDefinitionV2 } from '../contractSnapshotV2';
import { projectContractReview,PROJECTION_SOURCE_SHA256,type ContractReviewProjection } from './projection';
import { templates,referenceCopy,referencePdfHashes,REVIEW_WARNING,type ReviewDocumentKind } from './templates';
const layout=Object.freeze({format:'a4',margin:15,font:'Helvetica',fontSize:8,bodyBottom:278,renderer:'CONTRACT_REFERENCE_REVIEW_PDF_V2'});
const rendererHash=contractValueHash({pdfSource:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),projectionSource:PROJECTION_SOURCE_SHA256,jsPDF:jsPDF.version,brand:{resource:PDF_BRAND_RESOURCE_HASH,render:drawCuentaHogarLogo.toString()},layout});
export function reviewDocumentDefinitions():ContractSnapshotV2['documentDefinitions']{
 const definition=(kind:ReviewDocumentKind):ContractDocumentDefinitionV2=>({templateId:templates[kind].id,templateVersion:templates[kind].version,templateHash:contractValueHash({warning:REVIEW_WARNING,referenceCopy,referencePdfHashes,...templates[kind]}),rendererBundleId:layout.renderer,rendererBundleHash:rendererHash,resourcesManifestHash:contractValueHash(layout),legalApprovalId:'SYNTHETIC_NOT_A_LEGAL_APPROVAL'});
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
 doc.setCreationDate("D:"+p.technicalFrozenAt.slice(0,19).replace(/\D/g,'')+"+00'00'");
 doc.setFileId(contractValueHash({kind,p,template,rendererHash}).slice(0,32));
 doc.setProperties({title:`${template.title} - ${p.contractNumber} - BORRADOR`,subject:'Formato de referencia; revisión jurídica pendiente; datos sintéticos',author:'Cuenta Hogar - revisión técnica',creator:layout.renderer});
 const ink=[15,23,42] as const,body=[51,65,85] as const,border=[203,213,225] as const;
 let y=30;
 function text(value:string,x:number,at:number,size=8,color:readonly number[]=body,width=180){
  doc.setFont('helvetica','normal');doc.setFontSize(size);doc.setTextColor(color[0],color[1],color[2]);
  const lines=doc.splitTextToSize(value,width) as string[];
  doc.text(lines,x,at,{lineHeightFactor:1.15});return lines.length*size*0.352778*1.15;
 }
 function paragraph(value:string,size=8,gap=4){y+=text(value,15,y,size);y+=gap;}
 function heading(key:keyof typeof referenceCopy.clauses){paragraph(referenceCopy.clauses[key].heading,9,2);}
 function clause(key:keyof typeof referenceCopy.clauses){heading(key);paragraph(referenceCopy.clauses[key].text);}
 function box(x:number,at:number,w:number,h:number,fill:readonly number[]){doc.setFillColor(fill[0],fill[1],fill[2]);doc.setDrawColor(...border);doc.setLineWidth(0.25);doc.rect(x,at,w,h,'FD');}
 function requireFits(bottom:number){if(y>bottom)throw Error('REFERENCE_FORMAT_CONTENT_OVERFLOW');}
 if(kind==='mandate'){
  box(130,12,65,12,[219,234,254]);text('N° de Contrato / Legajo:',132,15.5,7.5,[100,116,139],61);text(p.contractNumber,132,20.5,9,ink,61);
  text('CONTRATO DE MANDATO COMERCIAL Y',15,17,13,ink,113);text('GESTIÓN DE COMPRA',15,23,13,ink);
  paragraph(`Entre LOOP GESTIÓN INTEGRAL S.R.L. (operando comercialmente bajo su nombre de fantasía "Cuenta Hogar"), CUIT N° [PENDIENTE], con domicilio legal [PENDIENTE], representada en este acto por [REPRESENTACIÓN PENDIENTE], en adelante denominado el "MANDATARIO" o la "EMPRESA", por una parte; y por la otra el/la Sr./Sra. ${p.customer.fullName}, D.N.I. N° ${p.customer.dni}, CUIT/CUIL N° [NO CONSTA EN SNAPSHOT], con domicilio en la calle ${p.customer.address}, de la localidad de ${p.customer.locality} (CP ${p.customer.postalCode}), provincia de ${p.customer.province}, correo electrónico ${p.customer.email}, teléfono ${p.customer.whatsapp}, en adelante denominado el "MANDANTE" o el "CLIENTE", convienen en celebrar el presente Contrato de Mandato Comercial, sujeto a las disposiciones del Código Civil y Comercial de la Nación y a las siguientes cláusulas y condiciones:`,8.5,5);
  y+=text('CLÁUSULAS Y CONDICIONES',15,y,11,[30,58,138]);y+=3;
  clause('1');
  const productLines=doc.splitTextToSize(`${p.reference.name}. ${p.reference.description}`,105) as string[],rh=Math.max(8,productLines.length*3.25+3);
  box(15,y,180,6,[241,245,249]);text('Cantidad',18,y+4.5,8,ink,25);text('Descripción del Bien (Marca, Modelo, Color)',45,y+4.5,8,ink,105);text('Estado (Nuevo/Usado)',155,y+4.5,8,ink,38);y+=6;
  box(15,y,180,rh,[255,255,255]);text('Pendiente',18,y+5,7.5,body,25);text(productLines.join('\n'),45,y+5,8,ink,105);text('Pendiente',157,y+5,8,body,35);y+=rh+4;
  paragraph(referenceCopy.intermediary,7.5,1);paragraph(referenceCopy.billing,7.5,6);
  clause('2');
  // Approved V2 breakdown: display frozen amounts without any legacy allocation.
  box(15,y,180,6,[241,245,249]);text('Concepto',18,y+4.5,8,ink,120);text('Importe ($)',145,y+4.5,8,ink,47);y+=6;
  for(const [label,amount] of [['Capital aplicado a la compra',p.economics.capital],['Servicios de Cuenta Hogar',p.economics.service],['Total contractual',p.economics.total]] as const){
   box(15,y,180,5,[255,255,255]);text(label,18,y+3.8,8,ink,120);text(money(amount),145,y+3.8,8,ink,47);y+=5;
  }
  y+=5;
  clause('3');
  const scheduleTop=y;
  box(15,y,180,6,[241,245,249]);text('Anticipo / Cuota N°',20,y+4.5,8,ink,60);text('Monto ($)',90,y+4.5,8,ink,45);text('Fecha de Vencimiento',145,y+4.5,8,ink,48);y+=6;
  // Column-major order preserves the materialized chronology: left, then right.
  const groups=[p.schedule.slice(0,1),p.schedule.slice(1)].filter(rows=>rows.length);
  for(const [groupIndex,rows] of groups.entries()){
   const split=Math.ceil(rows.length/2),gridRows=groupIndex===0?1:split;
   const height=groupIndex===0?6:Math.max(6,gridRows*3.5),rowHeight=height/gridRows;
   box(15,y,180,height,[255,255,255]);text(rows.length===1?`Cuota ${rows[0].number}`:`Cuota ${rows[0].number} a ${rows.at(-1)!.number}`,20,y+4,8,ink,60);text(money(rows[0].amount),90,y+4,8,ink,48);
   if(groupIndex===0){text(`${rows[0].number}: ${date(rows[0].date)}`,145,y+4,7.5,ink,48);}
   else{
    const columnWidth=27.5;
    doc.setDrawColor(...border);doc.setLineWidth(0.15);doc.line(167.5,y,167.5,y+height);
    for(let row=1;row<gridRows;row++)doc.line(140,y+row*rowHeight,195,y+row*rowHeight);
    for(const [column,entries] of [rows.slice(0,split),rows.slice(split)].entries()){
     for(const [index,row] of entries.entries()){
      const x=142+column*columnWidth,baseline=y+index*rowHeight+Math.min(4,rowHeight-0.9);
      text(`${row.number}:`,x,baseline,7.5,ink,5);
      text(date(row.date),x+6,baseline,7.5,ink,columnWidth-10);
     }
    }
   }
   y+=height;
  }
  doc.setDrawColor(...border);doc.setLineWidth(0.25);
  for(const x of [85,140])doc.line(x,scheduleTop,x,y);
  y+=4;paragraph(referenceCopy.guarantee,8,5);clause('4');clause('5');requireFits(278);
  doc.addPage();y=20;
  // Preserve the reference's explicit page break before clause SIXTH.
  heading('6');const sixth=referenceCopy.clauses['6'].text,split=sixth.indexOf('Se deja expresa constancia');paragraph(sixth.slice(0,split).trim(),8,6);paragraph(sixth.slice(split),8,6);
  for(const [key,at] of [['7',74.8],['8',100],['9',129],['10',154.2]] as const){requireFits(at-2);y=at;clause(key);}
  paragraph(`En prueba de plena conformidad, se firman dos (2) ejemplares de un mismo tenor y a un solo efecto en la ciudad/provincia de ${p.testIssue.mandate.place}, ${date(p.testIssue.mandate.date)}.`,8,14);
  requireFits(197.2);y=197.2;doc.setDrawColor(148,163,184);doc.line(15,y,90,y);doc.line(115,y,190,y);y+=5;text('Firma y Aclaración MANDANTE',15,y,8.5,ink,78);text('Por LOOP GESTIÓN INTEGRAL S.R.L.',115,y,8.5,ink,80);y+=5;text(`D.N.I. N°: ${p.customer.dni}`,15,y,7.5,[100,116,139],78);text('Representación pendiente de validación',115,y,7.5,[100,116,139],80);
 }else{
  doc.setFillColor(...ink);doc.rect(15,12,180,22,'F');
  doc.setFont('helvetica','normal');doc.setFontSize(14);doc.setTextColor(234,179,8);doc.text(template.title,105,22,{align:'center'});
  text('Garantía Ejecutiva de Cumplimiento de Obligaciones de Mandato Comercial',54.5,28,8,[226,232,240],140);
  text(`Contrato N° ${p.contractNumber}`,15,38,8,ink,105);
  box(130,38,65,12,[241,245,249]);doc.setDrawColor(...ink);doc.setLineWidth(0.4);doc.rect(130,38,65,12,'S');text('POR $ [PENDIENTE]',135,45.5,11,ink,57);
  y=45;paragraph(`Lugar y fecha de emisión: ${p.testIssue.promissoryNote.place}, ${date(p.testIssue.promissoryNote.date)}`,9,8);
  paragraph(referenceCopy.notePromise,9,2);paragraph('LOOP GESTIÓN INTEGRAL S.R.L. (CUIT PENDIENTE)',10,2);
  paragraph('o a su orden, la cantidad de PESOS: [IMPORTE PENDIENTE] (Son PESOS: [PENDIENTE]).',9,5);
  paragraph(referenceCopy.noteReason,9,5);paragraph(referenceCopy.noteArrears,8.5,6);
  const start=y;box(15,y,180,36,[248,250,252]);text('DATOS DEL LIBRADOR / DEUDOR PRINCIPAL:',20,y+6,9,ink,170);
  const customerRows=[['Nombre y Apellido: '+p.customer.fullName,'DNI: '+p.customer.dni],['Domicilio: '+p.customer.address,'Localidad: '+p.customer.locality],['Código Postal: '+p.customer.postalCode,'Teléfono / WhatsApp: '+p.customer.whatsapp]];
  let offset=13;for(const row of customerRows){const height=Math.max(text(row[0],20,start+offset,8.5,body,90),text(row[1],115,start+offset,8.5,body,75));offset+=Math.max(7,height+1);}
  offset+=text('Email: '+p.customer.email,20,start+offset,8.5,body,170);if(offset>38)throw Error('REFERENCE_FORMAT_CONTENT_OVERFLOW');
  y=start+44;doc.setDrawColor(148,163,184);doc.line(60,y,150,y);y+=5;text('Firma del Librador / Deudor Principal',78.5,y,8.5,ink,112);y+=5;y+=text(`Aclaración Manuscrita y DNI: ${p.customer.fullName} (DNI: ${p.customer.dni})`,61,y,7.5,[100,116,139],133);
  y+=12;paragraph(`Importe propuesto del pagaré — referencia técnica pendiente de aprobación jurídica: ${money(p.economics.total)}.`,8,3);paragraph('Importe, vencimiento/exigibilidad, lugar y fecha de emisión del título: PENDIENTES de confirmación jurídica. No se presume el total contractual como importe del pagaré.',8,3);requireFits(264);
 }
 const pages=doc.getNumberOfPages();for(let pageNo=1;pageNo<=pages;pageNo++){
  doc.setPage(pageNo);if(kind==='mandate')drawCuentaHogarLogo(doc,180,1,10);text(REVIEW_WARNING,15,6,7,[153,27,27],180);
  text('DATOS SINTÉTICOS — CLÁUSULAS DE REFERENCIA, NO APROBADAS — NO FIRMAR',15,282,7,[153,27,27],180);
  text('Identidad de LOOP pendiente de validación documental. Parámetros legales pendientes.',15,286,7,body,180);
  text(`${p.contractNumber} | ${pageNo} / ${pages} | ${template.version}`,15,290,6.5,[100,116,139],180);
 }
 return {bytes:new Uint8Array(doc.output('arraybuffer')),pages};
}
export function generateContractReviewPair(snapshot:ContractSnapshotV2){
 if(process.env.NODE_ENV==='production')throw Error('PRODUCTION_DOCUMENT_ISSUANCE_DISABLED');
 if(contractValueHash(snapshot.documentDefinitions)!==contractValueHash(reviewDocumentDefinitions()))throw Error('REVIEW_TEMPLATE_PACKAGE_MISMATCH');
 const projection=projectContractReview(snapshot),projectionHash=contractValueHash(projection),mandate=render('mandate',projection),promissoryNote=render('promissoryNote',projection);
 return {mandate,promissoryNote,manifest:{schemaVersion:'CONTRACT_DOCUMENT_REVIEW_V1',legalApproval:'PENDING',syntheticOnly:true,contractNumber:projection.contractNumber,snapshotHash:projection.snapshotHash,projectionHash,definitions:reviewDocumentDefinitions(),artifacts:{mandate:{sha256:createHash('sha256').update(mandate.bytes).digest('hex'),pages:mandate.pages},promissoryNote:{sha256:createHash('sha256').update(promissoryNote.bytes).digest('hex'),pages:promissoryNote.pages}}}};
}
