import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import {drawCuentaHogarLogo} from './pdfBranding';
import {proposalMoney,proposalDate,type ClientProposal} from './clientProposal';
import source from './productionV2/proposedPackages/loop-consolidated-20261030.json';
/** A proposal for prior acceptance. Does not issue a contract number, note, invoice or receipt. */
export function renderClientProposal(p:ClientProposal,reference:string){
 const doc=new jsPDF({compress:true,putOnlyUsedFonts:true});let y=42;
 doc.setProperties({title:'Propuesta de gestión de compra '+reference,author:'LOOP GESTIÓN INTEGRAL S.R.L.'});
 const money=(n:number)=>proposalMoney(n/100),rate=(n:number|null)=>n===null?'No corresponde':(n*100).toLocaleString('es-AR',{maximumFractionDigits:6})+' %';
 function line(t:string,bold=false){doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(bold?11:9.5);for(const s of doc.splitTextToSize(t,174) as string[]){if(y>270){doc.addPage();y=38;}doc.text(s,18,y);y+=5;}y+=3;}
 function table(head:string[],body:string[][]){autoTable(doc,{startY:y,head:[head],body,margin:{top:38,bottom:24,left:18,right:18},styles:{fontSize:8.5,cellPadding:2},headStyles:{fillColor:[23,62,59]},rowPageBreak:'avoid'});y=(doc as jsPDF&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+8;}
 line('Propuesta de gestión de compra',true);line('LOOP GESTIÓN INTEGRAL S.R.L. - Cuenta Hogar');line('Referencia: '+reference);line('Cliente: '+p.name);line('Domicilio de entrega: '+p.address);
 line(`${p.product} | Cantidad: ${p.quantity} | Condición: ${p.condition}`);line(`Proveedor: ${p.provider} | CUIT: ${p.supplierTaxId}`);
 table(['Concepto','Neto','IVA incluido (21%)','Total'],[['Precio de adquisición','Según factura proveedor','Según factura proveedor',money(p.capitalCents)],...p.services.filter(x=>x.grossCents>0).map(x=>[x.label,money(x.netCents),money(x.vatCents),money(x.grossCents)]),['Precio completo sin financiación','—','—',money(p.cashPriceCents)],['Financiación',money(p.financeNetCents),money(p.financeVatCents),money(p.financeGrossCents)],['TOTAL CONTRACTUAL','—','—',proposalMoney(p.total)]]);
 line(`Plan: ${p.installments} cuotas de ${proposalMoney(p.installmentAmount)}. Primera cuota en la entrega: ${proposalDate(p.firstDueDate)}. Anticipo adicional fuera de cuotas: $ 0.`,true);
 line(`TEA implícita, IVA financiero incluido: ${rate(p.effectiveAnnualRate)}. TNA mensual equivalente de referencia, IVA incluido: ${rate(p.nominalMonthlyAnnualRate)}. Convención: 12 × tasa efectiva mensual equivalente; año de 365 días.`);
 line(`CFT efectivo anual informado: ${p.cftAnnualPercent.toLocaleString('es-AR')} %. Criterio: ${p.cftBasis}.`);
 table(['Cuota','Fecha','Importe','Capital','Interés neto','IVA interés','Saldo'],p.amortization.map(x=>[String(x.installmentNumber),proposalDate(x.dueDate),money(x.paymentCents),money(x.principalCents),money(x.interestNetCents),money(x.interestVatCents),money(x.balanceCents)]));
 line(`Pagaré por ${proposalMoney(p.total)}, con vencimiento único el ${proposalDate(p.noteDueDate)}. Lugar de pago: ${p.notePaymentPlace}. Lugar de emisión: ${p.issuePlace}.`);
 line('Condiciones de la gestión por mandato',true);
 for(const c of source.clauses){line(`${c.number}. ${c.title}`,true);line(c.body);}
 line('La aceptación no limita tus derechos legales como consumidor. La firma física de la documentación se realizará al momento de la entrega.');
 for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);drawCuentaHogarLogo(doc,18,8,22);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('PROPUESTA PARA ACEPTACIÓN | '+reference,44,19,{maxWidth:145});doc.text(`Página ${i} de ${doc.getNumberOfPages()}`,18,287);}
 return Buffer.from(doc.output('arraybuffer'));
}
