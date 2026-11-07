import {budgetPdfFilename,type NumberedBudgetClientV2} from "./budgetSharingV2";
import {drawCuentaHogarLogo} from "./pdfBranding";
import {pdfRasterThumbnail} from "./pdfRasterThumbnail";
import {jsPDF} from "jspdf";
import autoTable from "jspdf-autotable";

const money=(value:number)=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:2}).format(value);
const printable=(value:string)=>value.replace(/[\x00-\x1f\x7f]/g," ");
/** Only the existing allowlisted commercial DTO reaches this renderer. No repricing. */
export function renderBudgetPdfV2(dto:NumberedBudgetClientV2):jsPDF{
 const pdf=new jsPDF();
 pdf.setProperties({title:"Cuenta Hogar - Presupuesto",author:"Cuenta Hogar"});
 autoTable(pdf,{
  startY:39,margin:{top:39,left:16,right:16,bottom:30},theme:"plain",
  body:[[ `Cliente: ${printable(dto.cliente.nombre)}` ],[`DNI: ${dto.cliente.dni} · CUIL: ${dto.cliente.cuil}`],[`WhatsApp: ${dto.cliente.whatsapp} · Localidad: ${printable(dto.cliente.localidad)}`]],
  styles:{font:"helvetica",fontSize:10,cellPadding:1.5,textColor:[36,48,46]},
 });
 const startY=(pdf as jsPDF&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+5;
 autoTable(pdf,{
  startY,margin:{top:39,left:16,right:16,bottom:30},
  head:[["Foto","Producto / alternativa","Cuotas estimadas"]],
  body:dto.options.map((option,i)=>["",[`Opción ${i+1} · ${printable(option.nombre)}`,printable(option.descripcion)].filter(Boolean).join("\n\n"),option.planesOfrecidos.map(plan=>`${plan.cuotas} ${plan.cuotas===1?"cuota":"cuotas"} de\n${money(plan.cuotaEstimada)}`).join(option.planesOfrecidos.length<=6?"\n\n":"\n")]),
  styles:{font:"helvetica",fontSize:10,cellPadding:3,minCellHeight:30,valign:"top",overflow:"linebreak",textColor:[36,48,46]},
  headStyles:{minCellHeight:9,fillColor:[23,62,59],textColor:[255,255,255],fontStyle:"bold"},
  alternateRowStyles:{fillColor:[247,245,240]},
  columnStyles:{0:{cellWidth:29},1:{cellWidth:88},2:{cellWidth:61,fontStyle:"bold",fontSize:12,textColor:[23,62,59]}},
  rowPageBreak:"avoid",
  didDrawCell:data=>{
   if(data.section!=="body"||data.column.index!==0)return;
   const size=23,x=data.cell.x+3,y=data.cell.y+3;
   const image=dto.options[data.row.index]?.imagenUrls[0];
   if(image?.startsWith("data:image/")){
    try{const props=pdf.getImageProperties(image),scale=Math.min(size/props.width,size/props.height);pdf.addImage(image,x+(size-props.width*scale)/2,y+(size-props.height*scale)/2,props.width*scale,props.height*scale);return;}catch{/* Preserve the offer and use the official fallback. */}
   }
   drawCuentaHogarLogo(pdf,x,y,size);
  },
 });
 const pages=pdf.getNumberOfPages();
 const date=new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(dto.fecha));
 for(let page=1;page<=pages;page++){
  pdf.setPage(page);drawCuentaHogarLogo(pdf,16,8,23);
  pdf.setFont("helvetica","bold");pdf.setFontSize(14);pdf.setTextColor(23,62,59);pdf.text("Propuesta de gestión de compra",44,15);
  pdf.setFont("helvetica","normal");pdf.setFontSize(9);
  pdf.text(`Presupuesto ${dto.documentNumber??dto.budgetId} · Versión ${dto.version}`,44,22);
  pdf.text(`Fecha: ${date}`,44,28);
  pdf.setFontSize(8);pdf.setTextColor(75,75,75);
  const terms="Las opciones son alternativas independientes. Disponibilidad a confirmar. El plan contractual definitivo se confirma al confeccionar el contrato.";
  pdf.text(pdf.splitTextToSize(terms,178),16,276);
  pdf.text(`Página ${page} de ${pages}`,194,289,{align:"right"});
 }
 return pdf;
}

/** Bounded browser loading, shared with catalog export; no authenticated image requests. */
export async function downloadBudgetPdfV2(dto:NumberedBudgetClientV2):Promise<void>{
 const images:(string|null)[]=Array(dto.options.length).fill(null);let next=0;
 await Promise.all(Array.from({length:Math.min(4,dto.options.length)},async()=>{
  while(next<dto.options.length){const index=next++;images[index]=await pdfRasterThumbnail(dto.options[index].imagenUrls[0]??"");}
 }));
 const options=dto.options.map((option,i)=>({...option,imagenUrls:images[i]?[images[i]!]:[]}));
 renderBudgetPdfV2({...dto,options}).save(budgetPdfFilename(dto));
}
