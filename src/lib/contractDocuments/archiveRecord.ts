import { contractValueHash } from '../contractIntegrityV2';
import { opaque } from '../contractV2';
import type { ContractSnapshotV2 } from '../contractSnapshotV2';
import type { DocumentArchiveRecord, DocumentKind } from './workflow';
const fail = (): never => { throw new Error('PRIVATE_DOCUMENT_ARCHIVE_INTEGRITY'); };
export const pathFor = (snapshotId: string, setId: string, kind: DocumentKind) => `contract-documents-v2/${opaque(snapshotId)}/${opaque(setId)}/${kind}.pdf`;
export function validateArchiveRecord(record: DocumentArchiveRecord, s: ContractSnapshotV2) {
    if (record.schemaVersion !== 'CONTRACT_DOCUMENT_ARCHIVE_V1' || record.executionMode !== 'EMULATOR_ONLY' || record.legalApproval !== 'PENDING' || record.issuance !== 'REVIEW_ONLY' || !['PENDING','COMPLETE'].includes(record.state) || record.snapshotId !== s.contractSnapshotId || record.snapshotHash !== s.integrity.payloadHash || record.contractNumber !== s.contractNumber || record.manifestHash !== contractValueHash(record.manifest) || record.manifest.schemaVersion !== 'CONTRACT_DOCUMENT_REVIEW_V1' || record.manifest.legalApproval !== 'PENDING' || record.manifest.syntheticOnly !== true || record.manifest.snapshotHash !== s.integrity.payloadHash || record.manifest.contractNumber !== s.contractNumber || contractValueHash(record.manifest.definitions) !== contractValueHash(s.documentDefinitions) || record.documentSetId !== `doc_${record.manifestHash}` || !/^[a-f0-9]{64}$/.test(record.manifestHash) || record.artifacts.length !== 2) fail();
    for (const kind of ['mandate','promissoryNote'] as const) {
      const matches = record.artifacts.filter(a => a.kind === kind); if (matches.length !== 1) fail();
      const a = matches[0], def = s.documentDefinitions[kind === 'mandate' ? 'contract' : 'promissoryNote'];
      if (a.sha256 !== record.manifest.artifacts[kind].sha256 || a.pages !== record.manifest.artifacts[kind].pages || a.storagePath !== pathFor(s.contractSnapshotId,record.documentSetId,kind) || !/^[a-f0-9]{64}$/.test(a.sha256) || a.templateId !== def.templateId || a.templateVersion !== def.templateVersion || a.templateHash !== def.templateHash || a.rendererBundleHash !== def.rendererBundleHash || a.pages !== (kind === 'mandate' ? 2 : 1) || !Number.isSafeInteger(a.size) || a.size < 5 || a.size > 5242880 || (record.state === 'COMPLETE' && !/^\d+$/.test(a.generation ?? ''))) fail();
    }
  }
