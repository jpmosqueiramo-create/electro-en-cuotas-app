import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawCuentaHogarLogo } from "./pdfBranding";
import { catalogPriceListDate, type CatalogPriceListItem } from "./catalogPriceList";

const money = (amount: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(amount);
// Avoid control characters and bound free-text fields to keep table rows printable.
const printable = (value: string, max = 240) => value.replace(/[\x00-\x1f\x7f]/g, " ").slice(0,max);
export function renderCatalogPriceList(items: readonly CatalogPriceListItem[], images: readonly (string | null)[], date: Date): jsPDF {
  const doc = new jsPDF({ compress: true, putOnlyUsedFonts: true });
  doc.setProperties({ title: "Cuenta Hogar - Lista de precios", subject: "Planes del catálogo para vendedores afiliados", author: "Cuenta Hogar" });
  autoTable(doc, {
    startY: 43, margin: { top: 43, bottom: 24, left: 14, right: 14 },
    head: [["Foto", "Producto", "Planes en cuotas estimadas"]],
    body: items.map(item => ["", [printable(item.name), printable(item.brand,80), printable(item.kind,80)].filter(Boolean).join("\n"), item.plans.length ? item.plans.map(plan => `${plan.installments} ${plan.installments === 1 ? "cuota" : "cuotas"} de ${money(plan.amount)}`).join("\n") : item.warning]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3, overflow: "linebreak", minCellHeight: 23, valign: "middle", textColor: [36,48,46] },
    headStyles: { fillColor: [23,62,59], textColor: [255,255,255], minCellHeight: 10 },
    alternateRowStyles: { fillColor: [247,245,240] },
    columnStyles: { 0: { cellWidth: 23, fontSize: 7, halign: "center" }, 1: { cellWidth: 78 }, 2: { cellWidth: 81 } },
    rowPageBreak: "avoid",
    didDrawCell: data => {
      const thumbnail = images[data.row.index];
      if (data.section === "body" && data.column.index === 0) {
        const x=data.cell.x+3,y=data.cell.y+(data.cell.height-17)/2;
        if(thumbnail) doc.addImage(thumbnail,"JPEG",x,y,17,17,undefined,"FAST");
        else drawCuentaHogarLogo(doc,x,y,17);
      }
    },
  });
  const pages = doc.getNumberOfPages();
  for(let page=1;page<=pages;page++) {
    doc.setPage(page); drawCuentaHogarLogo(doc,14,10,21);
    doc.setFont("helvetica","bold");doc.setFontSize(17);doc.setTextColor(23,62,59);doc.text("Cuenta Hogar | Lista de precios",40,18);
    doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text("Gestión de compra - Vendedores afiliados",40,25);
    doc.text(`Emisión: ${catalogPriceListDate(date)} | ${items.length} productos`,40,31);
    doc.setFontSize(8);doc.setTextColor(75,75,75);
    doc.text("Sujeto a disponibilidad y cotización al solicitar la gestión de compra.",14,280);
    doc.text(`Página ${page} de ${pages}`,196,287,{align:"right"});
  }
  return doc;
}

async function thumbnail(url: string): Promise<string | null> {
  if (!url) return null;
  let objectUrl = "";
  try {
    const parsed = new URL(url,window.location.origin);
    // Uploads may legitimately fall back to embedded raster data URLs.
    // Do not allow SVG, HTML, arbitrary schemes or unbounded embedded payloads.
    const embedded = parsed.protocol === "data:";
    if (embedded) {
      if (url.length > 5600000 || !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\r\n]+$/i.test(url)) return null;
    } else if (!["https:","http:"].includes(parsed.protocol)) return null;
    const response = await fetch(parsed.href,{credentials:"omit",signal:AbortSignal.timeout(5000)});
    if (!response.ok || Number(response.headers.get("content-length")) > 4*1024*1024) return null;
    const blob = await response.blob();
    if (blob.size>4*1024*1024 || !/^image\/(png|jpeg|webp)$/.test(blob.type)) return null;
    objectUrl = URL.createObjectURL(blob);
    const img = new Image();img.src=objectUrl;await img.decode();
    if (!img.width || !img.height || img.width*img.height>40000000) return null;
    const canvas=document.createElement("canvas");canvas.width=160;canvas.height=160;
    const context=canvas.getContext("2d");if(!context)return null;
    context.fillStyle="#ffffff";context.fillRect(0,0,160,160);
    const scale=Math.min(160/img.width,160/img.height);
    context.drawImage(img,(160-img.width*scale)/2,(160-img.height*scale)/2,img.width*scale,img.height*scale);
    return canvas.toDataURL("image/jpeg",0.8);
  } catch { return null; } finally { if(objectUrl)URL.revokeObjectURL(objectUrl); }
}
export async function loadCatalogPriceListImages(items: readonly CatalogPriceListItem[], progress: (done:number)=>void): Promise<(string|null)[]> {
  const images: (string|null)[] = Array(items.length).fill(null);let next=0,done=0;
  await Promise.all(Array.from({length:Math.min(4,items.length)},async()=>{
    while(next<items.length){const index=next++;images[index]=await thumbnail(items[index].imageUrl);progress(++done);}
  }));return images;
}
