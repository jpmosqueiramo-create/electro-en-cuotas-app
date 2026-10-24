// Explicit synthetic evidence for read-only preview tests; never imported by application code.
import type { ContractDraftV2 } from '../../src/lib/contractV2';
import { clientTermsDigest } from '../../src/lib/contractV2Server';
import { contractPaymentAddress } from '../../src/lib/contractPaymentAddress';
export function syntheticPreviewConformity(d:ContractDraftV2){
 return {confirmedDigest:clientTermsDigest(d),confirmedPaymentAddressHash:contractPaymentAddress(d.personalData).hash,
  confirmedAt:d.updatedAt,confirmedBy:'synthetic-admin',evidence:'SYNTHETIC ONLY — no real customer conformity'};
}
