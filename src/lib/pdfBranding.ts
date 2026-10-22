import type { jsPDF } from 'jspdf';
import { BRAND_LOGO } from './brand';
import { LOGO_BASE64 } from './logoBase64';
export const PDF_BRAND_RESOURCE_HASH = BRAND_LOGO.sha256;
/** Shared offline PDF presentation. Never called for a promissory note. */
export function drawCuentaHogarLogo(doc:jsPDF,x:number,y:number,size:number) {
  const scale = size / BRAND_LOGO.content;
  doc.saveGraphicsState();
  doc.rect(x,y,size,size,null).clip(); doc.discardPath();
  doc.addImage(LOGO_BASE64,'PNG',x-BRAND_LOGO.inset*scale,y-BRAND_LOGO.inset*scale,BRAND_LOGO.canvas*scale,BRAND_LOGO.canvas*scale,'cuenta-hogar-official','FAST');
  doc.restoreGraphicsState();
}
