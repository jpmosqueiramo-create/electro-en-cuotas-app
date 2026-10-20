// An unpersisted, versioned synthetic payload. Never populated from a customer.
import payload from './syntheticSample.json';
import { sealContractSnapshot, type ContractSnapshotV2 } from '../contractSnapshotV2';
import { reviewDocumentDefinitions, generateContractReviewPair } from './pdf';
import { assertContractInfrastructureEmulator } from '../contractInfrastructureEmulator';
export function syntheticDocumentSample() {
  assertContractInfrastructureEmulator();
  const snapshot = sealContractSnapshot({ ...structuredClone(payload), documentDefinitions: reviewDocumentDefinitions() } as Omit<ContractSnapshotV2, 'integrity'>);
  return { snapshot, documents: generateContractReviewPair(snapshot) };
}
