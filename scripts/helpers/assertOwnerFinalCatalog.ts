import assert from 'node:assert/strict';
import {validateFinalPackage, type FinalPackage} from '../../src/lib/productionV2/catalog';
import {ownerFinalTemplates,ownerFinalIssuer,OWNER_FINAL_PACKAGE_ID,OWNER_FINAL_PACKAGE_VERSION} from '../../src/lib/productionV2/ownerFinalDocuments';
export function assertOwnerFinalCatalog(packages:readonly FinalPackage[]) {
 assert(packages.length>=1);for(const archived of packages)validateFinalPackage(archived);assert.equal(new Set(packages.map(x=>x.id)).size,packages.length,'No duplicate package identifiers');
 const p=packages[0];validateFinalPackage(p);
 assert.equal(p.id,OWNER_FINAL_PACKAGE_ID);assert.equal(p.version,OWNER_FINAL_PACKAGE_VERSION);
 assert.deepEqual(p.templates,ownerFinalTemplates());assert.deepEqual(p.issuer,ownerFinalIssuer());
 assert.equal(p.deliveryDocumentPolicy,'EXTERNAL_TRANSFER_AND_RECEIPT_V1');
 assert.equal('approval' in p,false,'Catalog data cannot register approval or enable issuance');
}
