import source from './proposedPackages/loop-consolidated-20261030.json';
import {ownerFinalIssuer} from './ownerFinalDocuments';
import {templateHash,type FinalDocumentKind,type FinalTemplate} from './catalog';
export const LOOP_PACKAGE_ID='loop-consolidated-20261030-v2';
export const LOOP_PACKAGE_VERSION='LOOP_CONSOLIDATED_20261030_V2';
export function loopFinalTemplates():Record<FinalDocumentKind,FinalTemplate>{
 const build=(kind:FinalDocumentKind,title:string,paragraphs:string[]):FinalTemplate=>{
  const value={kind,id:`loop-consolidated-${kind.toLowerCase()}`,version:LOOP_PACKAGE_VERSION,title,layout:'LOOP_CONSOLIDATED_V2' as const,paragraphs};
  return {...value,sha256:templateHash(value)};
 };
 return {MANDATE:build('MANDATE','Contrato de mandato de compra con representación y servicios asociados',[source.sources['01'].text,source.sources['02'].text,source.sources['03'].text,source.sources['04'].text]),PAGARE:build('PAGARE','Pagaré sin protesto | vencimiento único',[source.sources['05'].text]),REMITO:build('REMITO','Anexo III | Remito y constancia de entrega',[source.sources['04'].text])};
}
export const loopIssuer=ownerFinalIssuer;
