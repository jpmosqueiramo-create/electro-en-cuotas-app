import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createHash } from 'node:crypto';
import { drawCuentaHogarLogo } from '../pdfBranding';
import { formatDraftAmount, amountWords } from '../contractDocuments/amountWords';
import { contractValueHash } from '../contractIntegrityV2';
import type { OperationDraftProjection } from '../contractDocuments/operationDraft';
import type { FinalTemplate, FinalPackage, FinalSnapshot, FinalDocumentKind, OriginalsPolicy } from './catalog';
import { originalIssuer, originalTemplates, originalTokenNames } from './originals';
import { assertOriginalSnapshot, usesClientPaymentAddress } from './originalBindings';
import { assertPaymentAddressConformity, contractPaymentAddress, type PaymentAddressConformity } from '../contractPaymentAddress';
const pending = '[PENDIENTE DE VALIDACIÓN]';
function display(s: string) {
    const text=s.normalize('NFC').replace(/\r\n?/g,'\n').replace(/\t/g,'    ').replace(/\u25cf/g,'•');
    if (/[^\x20-\xff\n\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/u.test(text)) throw Error('FINAL_DOCUMENT_UNSUPPORTED_TEXT');
    return text;
}
export function assertOriginalTemplate(t: FinalTemplate) {
    for (const block of t.blocks ?? []) {
        if (!['paragraph','heading','productTable','originalEconomy','originalSchedule','mandateSignatures','debtorAndSignature'].includes(block.type)) throw Error('ORIGINAL_BLOCK_UNKNOWN');
        display(block.text);
        for (const m of block.text.matchAll(/\{\{([^}]+)\}\}/g)) if (!(originalTokenNames as readonly string[]).includes(m[1])) throw Error('FINAL_TEMPLATE_UNKNOWN_VARIABLE');
    }
}
type Data = {
    issuer: FinalPackage['issuer']; customer: {fullName:string;dni:string;cuil:string;address:string;locality:string;province:string;postalCode?:string;email:string;whatsapp:string};
    product: {name:string;description?:string;quantity:number|null;condition:'NEW'|'USED'|null};
    economics: {capital:number;service:number;total:number;count:number;installment:number}|null;
    schedule: readonly {installmentNumber:number;dueDate:string;amount:number}[];
    context: {contractIssueDate?:string;contractIssuePlace?:string;promissoryNoteIssueDate?:string;promissoryNoteIssuePlace?:string};
    parameters: Record<string,unknown>; policy?: OriginalsPolicy; at:string; sourceHash:string; revision:number; number:string|null;
};
/** Same layout and original clause source for review and final issuance. No IO. */
function render(t: FinalTemplate, kind: FinalDocumentKind, d: Data, mode: 'REVIEW'|'TEST'|'FINAL') {
    assertOriginalTemplate(t);
    const doc=new jsPDF({unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true}); let y=30;
    doc.setCreationDate('D:'+d.at.slice(0,19).replace(/\D/g,'')+"+00'00'");
    doc.setFileId(contractValueHash({d,template:t.sha256,mode}).slice(0,32));
    const warning=mode==='REVIEW'?'BORRADOR — NO VÁLIDO PARA FIRMA':mode==='TEST'?'DOCUMENTO DE PRUEBA — SIN VALIDEZ CONTRACTUAL O FISCAL':'';
    doc.setProperties({title:t.title+(mode==='FINAL'?'':' — REVISIÓN'),author:'Cuenta Hogar',subject:warning||String(d.number)});
    const value=(v:unknown)=>{if(v===undefined||v===null||v===''){if(mode!=='REVIEW')throw Error('FINAL_DOCUMENT_VALUE_REQUIRED');return pending;}return String(v);};
    const money=(v:unknown)=>typeof v==='number'?formatDraftAmount(v):value(null);
    const dateParts=(date?:string)=>{const x=date?.split('-');return {day:x?.[2]??pending,month:x?['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][Number(x[1])-1]:pending,year:x?.[0]??pending};};
    const contractDate=dateParts(d.context.contractIssueDate),noteDate=dateParts(d.context.promissoryNoteIssueDate),c=d.customer,e=d.economics;
    const productDescription=[d.product.name,d.product.description].filter(Boolean).join(' — ');
    const values:Record<string,unknown>={
        'issuer.legalName':d.issuer.legalName,'issuer.taxId':d.issuer.taxId,'issuer.legalAddress':d.issuer.legalAddress,
        'representative.fullName':d.issuer.representative.fullName,'representative.capacity':d.issuer.representative.capacity,
        'client.fullName':c.fullName,'client.dni':c.dni,'client.cuil':c.cuil,'client.address':c.address,'client.locality':c.locality,'client.province':c.province,'client.email':c.email,'client.phone':c.whatsapp,
        'issue.contract.place':d.context.contractIssuePlace,'issue.contract.day':contractDate.day,'issue.contract.month':contractDate.month,'issue.contract.year':contractDate.year,
        'issue.note.place':d.context.promissoryNoteIssuePlace,'issue.note.day':noteDate.day,'issue.note.month':noteDate.month,'issue.note.year':noteDate.year,
        'economy.totalDisplay':e?money(e.total):null,'economy.totalWordsWithoutCurrency':e?amountWords(e.total).replace(/ PESOS(?= CON)/,''):null,
        'policy.penaltyMonthlyPercent':d.policy?.penaltyMonthlyPercent,'policy.notePaymentPlace':d.policy?.notePaymentPlace,'policy.noteJurisdiction':d.policy?.noteJurisdiction
    };
    if(usesClientPaymentAddress(t)) values['client.paymentAddress']=contractPaymentAddress(d.customer).display;
    function space(height:number){if(y+height>267){doc.addPage();y=28;}}
    function line(text:string,bold=false,size=10){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(28,40,38);const lines=doc.splitTextToSize(display(text),174) as string[];for(const l of lines){space(size*.45);doc.text(l,18,y);y+=size*.45;}y+=3;}
    function table(head:string[],body:string[][]){space(18);autoTable(doc,{startY:y,head:[head.map(display)],body:body.map(r=>r.map(display)),margin:{left:18,right:18,top:28,bottom:30},styles:{font:'helvetica',fontSize:9,cellPadding:2.5,overflow:'linebreak'},headStyles:{fillColor:[23,62,59]},rowPageBreak:'avoid'});y=(doc as jsPDF&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+6;}
    function signatures(labels:string[]){space(35);y+=17;const width=174/labels.length;doc.setFont('helvetica','normal');doc.setFontSize(9);labels.forEach((label,i)=>{doc.line(18+i*width,y,18+i*width+width-8,y);doc.text(doc.splitTextToSize(display(label),width-8),18+i*width,y+5);});y+=22;}
    line(t.title,true,13);
    line(mode==='REVIEW'?'Propuesta basada en originales · Sin numeración definitiva':String(d.number),false,9);
    if(kind==='PAGARE')line(`Beneficiario: ${d.issuer.legalName} · CUIT ${d.issuer.taxId} · Domicilio legal: ${d.issuer.legalAddress}`,false,9);
    if(kind==='REMITO'){
        line(`${d.issuer.legalName} · CUIT ${d.issuer.taxId}`);line(d.issuer.legalAddress);
        table(['Dato','Detalle'],[['Remito vinculado al mandato',d.number??'Sin numeración definitiva'],['Fecha de emisión',value(d.context.contractIssueDate)],['Origen / depósito',value(d.parameters.dispatchOrigin)],['Destino',`${value(c.address)}, ${value(c.locality)}, ${value(c.province)}`],['Cliente',value(c.fullName)],['DNI / contacto',`${value(c.dni)} / ${value(c.whatsapp)}`],['Producto',value(productDescription)],['Cantidad / condición',`${value(d.product.quantity)} / ${d.product.condition==='NEW'?'NUEVO':d.product.condition==='USED'?'USADO':value(null)}`],['Serie / IMEI (si corresponde)',value(d.parameters.productSerial)]]);
    }
    for(const b of t.blocks??[]){
        if(b.type==='heading'){space(24);line(b.text,true,11);}
        else if(b.type==='productTable')table(['Cantidad','Descripción del Bien (Marca, Modelo, Color)','Estado (Nuevo/Usado)'],[[value(d.product.quantity),value(productDescription),d.product.condition==='NEW'?'NUEVO':d.product.condition==='USED'?'USADO':value(null)]]);
        else if(b.type==='originalEconomy'){
            table(['Concepto original','Importe'],[['Valor Neto del Bien + Gastos de Gestión y Logística',money(d.parameters.originalNetManagementLogistics)],['Costo Financiero Total (CFT)',money(d.parameters.originalCft)],['VALOR TOTAL A FINANCIAR',money(e?.total)]]);
            line(`Importes guardados: Capital aplicado ${money(e?.capital)} · Servicios brutos con IVA incluido ${money(e?.service)} · Total contractual ${money(e?.total)}.`,false,9);
        } else if(b.type==='originalSchedule'){
            table(['Anticipo / Cuota N°','Monto ($)','Fecha de Vencimiento'],[['Anticipo (si lo hubiere)','No previsto en el plan guardado','No corresponde'],['Cuota 1',money(d.schedule[0]?.amount),value(d.schedule[0]?.dueDate)],[`Cuota 2 a ${value(e?.count)}`,money(e?.installment),'Del 1 al 10 de cada mes.']]);
            if(d.schedule.length)table(['Cuota','Importe guardado','Vencimiento guardado'],d.schedule.map(r=>[String(r.installmentNumber),money(r.amount),r.dueDate]));
            else line('Cronograma: '+pending);
            if(mode==='REVIEW'&&d.schedule.slice(1).some(r=>Number(r.dueDate.slice(8,10))>10))line('PENDIENTE: el cronograma guardado difiere del rango 1 al 10 del original. La emisión con esta versión permanece bloqueada.',true,9);
        } else if(b.type==='mandateSignatures')signatures(['Firma y aclaración MANDANTE',`Firma por ${d.issuer.legalName}`]);
        else if(b.type==='debtorAndSignature'){
            line('DATOS DEL DEUDOR',true);for(const text of [`Nombre y apellido: ${value(c.fullName)}`,`D.N.I. / CUIT: ${value(c.dni)} / ${value(c.cuil)}`,`Domicilio: ${value(c.address)}`,`Localidad: ${value(c.locality)}, ${value(c.province)}`,`Teléfono: ${value(c.whatsapp)}`])line(text);signatures(['FIRMA DEL DEUDOR']);
        }else line(b.text.replace(/\{\{([^}]+)\}\}/g,(_,token:string)=>value(values[token])));
    }
    if(kind==='REMITO')signatures(['Firma cliente / receptor\nAclaración:\nDNI:','Firma responsable de despacho\nAclaración:\nDNI / Legajo:']);
    const pages=doc.getNumberOfPages();for(let n=1;n<=pages;n++){doc.setPage(n);if(kind!=='PAGARE')drawCuentaHogarLogo(doc,175,4,16);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(140,30,30);if(warning)doc.text(warning,18,12);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text(`${t.version} · Revisión ${d.revision} · ${n}/${pages}`,18,281);doc.text(`${d.number??'Sin numeración definitiva'} · Origen ${d.sourceHash.slice(0,24)}`,18,287);}
    const bytes=Buffer.from(doc.output('arraybuffer'));return {bytes,sha256:createHash('sha256').update(bytes).digest('hex'),pages};
}
export function renderOriginalFinal(s:FinalSnapshot,p:FinalPackage,kind:FinalDocumentKind,test:boolean){
    assertOriginalSnapshot(s,p);
    return render(p.templates[kind],kind,{issuer:s.issuer,customer:{...s.personalData,cuil:s.employmentData.cuil,province:s.addressInterpretation.provinceDisplayName},product:{name:s.acceptedReference.nombre,description:s.acceptedReference.descripcion,quantity:s.productDetails!.quantity,condition:s.productDetails!.condition},economics:{capital:s.economicTerms.capitalAmount,service:s.economicTerms.serviceAmount,total:s.economicTerms.contractTotal,count:s.economicTerms.contractPlanCuotas,installment:s.economicTerms.contractInstallmentAmount},schedule:s.paymentSchedule.installments,context:s.documentContext,parameters:s.documentContext.parameters,policy:p.originalsPolicy,at:s.freeze.termsFrozenAt,sourceHash:s.integrity.payloadHash,revision:s.sourceDraft.revision,number:s.contractNumber},test?'TEST':'FINAL');
}
/** Never emits a final artifact, even when called with complete data. */
function reviewRenderer(p:OperationDraftProjection, templates:Record<FinalDocumentKind,FinalTemplate>=originalTemplates(), conformity?:PaymentAddressConformity, issuer:Data['issuer']=originalIssuer()){
    if(!p.canPreview)throw Error('ORIGINAL_REVIEW_BLOCKED');
    if(usesClientPaymentAddress(templates.PAGARE))assertPaymentAddressConformity(p.customer,conformity);
    const d:Data={issuer,customer:p.customer,product:p.product,economics:p.economics,schedule:p.schedule,context:{},parameters:{},at:p.updatedAt,sourceHash:p.sourceHash,revision:p.draftRevision,number:null};
    const result=(kind:FinalDocumentKind)=>{const {bytes,...meta}=render(templates[kind],kind,d,'REVIEW');return {...meta,base64:bytes.toString('base64')};};
    return result;
}

/** Historical renderer retained verbatim for reproducibility, never for new issuance. */
export function renderOriginalReview(p:OperationDraftProjection,templates:Record<FinalDocumentKind,FinalTemplate>=originalTemplates(),conformity?:PaymentAddressConformity){
 const result=reviewRenderer(p,templates,conformity);
 return {projection:p,templateVersion:templates.MANDATE.version,templateHash:contractValueHash(templates),mandate:result('MANDATE'),promissoryNote:result('PAGARE'),remito:result('REMITO')};
}
export function renderContractPairReview(p:OperationDraftProjection,templates:Record<FinalDocumentKind,FinalTemplate>,conformity?:PaymentAddressConformity,issuer:Data['issuer']=originalIssuer()){
 const result=reviewRenderer(p,templates,conformity,issuer);
 return {projection:p,templateVersion:templates.MANDATE.version,templateHash:contractValueHash({MANDATE:templates.MANDATE,PAGARE:templates.PAGARE}),mandate:result('MANDATE'),promissoryNote:result('PAGARE')};
}
