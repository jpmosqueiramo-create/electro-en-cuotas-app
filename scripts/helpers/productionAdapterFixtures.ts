import './requireSafeEmulatorEnvironment';
import {DATA_AUTHORIZATION_VERSION} from '../../src/lib/clientFlowMessages';
import { randomUUID } from 'node:crypto';
import { admin } from '../../src/lib/firebaseAdmin';
import { deliveryFixture } from '../testOperationDeliveryV2Emulator';
import { contractCommand, publicContractData, getContract } from '../../src/lib/contractV2Server';
import { addressPayload } from '../testContractV2';
import { reviewCommand, addDocuments } from '../testCreditReviewV2Emulator';
import { packageHash, templateHash, type FinalPackage, type FinalTemplate, finalDocumentKinds } from '../../src/lib/productionV2/catalog';
import { FINAL_RENDERER_HASH, FINAL_RESOURCES_HASH } from '../../src/lib/productionV2/pdf';
import { originalTemplates } from '../../src/lib/productionV2/originals';
import { contractValueHash } from '../../src/lib/contractIntegrityV2';
export function syntheticFinalPackage(): FinalPackage {
    const issuer = { profileId: 'synthetic-issuer', profileVersion: 'TEST_V1', legalName: 'EMISOR SINTETICO SIN VALIDEZ', tradeName: 'Cuenta Hogar', taxId: 'SYNTHETIC_NOT_A_TAX_ID', legalAddress: 'Domicilio ficticio de prueba', representative: { fullName: 'Representante sintético', capacity: 'Facultad ficticia sin efecto jurídico' } };
    const templates = Object.fromEntries(finalDocumentKinds.map(kind => { const value = { kind, id: 'synthetic-' + kind.toLowerCase(), version: 'SYNTHETIC_PACKAGE_V1', title: kind + ' — EJEMPLAR SINTÉTICO', paragraphs: ['DOCUMENTO SINTÉTICO. NO ES UN TEXTO JURÍDICO APROBADO.', 'Emisor: {{ISSUER_NAME}} · {{ISSUER_CUIT}} · {{ISSUER_ADDRESS}}', 'Cliente: {{CLIENT_NAME}} · DNI {{CLIENT_DNI}} · {{CLIENT_ADDRESS}} · {{CLIENT_LOCALITY}}', 'Producto: {{PRODUCT}} · Cantidad {{QUANTITY}} · {{CONDITION}}', 'Total guardado: {{TOTAL}} ({{TOTAL_WORDS}}).', '{{ISSUE_PLACE}} · {{ISSUE_DATE}} · {{CONTRACT_NUMBER}}', 'Firma sintética del cliente: ____________________'] }; return [kind, { ...value, sha256: templateHash(value) }]; })) as unknown as Record<typeof finalDocumentKinds[number], FinalTemplate>;
    const p = { id: 'synthetic-final-package', version: 'TEST_V1', issuer: { ...issuer, profileHash: contractValueHash(issuer) }, jurisdiction: 'Jurisdicción ficticia de prueba, sin aprobación jurídica', templates, rendererHash: FINAL_RENDERER_HASH, resourcesHash: FINAL_RESOURCES_HASH };
    return { ...p, sha256: packageHash(p) };
}
export async function productionReadyFixture(actor: string, originals = false, skipCredit = false) {
    const db = admin.firestore(), f = await deliveryFixture(), root = { uid: actor, admin: true };
    // Create the original synthetic request explicitly; never look up a person by name.
    const source = db.collection(f.b.sourceCollection).doc(f.b.solicitudId);
    if (!(await source.get()).exists)
        await source.create({ nombre: f.b.clienteSnapshot.nombre, nombreCompleto: f.b.clienteSnapshot.nombre, numeroDni: '12345678', dni: '12345678', localidad: 'Lincoln', productoNombre: 'Producto sintético' });
    async function cmd(action: string, extra: Record<string, unknown> = {}) { const d = (await f.r.draft.get()).data()!; return contractCommand(db, f.id, 1, { action, commandId: randomUUID(), expectedRevision: d.revision, ...extra }, actor); }
    const intake = await cmd('CREATE_CLIENT_DATA_REQUEST');
    await publicContractData(db, intake.requestId!, intake.secret!, { dataAuthorization:{version:DATA_AUTHORIZATION_VERSION,accepted:true}, personalData: { ...addressPayload.personalData, fullName: f.b.clienteSnapshot.nombre }, employmentData: originals ? { ...addressPayload.employmentData, cuil: '20123456786' } : addressPayload.employmentData });
    await cmd('APPLY_CLIENT_SUBMISSION', { submissionId: intake.requestId });
    await cmd('UPDATE_PRODUCT_DETAILS', { productDetails: { quantity: 1, condition: 'NEW' } });
    if(!skipCredit){
    await reviewCommand(f.id, 'VERIFY_IDENTITY', { evidence: 'Identidad sintética verificada sólo en Emulator' });
    await addDocuments(f.id);
    await reviewCommand(f.id, 'DECIDE', { state: 'IN_REVIEW', resolution: 'Revisión sintética', notes: 'No es aprobación real' });
    await reviewCommand(f.id, 'DECIDE', { state: 'APPROVED', resolution: 'Aprobación ficticia', notes: 'No es autorización real' });
    }
    await cmd('SET_CONTRACT_PLAN', { contractPlanCuotas: 12 });
    await cmd('SET_PAYMENT_DATES', { firstInstallmentDueDate: originals ? '2026-12-05' : '2026-12-15', preferredMonthlyDueDay: originals ? 5 : 30 });
    await cmd('RECORD_CLIENT_CONFORMITY', { evidence: 'Conformidad sintética explícita para pruebas, sin efectos reales' });
    const ready = (await cmd('MARK_READY_TO_FORMALIZE')).draft;
    await getContract(db,f.id,1);
    return { ...f, root, ready };
}

/** All values here are fictitious. Never installed in the deployed catalog. */
export function syntheticOriginalPackage(): FinalPackage {
    const { sha256: _, ...base } = syntheticFinalPackage(); void _;
    const p = { ...base, id:'synthetic-originals-integration', templates:originalTemplates(),
        jurisdiction:'CLIENT_DOMICILE_COMPETENT_COURTS', originalsPolicy:{version:'OWNER_ORIGINALS_V1' as const,mandateJurisdiction:'CLIENT_DOMICILE_COMPETENT_COURTS' as const,
        noteJurisdiction:'CIUDAD SINTÉTICA SIN COMPETENCIA REAL',notePaymentPlace:'DOMICILIO SINTÉTICO SIN EFECTO REAL',penaltyMonthlyPercent:'0',
        corporatePowersReference:'EVIDENCIA SINTÉTICA NO REAL',addressAmendmentReference:'EVIDENCIA SINTÉTICA NO REAL',economicAllocationPolicy:'EXPLICIT_RECONCILED_CLIENT_CONFORMITY' as const}};
    return {...p,sha256:packageHash(p)};
}
export const syntheticOriginalFormal = { originalNetManagementLogistics:580000, originalCft:1160000, originalAllocationConformity:'CONFORMIDAD FICTICIA DE CLASIFICACIÓN, NO POLÍTICA COMERCIAL', dispatchOrigin:'Depósito sintético', productSerial:'SIN SERIE — EJEMPLAR SINTÉTICO' };
