// Emulator-owned adapter. There is deliberately no productive adapter/factory.
import { createHash } from 'node:crypto';
import { Firestore } from 'firebase-admin/firestore';
import { Storage } from '@google-cloud/storage';
import { assertContractInfrastructureEmulator } from '../contractInfrastructureEmulator';
import { contractValueHash } from '../contractIntegrityV2';
import { opaque } from '../contractV2';
import { validateContractSnapshot, type ContractSnapshotV2 } from '../contractSnapshotV2';
import { generateContractReviewPair } from './pdf';
import type { DocumentArchiveRecord, PrivateDocumentArchive } from './workflow';
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const fail = (): never => { throw new Error('PRIVATE_DOCUMENT_ARCHIVE_INTEGRITY'); };
function guard() {
  assertContractInfrastructureEmulator();
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9199' || (process.env.STORAGE_EMULATOR_HOST && process.env.STORAGE_EMULATOR_HOST !== 'http://127.0.0.1:9199')) throw new Error('DOCUMENT_STORAGE_EMULATOR_REQUIRED');
}
import { pathFor,validateArchiveRecord as validate } from './archiveRecord';
export function createPrivateDocumentArchiveEmulator(): PrivateDocumentArchive<ContractSnapshotV2> {
  guard();
  const db = new Firestore({ projectId: 'demo-cuenta-hogar', host: '127.0.0.1:8080', ssl: false });
  const bucket = new Storage({ projectId: 'demo-cuenta-hogar', apiEndpoint: 'http://127.0.0.1:9199', useAuthWithCustomEndpoint: false }).bucket('demo-cuenta-hogar.appspot.com');
  const snapshotRef = (id: string) => db.collection('contractSnapshotsV2').doc(opaque(id));
  async function load(id: string) {
    guard(); const saved = await snapshotRef(id).get(); if (!saved.exists) fail();
    const s = saved.data(); validateContractSnapshot(s); return s;
  }

  return {
    async preserve(s) {
      guard(); validateContractSnapshot(s); const documents = generateContractReviewPair(s), manifestHash = contractValueHash(documents.manifest), documentSetId = `doc_${manifestHash}`;
      const expected: DocumentArchiveRecord = {
        schemaVersion:'CONTRACT_DOCUMENT_ARCHIVE_V1',executionMode:'EMULATOR_ONLY',documentSetId,snapshotId:s.contractSnapshotId,snapshotHash:s.integrity.payloadHash,contractNumber:s.contractNumber,
        manifest:documents.manifest,manifestHash,state:'PENDING',legalApproval:'PENDING',issuance:'REVIEW_ONLY',
        artifacts: (['mandate','promissoryNote'] as const).map(kind => { const artifact=documents[kind],def=s.documentDefinitions[kind==='mandate'?'contract':'promissoryNote'];return {kind,sha256:sha(artifact.bytes),size:artifact.bytes.length,pages:artifact.pages,templateId:def.templateId,templateVersion:def.templateVersion,templateHash:def.templateHash,rendererBundleHash:def.rendererBundleHash,storagePath:pathFor(s.contractSnapshotId,documentSetId,kind),generation:null}; }),
      };
      validate(expected,s);
      const sr = snapshotRef(s.contractSnapshotId), ref = sr.collection('documents').doc(documentSetId);
      const original = await db.runTransaction(async tx => {
        guard();const [source,prior] = await Promise.all([tx.get(sr),tx.get(ref)]);
        if (!source.exists || contractValueHash(source.data()) !== contractValueHash(s)) fail();
        if (prior.exists) {const p=prior.data() as DocumentArchiveRecord;validate(p,s);if(contractValueHash({...p,state:'PENDING',artifacts:p.artifacts.map(a=>({...a,generation:null}))})!==contractValueHash(expected))fail();return p;}
        tx.create(ref,expected); return expected;
      });
      const artifacts: DocumentArchiveRecord['artifacts'] = [];
      for (const artifact of expected.artifacts) {
        guard(); const file = bucket.file(artifact.storagePath);
        try {
          // COMPLETE records must never recreate a missing object under a new generation.
          if (original.state !== 'COMPLETE') await file.save(Buffer.from(documents[artifact.kind].bytes),{resumable:false,preconditionOpts:{ifGenerationMatch:0},metadata:{contentType:'application/pdf',cacheControl:'private, no-store'}});
        } catch (e) {if ((e as {code?:number}).code !== 412) throw e;}
        const [metadata] = await file.getMetadata(), generation = String(metadata.generation);
        if (!/^\d+$/.test(generation) || (original.state==='COMPLETE' && original.artifacts.find(a=>a.kind===artifact.kind)?.generation!==generation)) fail();
        const [bytes] = await bucket.file(artifact.storagePath,{generation}).download();
        if (bytes.length !== artifact.size || sha(bytes) !== artifact.sha256 || metadata.metadata?.firebaseStorageDownloadTokens) fail();
        artifacts.push({...artifact,generation});
      }
      return db.runTransaction(async tx => {
        guard();const [source,prior] = await Promise.all([tx.get(sr),tx.get(ref)]);
        if (!source.exists || contractValueHash(source.data()) !== contractValueHash(s) || !prior.exists) fail();
        const priorRecord=prior.data() as DocumentArchiveRecord;validate(priorRecord,s);
        if(contractValueHash({...priorRecord,state:'PENDING',artifacts:priorRecord.artifacts.map(a=>({...a,generation:null}))})!==contractValueHash(expected))fail();
        const completed:DocumentArchiveRecord={...expected,state:'COMPLETE',artifacts};
        if(priorRecord.state==='COMPLETE'){if(contractValueHash(priorRecord)!==contractValueHash(completed))fail();return priorRecord;}
        tx.set(ref,completed);return completed;
      });
    },
    async read(snapshotId,setId,kind) {
      guard();opaque(setId);if (!['mandate','promissoryNote'].includes(kind)) fail();
      const s = await load(snapshotId), saved = await snapshotRef(snapshotId).collection('documents').doc(setId).get();if(!saved.exists)fail();
      const record=saved.data() as DocumentArchiveRecord;validate(record,s);if(record.documentSetId!==setId||record.state!=='COMPLETE')fail();
      const a=record.artifacts.find(a=>a.kind===kind)!;const [bytes]=await bucket.file(a.storagePath,{generation:a.generation!}).download();
      if(sha(bytes)!==a.sha256||bytes.length!==a.size)fail();return new Uint8Array(bytes);
    },
    async list(snapshotId) {
      const s=await load(snapshotId),list=await snapshotRef(snapshotId).collection('documents').get();
      return list.docs.map(d=>{const record=d.data() as DocumentArchiveRecord;validate(record,s);if(record.documentSetId!==d.id)fail();return record;});
    },
    async close() { await db.terminate(); },
  };
}
