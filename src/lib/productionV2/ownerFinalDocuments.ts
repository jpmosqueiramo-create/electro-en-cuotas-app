/** Exact owner-supplied final clauses. Only field substitution; not a professional opinion. */
import source from './proposedPackages/owner-final-uploaded-20261025.json';
import {originalTemplates,originalIssuer} from './originals';
import {templateHash,type FinalTemplate,type FinalDocumentKind} from './catalog';
import {contractValueHash} from '../contractIntegrityV2';
export const OWNER_FINAL_DOCUMENT_VERSION=source.version;
// Technical package revision only: original clauses and template hashes remain V1.
export const OWNER_FINAL_PACKAGE_ID='loop-owner-final-20261025-v3';
export const OWNER_FINAL_PACKAGE_VERSION='OWNER_FINAL_UPLOADED_20261025_V3';
export function ownerFinalTemplates():Record<FinalDocumentKind,FinalTemplate>{
 const templates=originalTemplates();
 for(const kind of ['MANDATE','PAGARE'] as const){
  const document=source.documents[kind];
  const blocks=document.blocks.map(({id,type,text})=>({id,type,text}));
  const body={kind,id:`loop-owner-final-${kind.toLowerCase()}`,version:OWNER_FINAL_DOCUMENT_VERSION,title:document.title,layout:'OWNER_ORIGINALS_V1' as const,blocks,paragraphs:blocks.map(b=>b.text)};
  templates[kind]={...body,sha256:templateHash(body)};
 }
 return templates;
}
export function ownerFinalIssuer(){
 const {profileHash:old,...base}=originalIssuer();void old;
 const body={...base,profileVersion:'LOOP_OWNER_FINAL_UPLOADED_20261025'};
 return {...body,profileHash:contractValueHash(body)};
}
