import assert from 'node:assert/strict';
import {validateFinalPackage, type FinalPackage} from '../../src/lib/productionV2/catalog';
import {ownerFinalTemplates,ownerFinalIssuer,OWNER_FINAL_DOCUMENT_VERSION} from '../../src/lib/productionV2/ownerFinalDocuments';
export function assertOwnerFinalCatalog(packages:readonly FinalPackage[]) {
 assert.equal(packages.length,1,'Exactly the owner supplied package; historical proposals remain excluded');
 const p=packages[0];validateFinalPackage(p);
 assert.equal(p.id,'loop-owner-final-20261025-v1');assert.equal(p.version,OWNER_FINAL_DOCUMENT_VERSION);
 assert.deepEqual(p.templates,ownerFinalTemplates());assert.deepEqual(p.issuer,ownerFinalIssuer());
 assert.equal(p.deliveryDocumentPolicy,'EXTERNAL_TRANSFER_AND_RECEIPT_V1');
 assert.equal('approval' in p,false,'Catalog data cannot register approval or enable issuance');
}
