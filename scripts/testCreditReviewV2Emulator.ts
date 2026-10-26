import './helpers/requireSafeEmulatorEnvironment';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { admin } from '../src/lib/firebaseAdmin';
import { contractEconomics,contractSchedule } from '../src/lib/contractV2';
import { fixture,addressPayload } from './testContractV2';
import { persistPublicSolicitud } from '../src/lib/publicSolicitudService';
import { parsePublicSolicitud } from '../src/lib/publicSolicitud';
import { resolveAlertAction } from '../src/lib/budgetAlertRouting';
import { publicFixture } from './helpers/catalogC4Fixtures';
import { acceptBudgetV2 } from '../src/lib/budgetAcceptanceV2Server';
import { contractCommand,contractRefs,publicContractData } from '../src/lib/contractV2Server';
import { readCreditReview,creditCommand,creditRefs,listVerifiedProfiles,reusableDocumentSource } from '../src/lib/creditReviewV2Server';
import { requiredDocuments } from '../src/lib/creditReviewV2';
import { uploadBudgetDocument,documentationBucketName,downloadBudgetDocument,deleteBudgetDocument } from '../src/lib/budgetDocumentationStorage';
import * as documentRoute from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/credit-document/[type]/route';
import * as route from '../src/app/api/admin/presupuestos-v2/[budgetId]/versions/[version]/credit-review/route';
export const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1EAAAAASUVORK5CYII=','base64');
export async function createCreditCase(id='credit-'+randomUUID(),dni='12345678'){
 const db=admin.firestore(),input={tipo:'consulta_v2',productoNombre:'Referencia ficticia',nombreCompleto:'Cliente sintético',whatsapp:'5491100000000',localidad:'Lincoln'},source=await persistPublicSolicitud(db,randomUUID(),input,async()=>{});
 const {b}=fixture(id);b.sourceCollection='solicitudes_cuenta';b.solicitudId=source.id;const r=contractRefs(db,id,1);await r.family.create({lastVersion:1});await r.budget.create(b);
 await acceptBudgetV2(db,{budgetId:id,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'synthetic-admin');
 let d=(await contractCommand(db,id,1,{action:'OPEN_OR_CREATE',commandId:'open'},'synthetic-admin')).draft;
 const req=await contractCommand(db,id,1,{action:'CREATE_CLIENT_DATA_REQUEST',commandId:'request',expectedRevision:d.revision},'synthetic-admin');d=req.draft;
 const body={personalData:{...addressPayload.personalData,dni},employmentData:addressPayload.employmentData};
 await publicContractData(db,req.requestId!,req.secret!,body);d=(await contractCommand(db,id,1,{action:'APPLY_CLIENT_SUBMISSION',submissionId:req.requestId,commandId:'apply',expectedRevision:d.revision},'synthetic-admin')).draft;
 return {id,b,r,d,source};
}
export async function reviewCommand(id:string,action:string,extra:Record<string,unknown>,commandId=randomUUID()){
 const view=await readCreditReview(admin.firestore(),id,1);return creditCommand(admin.firestore(),id,1,{action,expectedRevision:view.review?.revision??0,expectedProfileRevision:view.profile?.revision??0,commandId,...extra},'synthetic-admin');
}
export async function addDocuments(id:string){const db=admin.firestore(),bucket=admin.storage().bucket(documentationBucketName());for(const type of requiredDocuments){const a=await uploadBudgetDocument(db,bucket,id,1,type,{commandId:randomUUID(),originalName:'sintetico.png',mimeType:'image/png'},png,'synthetic-admin');await reviewCommand(id,'REVIEW_DOCUMENT',{type,attachmentId:a.attachmentId,status:'VERIFIED',validUntil:'2099-12-31',note:'Revisión sintética en Emulator'});}}
async function assertPreparationBlocked(id:string){
 const db=admin.firestore(),r=contractRefs(db,id,1),before=await r.draft.get(),commands=await r.draft.collection('commands').get();
 for(const payload of [{action:'MARK_READY_TO_FORMALIZE'}])await assert.rejects(()=>contractCommand(db,id,1,{...payload,commandId:randomUUID(),expectedRevision:before.data()!.revision},'synthetic-admin'),/evaluación crediticia/);
 const after=await r.draft.get();assert.deepEqual(after.data(),before.data());assert.ok(after.updateTime!.isEqual(before.updateTime!));assert.equal((await r.draft.collection('commands').get()).size,commands.size);
 const e=contractEconomics({...before.data()!.acceptedReferenceSnapshot,imagenUrls:[]},8),schedule=contractSchedule(e,'2027-01-31',31);
 assert.equal(schedule[1].dueDate,'2027-02-28');assert.equal(schedule.reduce((sum,row)=>sum+row.amount,0),e.contractTotal);
 assert.ok((await r.draft.get()).updateTime!.isEqual(before.updateTime!));
}
export async function tests(){
 const db=admin.firestore();delete process.env.PUBLIC_SOLICITUDES_RATE_LIMIT_ENABLED;
 const minimal={tipo:'consulta_v2',nombreCompleto:'Consulta sintética',whatsapp:'5491100000000',localidad:'Lincoln',productoNombre:'Producto ficticio'};
 assert.equal(parsePublicSolicitud(minimal).numeroDni,undefined);for(const extra of ['numeroDni','cuil','fechaNacimiento','direccion','ocupacion','email'])assert.throws(()=>parsePublicSolicitud({...minimal,[extra]:'no requerido'}));
 for(const key of ['nombreCompleto','whatsapp','localidad','productoNombre'])assert.throws(()=>parsePublicSolicitud({...minimal,[key]:''}));
 const sid=randomUUID();const sent=await Promise.all([persistPublicSolicitud(db,sid,minimal),persistPublicSolicitud(db,sid,minimal)]);assert.equal(sent.filter(s=>!s.replay).length,1);const alert=(await db.collection('alertas_admin').doc('web_'+sid).get()).data()!;assert.equal(alert.tipo,'CONSULTA_PUBLICA_V2');assert.equal(resolveAlertAction(alert)?.href,'/admin/solicitudes/solicitudes_cuenta/web_'+sid);assert.equal(resolveAlertAction({...alert,sourceCollection:'solicitudes'}),null);
 const dto=publicFixture('credit-public-'+randomUUID(),'Referencia de consulta'),plan=dto.planesPublicados[0];await db.collection('catalogo_publico').doc(dto.referenciaId).create(dto);
 const catalog={...minimal,productoNombre:dto.nombre,productoId:dto.referenciaId,planElegido:String(plan.cuotas),montoCuota:plan.cuotaEstimada};const cid=randomUUID();await persistPublicSolicitud(db,cid,catalog,async()=>{});assert.equal((await db.collection('solicitudes_cuenta').doc('web_'+cid).get()).data()!.montoCuota,plan.cuotaEstimada);
 const pendingId='credit-pending-'+randomUUID(),pendingFixture=fixture(pendingId),pendingRefs=contractRefs(db,pendingId,1);await pendingRefs.budget.create(pendingFixture.b);await acceptBudgetV2(db,{budgetId:pendingId,version:1,acceptedOptionId:'option-1',preferredPlanCuotas:12,commandId:'accept'},'synthetic-admin');assert.equal((await readCreditReview(db,pendingId,1)).state,'PENDING_DATA');await assert.rejects(()=>reviewCommand(pendingId,'VERIFY_IDENTITY',{evidence:'Faltan datos'}),/formulario/);await assert.rejects(()=>reviewCommand(pendingId,'DECIDE',{state:'APPROVED',resolution:'No debe aprobar',notes:'Faltan documentos'}),/documentación/);assert.equal((await pendingRefs.draft.get()).exists,false);await contractCommand(db,pendingId,1,{action:'OPEN_OR_CREATE',commandId:randomUUID()},'synthetic-admin');await assertPreparationBlocked(pendingId);
 const noPlan=await persistPublicSolicitud(db,randomUUID(),{...minimal,productoNombre:dto.nombre,productoId:dto.referenciaId},async()=>{});const captured=(await db.collection('solicitudes_cuenta').doc(noPlan.id).get()).data()!;assert.equal(captured.productoId,dto.referenciaId);assert.equal(captured.planElegido,undefined);assert.equal(captured.montoCuota,undefined);
 const first=await createCreditCase();const before=JSON.stringify({b:(await first.r.budget.get()).data(),a:(await first.r.acceptance.get()).data()}),btime=(await first.r.budget.get()).updateTime!.toMillis();
 first.d=(await contractCommand(db,first.id,1,{action:'SET_CONTRACT_PLAN',contractPlanCuotas:12,commandId:'draft-plan-before-credit',expectedRevision:first.d.revision},'synthetic-admin')).draft;assert.equal(first.d.status,'DRAFT');
 await reviewCommand(first.id,'VERIFY_IDENTITY',{evidence:'Verificación documental sintética'});assert.equal((await readCreditReview(db,first.id,1)).state,'PENDING_DOCUMENTS');await assertPreparationBlocked(first.id);await addDocuments(first.id);
 assert.equal((await readCreditReview(db,first.id,1)).approved,false);
 await reviewCommand(first.id,'DECIDE',{state:'IN_REVIEW',resolution:'Evaluación iniciada',notes:'Sólo prueba'});
 await assertPreparationBlocked(first.id);
 await reviewCommand(first.id,'DECIDE',{state:'MORE_INFORMATION',resolution:'Solicitar aclaración',notes:'Sólo prueba'});
 await reviewCommand(first.id,'DECIDE',{state:'IN_REVIEW',resolution:'Información revisada',notes:'Sólo prueba'});
 const view=await readCreditReview(db,first.id,1),payload={action:'DECIDE',expectedRevision:view.review!.revision,expectedProfileRevision:view.profile!.revision,commandId:randomUUID(),state:'APPROVED',resolution:'Decisión manual sintética',notes:'No es aprobación real'};
 const results=await Promise.all([creditCommand(db,first.id,1,payload,'synthetic-admin'),creditCommand(db,first.id,1,payload,'synthetic-admin')]);assert.deepEqual(results[0],results[1]);const time=(await creditRefs(db,first.id,1).review.get()).updateTime!.toMillis();await creditCommand(db,first.id,1,payload,'synthetic-admin');assert.equal((await creditRefs(db,first.id,1).review.get()).updateTime!.toMillis(),time);
 await assert.rejects(()=>creditCommand(db,first.id,1,{...payload,notes:'otro'},'synthetic-admin'),/Conflicto/);
 assert.equal((await readCreditReview(db,first.id,1)).approved,true);
 let approvedDraft=(await contractCommand(db,first.id,1,{action:'SET_CONTRACT_PLAN',contractPlanCuotas:12,commandId:'allowed',expectedRevision:first.d.revision},'synthetic-admin')).draft;
 approvedDraft=(await contractCommand(db,first.id,1,{action:'SET_PAYMENT_DATES',firstInstallmentDueDate:'2027-01-31',preferredMonthlyDueDay:31,commandId:randomUUID(),expectedRevision:approvedDraft.revision},'synthetic-admin')).draft;
 assert.equal(approvedDraft.paymentScheduleDraft.length,12);assert.equal(approvedDraft.paymentScheduleDraft[1].dueDate,'2027-02-28');assert.equal(approvedDraft.paymentScheduleDraft.reduce((sum,row)=>sum+row.amount,0),approvedDraft.economicTerms!.contractTotal);
 await contractCommand(db,first.id,1,{action:'UPDATE_EMPLOYMENT_DATA',employmentData:{...approvedDraft.employmentData,employerOrWorkName:'Dato laboral actualizado sintético'},commandId:randomUUID(),expectedRevision:approvedDraft.revision},'synthetic-admin');
 assert.equal((await readCreditReview(db,first.id,1)).approved,false);await assertPreparationBlocked(first.id);
 await reviewCommand(first.id,'DECIDE',{state:'IN_REVIEW',resolution:'Datos nuevamente revisados',notes:'Sólo prueba'});await reviewCommand(first.id,'DECIDE',{state:'APPROVED',resolution:'Nueva aprobación sintética',notes:'Sólo prueba'});
 const second=await createCreditCase();await reviewCommand(second.id,'LINK_PROFILE',{originBudgetId:first.id,originVersion:1,evidence:'Misma persona verificada expresamente'});assert.equal((await readCreditReview(db,second.id,1)).approved,false);assert.equal((await second.r.family.collection('documentation').doc('1').get()).data()!.slots.DNI_FRONT.attachments.length,0);
 const bucket=admin.storage().bucket(documentationBucketName()),filesBefore=(await bucket.getFiles({prefix:'budget-documentation-v2/'}))[0].length;assert.ok(filesBefore>=3);
 await reviewCommand(second.id,'DECIDE',{state:'IN_REVIEW',resolution:'Revisión propia',notes:'Sin copiar aprobación'});await reviewCommand(second.id,'DECIDE',{state:'REJECTED',resolution:'Rechazo sintético manual',notes:'Sólo prueba'});assert.equal((await readCreditReview(db,second.id,1)).state,'REJECTED');await assertPreparationBlocked(second.id);
 const other=await createCreditCase(undefined,'87654321');await assert.rejects(()=>reviewCommand(other.id,'LINK_PROFILE',{originBudgetId:first.id,originVersion:1,evidence:'No coincide'}),/Identidad inconsistente/);
 assert.equal((await readCreditReview(db,other.id,1)).profile,null);assert.equal((await listVerifiedProfiles(db)).length,1);
 const sharedViews=await Promise.all([readCreditReview(db,first.id,1),readCreditReview(db,second.id,1)]);const sharedAttachment=(await creditRefs(db,first.id,1).profile.get()).data()!.documents.DNI_BACK.attachment.attachmentId;
 const sharedRace=await Promise.allSettled([first.id,second.id].map((id,i)=>creditCommand(db,id,1,{action:'REVIEW_DOCUMENT',commandId:randomUUID(),expectedRevision:sharedViews[i].review!.revision,expectedProfileRevision:sharedViews[i].profile!.revision,type:'DNI_BACK',attachmentId:sharedAttachment,status:'VERIFIED',validUntil:'2099-12-31',note:'Revisión concurrente '+i},'synthetic-admin')));assert.equal(sharedRace.filter(r=>r.status==='fulfilled').length,1);assert.equal((await bucket.getFiles({prefix:'budget-documentation-v2/'}))[0].length,filesBefore);
 let changed=(await second.r.draft.get()).data()!;await contractCommand(db,second.id,1,{action:'UPDATE_PERSONAL_DATA',expectedRevision:changed.revision,commandId:randomUUID(),personalData:{...addressPayload.personalData,fullName:'Identidad por aclarar'}},'synthetic-admin');assert.equal((await readCreditReview(db,second.id,1)).identityMismatch,true);assert.equal((await readCreditReview(db,second.id,1)).approved,false);await assert.rejects(()=>reusableDocumentSource(db,second.id,1,'DNI_BACK'),/identidad vigente/);await reviewCommand(second.id,'DECIDE',{state:'MORE_INFORMATION',resolution:'Solicitar aclaración de identidad',notes:'No reutilizar documentos hasta verificar'});const mismatchFile=await documentRoute.GET(new Request('http://localhost/private'),{params:Promise.resolve({budgetId:second.id,version:'1',type:'DNI_BACK'})});assert.equal(mismatchFile.status,401);changed=(await second.r.draft.get()).data()!;await contractCommand(db,second.id,1,{action:'UPDATE_PERSONAL_DATA',expectedRevision:changed.revision,commandId:randomUUID(),personalData:addressPayload.personalData},'synthetic-admin');assert.equal((await readCreditReview(db,second.id,1)).identityMismatch,false);
 const observedBack=(await creditRefs(db,first.id,1).profile.get()).data()!.documents.DNI_BACK;await reviewCommand(second.id,'REVIEW_DOCUMENT',{type:'DNI_BACK',attachmentId:observedBack.attachment.attachmentId,status:'OBSERVED',validUntil:null,note:'Solicitar actualización sin inventar vigencia'});assert.equal((await readCreditReview(db,second.id,1)).documents.find(d=>d.type==='DNI_BACK')!.status,'OBSERVED');
 const doc=(await creditRefs(db,first.id,1).profile.get()).data()!.documents.DNI_FRONT;
 await reviewCommand(second.id,'REVIEW_DOCUMENT',{type:'DNI_FRONT',attachmentId:doc.attachment.attachmentId,status:'VERIFIED',validUntil:'2000-01-01',note:'Vigencia vencida sintética'});
 assert.equal((await readCreditReview(db,first.id,1)).approved,false);assert.equal((await readCreditReview(db,first.id,1)).state,'PENDING_DOCUMENTS');await assertPreparationBlocked(first.id);assert.equal((await readCreditReview(db,second.id,1)).documents[0].status,'EXPIRED');
 const content=await downloadBudgetDocument(db,bucket,first.id,1,'DNI_FRONT',doc.attachment.attachmentId);assert.deepEqual(content.bytes,png);
 await deleteBudgetDocument(db,bucket,first.id,1,'DNI_FRONT',doc.attachment.attachmentId,{commandId:randomUUID()},'synthetic-admin');assert.equal((await readCreditReview(db,second.id,1)).documents[0].status,'OBSERVED');
 assert.equal(JSON.stringify({b:(await first.r.budget.get()).data(),a:(await first.r.acceptance.get()).data()}),before);assert.equal((await first.r.budget.get()).updateTime!.toMillis(),btime);
 const ctx={params:Promise.resolve({budgetId:first.id,version:'1'})};assert.equal((await route.GET(new NextRequest('http://localhost/api/admin/credit'),ctx)).status,401);
 const password='Synthetic-only-2026!';for(const [email,status]of [[process.env.NEXT_PUBLIC_ADMIN_EMAIL!,200],['credit-outsider@example.invalid',403],['credit-client@example.invalid',403],['credit-affiliate@example.invalid',403]] as const){try{await admin.auth().createUser({email,password,emailVerified:true});}catch(e){if((e as {code:string}).code!=='auth/email-already-exists')throw e;await admin.auth().updateUser((await admin.auth().getUserByEmail(email)).uid,{password});}const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,returnSecureToken:true})});assert.equal(response.status,200);const token=(await response.json()).idToken;assert.equal((await route.GET(new NextRequest('http://localhost/api/admin/credit',{headers:{Authorization:'Bearer '+token}}),ctx)).status,status);assert.equal((await route.POST(new NextRequest('http://localhost/api/admin/credit',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}'}),ctx)).status,status===200?409:403);const file=await documentRoute.GET(new Request('http://localhost/api/admin/credit-document/DNI_BACK',{headers:{Authorization:'Bearer '+token}}),{params:Promise.resolve({budgetId:first.id,version:'1',type:'DNI_BACK'})});assert.equal(file.status,status);if(status===200){assert.deepEqual(Buffer.from(await file.arrayBuffer()),png);assert.equal(file.headers.get('Cache-Control'),'private, no-store');}}
 const back=(await creditRefs(db,first.id,1).profile.get()).data()!.documents.DNI_BACK;const privateRead=await fetch('http://127.0.0.1:9199/v0/b/'+documentationBucketName()+'/o/'+encodeURIComponent(back.attachment.storagePath)+'?alt=media');assert.equal(privateRead.status,403);
 const direct=await fetch('http://127.0.0.1:8080/v1/projects/demo-cuenta-hogar/databases/(default)/documents/'+creditRefs(db,first.id,1).profile.path);assert.equal(direct.status,403);
 console.log('CONTRACT_PREPARATION_GATES_ALL_CREDIT_STATES_READY_BLOCK_DRAFT_SAVE_SCHEDULE_SUM = PASS');
 console.log('CREDIT_REVIEW_EMULATOR = PASS; QUICK_CATALOG_AND_MANUAL = PASS; NEW_RECURRENT_EXPIRED_AMBIGUOUS = PASS; MANUAL_DECISIONS = PASS; CONCURRENCY_RETRY_AUDIT = PASS; PRIVATE_DOCUMENT_REUSE = PASS; AUTH_ROLES = PASS; HISTORICAL_UNCHANGED = PASS; PRODUCTION_WRITES = 0');
}
if(process.argv[1]?.endsWith('testCreditReviewV2Emulator.ts'))void tests().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>admin.app().delete());
