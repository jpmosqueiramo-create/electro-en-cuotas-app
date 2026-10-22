import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {jsPDF} from 'jspdf';
import {BRAND_LOGO} from '../src/lib/brand';
import {LOGO_BASE64} from '../src/lib/logoBase64';
import {renderBudgetPdfV2} from '../src/lib/budgetV2Pdf';
import {toClientBudgetV2} from '../src/lib/budgetV2';
import {infrastructureFixture} from './helpers/contractInfrastructureFixtures';
import {projectOperationDraft} from '../src/lib/contractDocuments/operationDraft';
import {generateOperationDraftPair} from '../src/lib/contractDocuments/operationDraftPdf';
import {documentReviewFixture} from './helpers/contractDocumentFixtures';
import {generateContractReviewPair} from '../src/lib/contractDocuments/pdf';
import {generarComprobantePago,generarPagareModelo} from '../src/lib/pdfGenerator';
const dir='/tmp/cuenta-hogar-official-brand';mkdirSync(dir,{recursive:true});
const asset=readFileSync('public/logo-cuenta-hogar-oficial.png');
assert.equal(createHash('sha256').update(asset).digest('hex'),BRAND_LOGO.sha256);
assert.deepEqual(Buffer.from(LOGO_BASE64.split(',')[1],'base64'),asset);
const imageCount=(pdf:string)=>(pdf.match(/\/Subtype\s*\/Image\b/g)||[]).length;
const source=infrastructureFixture('official-brand-synthetic').source;source.draft.productDetails={quantity:1,condition:'NEW'};
const before=JSON.stringify(source),p=projectOperationDraft(source.budget,source.acceptance,source.draft,false,false),pair=generateOperationDraftPair(p);
for(const [name,artifact]of [['mandato',pair.mandate],['pagare',pair.promissoryNote]] as const){const bytes=Buffer.from(artifact.base64,'base64');writeFileSync(`${dir}/${name}.pdf`,bytes);assert.equal(imageCount(bytes.toString('latin1'))>0,name==='mandato');}
assert.equal(JSON.stringify(source),before);assert.equal(pair.mandate.sha256,generateOperationDraftPair(p).mandate.sha256);
const budget=renderBudgetPdfV2(toClientBudgetV2(source.budget));assert.ok(imageCount(budget.output())>0);assert.match(budget.output(),/re\nW\nn/,'Logo clips the original canvas without painting or consuming its clipping path');writeFileSync(dir+'/presupuesto.pdf',Buffer.from(budget.output('arraybuffer')));
const reference=generateContractReviewPair(documentReviewFixture());assert.ok(imageCount(Buffer.from(reference.mandate.bytes).toString('latin1'))>0);assert.equal(imageCount(Buffer.from(reference.promissoryNote.bytes).toString('latin1')),0);
let saved:jsPDF|undefined;const api=jsPDF.API as typeof jsPDF.API & {save:jsPDF['save']};const save=api.save;
function captureDocument(doc:jsPDF){saved=doc;}
function captureSave(this:jsPDF,filename:string,options:{returnPromise:true}):Promise<void>;
function captureSave(this:jsPDF,filename?:string):jsPDF;
function captureSave(this:jsPDF,_filename?:string,options?:{returnPromise:true}):jsPDF|Promise<void>{captureDocument(this);return options?.returnPromise?Promise.resolve():this;}
api.save=captureSave;
try{
 generarComprobantePago({nroContrato:'PRUEBA-SIN-VALIDEZ',nroRecibo:'SINTETICO',fecha:'22/10/2026',clienteNombre:'Persona sintética',clienteDni:'12345678',cuotaNumero:1,cuotasTotal:12,montoAbonado:145000,metodoPago:'TRANSFERENCIA'});
 assert.ok(saved);assert.ok(imageCount(saved.output())>0);saved.setTextColor(180,0,0);saved.setFontSize(8);saved.text('MUESTRA SINTÉTICA — SIN PAGO REAL — NO VÁLIDO',35,6);writeFileSync(dir+'/recibo.pdf',Buffer.from(saved.output('arraybuffer')));
 saved=undefined;generarPagareModelo({nombreComprador:'Persona sintética',dni:'12345678',nroContrato:'SINTETICO',producto:'Producto sintético',domicilio:'Domicilio ficticio',email:'persona@example.test',whatsapp:'5491100000000',nserie:'SINTETICO',precioContado:'100',totalFinanciado:'100',cuotas:'1',importeCuota:'100',primeraCuota:'2027-01-31',tnaComp:'0',tnaPun:'0',lugarFecha:'Lugar sintético',cuotasPlan:[]} as Parameters<typeof generarPagareModelo>[0]);assert.ok(saved);assert.equal(imageCount((saved as jsPDF).output()),0);
}finally{api.save=save;}
writeFileSync(dir+'/manifest.json',JSON.stringify({logoSha256:BRAND_LOGO.sha256,sourceHash:p.sourceHash,projectionHash:p.projectionHash,rendererHash:pair.rendererHash,mandateHash:pair.mandate.sha256,noteHash:pair.promissoryNote.sha256,promissoryNoteImages:0,productionWrites:0},null,2));
console.log('OFFICIAL_BRAND=PASS; ASSET_EXACT; BUDGET_MANDATE_RECEIPT_BRANDED; BOTH_NOTE_RENDERERS_IMAGE_FREE; SOURCE_IMMUTABLE; DETERMINISTIC; NO_WRITES');
