import { mkdirSync,writeFileSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { generateContractReviewPair } from '../src/lib/contractDocuments/pdf';
import { documentReviewFixture } from './helpers/contractDocumentFixtures';
import { createSyntheticReviewServer,reviewPreviewHtml } from './helpers/contractDocumentPreview';
const serve=process.argv.includes('--serve');
const args=process.argv.slice(2).filter(v=>v!=='--serve');
if(args.length>1)throw Error('Usage: previewContractDocuments.ts [output-directory] [--serve]');
const output=resolve(args[0]??'/tmp/cuenta-hogar-contract-documents');
const pair=generateContractReviewPair(documentReviewFixture());
mkdirSync(output,{recursive:true});writeFileSync(join(output,'mandato.pdf'),pair.mandate.bytes);writeFileSync(join(output,'pagare.pdf'),pair.promissoryNote.bytes);writeFileSync(join(output,'manifest.json'),JSON.stringify(pair.manifest,null,2));writeFileSync(join(output,'preview.html'),reviewPreviewHtml());
console.log(`SYNTHETIC_REVIEW_ARTIFACTS = ${output}`);
if(serve){const server=createSyntheticReviewServer(pair);server.listen(4318,'127.0.0.1',()=>console.log('LOCAL_REVIEW = http://127.0.0.1:4318'));for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>server.close());}
