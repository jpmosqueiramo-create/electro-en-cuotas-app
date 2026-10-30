/** Local immutable package installation. No Firebase/network operations. */
import {readFileSync,writeFileSync} from 'node:fs';
import {loopFinalTemplates,loopIssuer,LOOP_PACKAGE_ID,LOOP_PACKAGE_VERSION} from '../src/lib/productionV2/loopDocuments';
import {FINAL_RENDERER_HASH,FINAL_RESOURCES_HASH} from '../src/lib/productionV2/pdf';
import {packageHash,validateFinalPackage,type FinalPackage} from '../src/lib/productionV2/catalog';
if(process.argv.slice(2).join(' ')!=='--write')throw Error('Explicit --write required');
const body={id:LOOP_PACKAGE_ID,version:LOOP_PACKAGE_VERSION,issuer:loopIssuer(),jurisdiction:'Tribunales del domicilio real del consumidor, según cláusula 14 del mandato',deliveryDocumentPolicy:'EXTERNAL_TRANSFER_AND_RECEIPT_V1' as const,templates:loopFinalTemplates(),rendererHash:FINAL_RENDERER_HASH,resourcesHash:FINAL_RESOURCES_HASH};
const p:FinalPackage={...body,sha256:packageHash(body)};validateFinalPackage(p);
const path='src/lib/productionV2/finalPackages.json',prior=JSON.parse(readFileSync(path,'utf8')) as FinalPackage[];
for(const old of prior)validateFinalPackage(old);
const existing=prior.find(x=>x.id===p.id);if(existing&&existing.sha256!==p.sha256)throw Error('Immutable package changed: use a new version');
writeFileSync(path,JSON.stringify([p,...prior.filter(x=>x.id!==p.id)],null,2)+'\n');
console.log(JSON.stringify({id:p.id,sha256:p.sha256,productionWrites:0}));
