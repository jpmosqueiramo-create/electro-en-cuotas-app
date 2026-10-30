import {budgetPdfFilename} from "./budgetSharingV2";
import { drawCuentaHogarLogo } from "./pdfBranding";
import { jsPDF } from "jspdf";
import { budgetClientLines, type BudgetClientV2 } from "./budgetV2";
/** Only an allowlisted commercial DTO reaches this renderer. */
export function renderBudgetPdfV2(dto:BudgetClientV2):jsPDF{
  const pdf=new jsPDF();let y=40;
  drawCuentaHogarLogo(pdf,16,8,24);
  pdf.setFontSize(11);
  for(const text of budgetClientLines(dto)){
    const lines=pdf.splitTextToSize(text,178) as string[];
    for(const line of lines){if(y>276){pdf.addPage();drawCuentaHogarLogo(pdf,16,8,24);y=40;}pdf.text(line,16,y);y+=6;}
    y+=3;
  }
  for(const option of dto.options){
    const image=option.imagenUrls[0];
    if(image?.startsWith("data:image/")){
      try{pdf.addPage();drawCuentaHogarLogo(pdf,16,8,24);pdf.text(option.nombre,16,40);pdf.addImage(image,16,48,100,100);}catch{/* Preserve the textual offer when an image cannot be decoded. */}
    }
  }
  return pdf;
}

/** Browser-only image loading from the client DTO; never requests Firebase credentials. */
export async function downloadBudgetPdfV2(dto:BudgetClientV2):Promise<void>{
  const options=await Promise.all(dto.options.map(async option=>{
    const url=option.imagenUrls[0];if(!url||url.startsWith("data:image/"))return option;
    try{
      const response=await fetch(url,{credentials:"omit",signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw new Error("Image unavailable");
      const blob=await response.blob();if(blob.size>4*1024*1024||!/^image\/(png|jpeg|webp)$/.test(blob.type))return option;
      const image=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Image unavailable"));reader.readAsDataURL(blob);});
      return {...option,imagenUrls:[image]};
    }catch{return option;}
  }));
  renderBudgetPdfV2({...dto,options}).save(budgetPdfFilename(dto));
}
