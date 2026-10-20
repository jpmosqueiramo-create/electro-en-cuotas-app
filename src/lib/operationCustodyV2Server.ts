import type { Firestore, Transaction } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { exact, opaque, stable } from './contractV2';
import { operationRef } from './operationV2';
import { fulfillmentOrigin, fulfillmentRef, storedFulfillment } from './operationFulfillmentV2Server';
import { nextFulfillment } from './operationFulfillmentV2';
import { custodyCommandInput, custodyFail, custodyText, custodyTimestamp, initialCustody, participant, sameParticipant, type CustodyParticipant, type OperationCustodyV2 } from './operationCustodyV2';
export interface CustodyActor { uid: string; admin: boolean }
export const custodyRef = (db: Firestore, id: string, v: number) => operationRef(db, id, v).parent.doc('custody');
export const affiliateIndex = (db: Firestore, uid: string) => db.collection('presupuestos_v2').doc('_operation_affiliate_index_v2').collection('contracts').doc(createHash('sha256').update(uid).digest('hex')).collection('assignments');
export const assignmentRef = (db: Firestore, id: string, v: number) => operationRef(db, id, v).parent.doc('affiliate');
async function affiliate(db: Firestore, tx: Transaction, uid: string, id?: string) {
 const { admin } = await import('./firebaseAdmin');
 const user = await admin.auth().getUser(uid).catch(()=>custodyFail('UID de Firebase Auth no disponible.'));
 if (user.disabled) custodyFail('Usuario inactivo.');
 const docs = await tx.get(db.collection('vendedores').where('authUid', '==', uid).limit(2));
 if (docs.size !== 1 || (id && docs.docs[0].id !== id) || docs.docs[0].data().activo !== true) custodyFail('Se requiere un vendedor afiliado activo con UID único.');
 return { affiliateId: docs.docs[0].id, uid };
}
export async function listActiveAffiliates(db: Firestore) {
 const docs = await db.collection('vendedores').where('activo', '==', true).get();
 return docs.docs.filter(d => typeof d.data().authUid === 'string').map(d => ({ id: d.id, uid: d.data().authUid as string, name: String(d.data().nombre || 'Vendedor afiliado') }));
}
export async function custodyLoad(db: Firestore, tx: Transaction, id: string, v: number, actor: CustodyActor, participantAccess = false) {
 const source = await fulfillmentOrigin(db, tx, id, v);
 if (!source.registered) custodyFail('Operación histórica sin identidad registrada: sólo lectura, sin migración.');
 const [snap, assigned, f] = await Promise.all([tx.get(custodyRef(db,id,v)), tx.get(assignmentRef(db,id,v)), tx.get(fulfillmentRef(db,id,v))]);
 const state = snap.exists ? snap.data() as OperationCustodyV2 : initialCustody(source.identity.operationId);
 if (state.schemaVersion !== 'OPERATION_CUSTODY_V2' || state.operationId !== source.identity.operationId || !Number.isSafeInteger(state.revision) || state.deliveryClosure !== 'BLOCKED_PHYSICAL_SIGNATURES_REQUIRED') custodyFail();
 if (stable(state.assignment) !== stable(assigned.exists ? { affiliateId: assigned.data()!.affiliateId, uid: assigned.data()!.uid } : null)) custodyFail('Asignación inconsistente.');
 if (!actor.admin) {
  const permittedParticipant = participantAccess && state.pending && [state.pending.from,state.pending.to].some(p=>p.uid===actor.uid && p.role!=='AFFILIATE');
  if(!permittedParticipant) {
   const a = await affiliate(db,tx,actor.uid);
   if (!state.assignment || state.assignment.uid !== a.uid || state.assignment.affiliateId !== a.affiliateId) custodyFail('Operación no disponible.');
  }
 }
 const fulfillment = f.exists ? storedFulfillment(f.data(), source.initial) : source.initial;
 return { source, state, fulfillment };
}
export async function readCustody(db: Firestore, id: string, v: number, actor: CustodyActor) {
 return db.runTransaction(async tx => {
  const { source, state, fulfillment } = await custodyLoad(db,tx,id,v,actor);
  if (actor.admin) {
   const events = await tx.get(custodyRef(db,id,v).collection('events').orderBy('revision','desc').limit(100));
   const photos = await tx.get(custodyRef(db,id,v).collection('photos').limit(100));
   return { identity: source.identity, state, events: events.docs.map(d=>d.data()), photos: photos.docs.map(d=>({ id:d.id, incidentId:d.data().incidentId })) };
  }
  // Strict allowlist: never return acceptance, cost, supplier, draft, notes or other participants' UIDs.
  // Budget path is obtained from the existing contract family, not reconstructed from client identifiers.
  const { contractRefs } = await import('./contractV2Server');
  const budget = (await tx.get(contractRefs(db,id,v).budget)).data()!;
  const pending = state.pending;
  const photos = await tx.get(custodyRef(db,id,v).collection('photos').where('state','==','COMMITTED').limit(100));
  return { budgetId:id, version:v, operationId:source.identity.operationId, revision:state.revision,
   client:budget.clienteSnapshot.nombre as string, locality:budget.clienteSnapshot.localidad as string,
   product:fulfillment.productName, providerState:fulfillment.providerState,
   availability:fulfillment.confirmedAvailabilityDate || fulfillment.estimatedAvailabilityDate,
   estimatedDelivery:fulfillment.estimatedDeliveryDate, logisticsState:fulfillment.logisticsState,
   currentRole:state.current?.role ?? null, location:state.location,
   nextAction:pending ? 'Confirmar únicamente la entrega o recepción física que te corresponde' : 'Esperar autorización administrativa; conservar el producto si está bajo tu custodia',
   pending:pending ? { id:pending.id, fromRole:pending.from.role, toRole:pending.to.role, occurredAt:pending.occurredAt,
    canDeliver:pending.from.uid===actor.uid && !pending.deliveredAt, canReceive:pending.to.uid===actor.uid && !pending.receivedAt,
    delivered:!!pending.deliveredAt, received:!!pending.receivedAt } : null,
   incidents:state.incidents.map(i=>({id:i.id, reason:i.reason, damage:i.damage, rejection:i.rejection, decision:i.decision, resolved:!!i.resolvedAt})),
   photos:photos.docs.map(d=>({id:d.id,incidentId:d.data().incidentId as string})),
   deliveryClosure:state.deliveryClosure };
 });
}
export async function listAffiliateOperations(db: Firestore, actor: CustodyActor) {
 await db.runTransaction(tx=>affiliate(db,tx,actor.uid));
 const refs = await affiliateIndex(db,actor.uid).get();
 const results = [];
 for (const doc of refs.docs) {
  const a=doc.data();
  if (a.uid !== actor.uid || doc.id !== a.operationId) custodyFail();
  // Revalidate every assignment and the affiliate's active status at read time.
  results.push(await readCustody(db,a.budgetId,a.version,{...actor,admin:false}));
 }
 return results;
}
async function validateParticipant(db:Firestore,tx:Transaction,p:CustodyParticipant,assigned:OperationCustodyV2['assignment']) {
 const { admin } = await import('./firebaseAdmin');
 const u=await admin.auth().getUser(p.uid).catch(()=>custodyFail('Participante sin UID válido.'));if(u.disabled)custodyFail('Participante inactivo.');
 if(p.role==='AFFILIATE') {
  await affiliate(db,tx,p.uid,p.affiliateId!);
  if(assigned?.uid!==p.uid || assigned.affiliateId!==p.affiliateId) custodyFail('El participante no es el vendedor afiliado asignado.');
 }
}
export async function custodyCommand(db:Firestore,id:string,v:number,input:unknown,actor:CustodyActor) {
 const c=custodyCommandInput(input),ref=custodyRef(db,id,v),receipt=ref.collection('commands').doc(c.commandId);
 const digest=createHash('sha256').update(stable({c,actor})).digest('hex');
 return db.runTransaction(async tx=>{
  const {source,state:current,fulfillment}=await custodyLoad(db,tx,id,v,actor,['CONFIRM_DELIVERY','CONFIRM_RECEIPT'].includes(c.action));
  if(c.operationId!==source.identity.operationId)custodyFail('Identidad operativa incorrecta.');
  const prior=await tx.get(receipt);
  if(prior.exists){if(prior.data()!.digest!==digest)custodyFail('Conflicto de commandId.');return {revision:prior.data()!.revision,replay:true};}
  if(c.expectedRevision!==current.revision)custodyFail('Conflicto de revisión. Recargá la operación.');
  const s=structuredClone(current),d=c.data,now=new Date().toISOString();
  const admin=()=>{if(!actor.admin)custodyFail('Acción exclusivamente administrativa.');};
  let mirror:ReturnType<typeof nextFulfillment>|null=null;
  let completedTransfer:OperationCustodyV2['pending']=null;
  if(c.action==='ASSIGN') {
   admin();exact(d,['affiliateId','uid','reason']);opaque(d.affiliateId);const uid=custodyText(d.uid,128);custodyText(d.reason);
   const a=await affiliate(db,tx,uid,d.affiliateId as string);
   if(stable(a)===stable(s.assignment))custodyFail('Ya está asignada a ese vendedor afiliado.');
   if(s.pending || s.current && s.current.uid===s.assignment?.uid && s.current.uid!==uid)custodyFail('Regularizá o transferí primero la custodia vigente.');
   s.assignment=a;
  } else if(c.action==='AUTHORIZE_TRANSFER') {
   admin();exact(d,['from','to','occurredAt','location','reason']);const from=participant(d.from),to=participant(d.to);
   await validateParticipant(db,tx,from,s.assignment);await validateParticipant(db,tx,to,s.assignment);
   if(s.pending || sameParticipant(from,to) || s.current&&!sameParticipant(s.current,from))custodyFail('Custodia de origen o transferencia pendiente incompatible.');
   if(!fulfillment.actualPickupDate)custodyFail('Primero debe registrarse el retiro real del proveedor.');
   if(s.incidents.some(i=>!i.resolvedAt)&&to.role!=='DRIVER'&&to.role!=='DEPOT')custodyFail('Producto con incidencia: sólo retorno a conductor o depósito.');
   const occurredAt=custodyTimestamp(d.occurredAt,now);if(occurredAt.slice(0,10)<fulfillment.actualPickupDate||s.lastTransferAt&&occurredAt<s.lastTransferAt)custodyFail('Cronología incompatible.');
   custodyText(d.reason);const location=custodyText(d.location);
   s.pending={id:c.commandId,from,to,occurredAt,location,deliveredAt:null,receivedAt:null,completedAt:null,regularization:null};
  } else if(['CONFIRM_DELIVERY','CONFIRM_RECEIPT','REGULARIZE','CANCEL_TRANSFER'].includes(c.action)) {
   const p=s.pending;if(!p)custodyFail('No hay transferencia autorizada pendiente.');
   if(c.action==='CANCEL_TRANSFER'){admin();exact(d,['transferId','reason']);custodyText(d.reason);if(p.deliveredAt||p.receivedAt)custodyFail('Una transferencia parcialmente confirmada requiere regularización, no cancelación.');}
   else if(c.action==='REGULARIZE') {
    admin();exact(d,['transferId','reason','evidence']);p.regularization={reason:custodyText(d.reason),evidence:custodyText(d.evidence),actor:actor.uid,at:now};p.deliveredAt=p.deliveredAt||now;p.receivedAt=p.receivedAt||now;
   } else {
    exact(d,['transferId']);const delivering=c.action==='CONFIRM_DELIVERY',who=delivering?p.from:p.to;
    // Admin cannot impersonate confirmations. Offline evidence has its own explicit audited command.
    if(who.uid!==actor.uid)custodyFail('La confirmación corresponde a otro participante.');
    await validateParticipant(db,tx,who,s.assignment);
    if(delivering){if(p.deliveredAt)custodyFail('Entrega ya confirmada.');p.deliveredAt=now;}
    else {if(p.receivedAt)custodyFail('Recepción ya confirmada.');p.receivedAt=now;}
   }
   if(d.transferId!==p.id)custodyFail('Transferencia incorrecta.');
   if(c.action==='CANCEL_TRANSFER')s.pending=null;
   else if(p.deliveredAt&&p.receivedAt){p.completedAt=now;completedTransfer=structuredClone(p);s.current=p.to;s.location=p.location;s.lastTransferAt=p.occurredAt;s.pending=null;}
  } else if(c.action==='INCIDENT') {
   exact(d,['reason','damage','rejection','location','occurredAt']);
   if(typeof d.damage!=='boolean'||typeof d.rejection!=='boolean'||d.rejection&&!d.damage)custodyFail();
   if(!s.current||s.pending||!actor.admin&&s.current.uid!==actor.uid)custodyFail('Se requiere custodia confirmada y sin transferencia pendiente.');
   if(s.incidents.length>=100)custodyFail('Límite de incidencias alcanzado.');
   const at=custodyTimestamp(d.occurredAt,now);if(s.lastTransferAt&&at<s.lastTransferAt)custodyFail('La incidencia precede a la custodia.');
   const reason=custodyText(d.reason),location=custodyText(d.location);
   s.incidents.push({id:c.commandId,reason,damage:d.damage,rejection:d.rejection,at,custodian:s.current,location,decision:null,resolution:null,resolvedAt:null});s.location=location;
   mirror=nextFulfillment(fulfillment,{commandId:c.commandId,operationId:c.operationId,expectedRevision:fulfillment.revision,action:'REPORT_INCIDENT',data:{description:`Custodia: ${reason}`}},actor.uid,now);
  } else if(c.action==='DECIDE_INCIDENT') {
   admin();exact(d,['incidentId','decision','resolution']);const i=s.incidents.find(i=>i.id===d.incidentId);
   if(!i||i.resolvedAt||!['RETURN','REPLACE','RESCHEDULE'].includes(String(d.decision)))custodyFail('Incidencia o decisión inválida.');
   i.decision=d.decision as typeof i.decision;i.resolution=custodyText(d.resolution);i.resolvedAt=now;
   const fi=fulfillment.incidents.find(x=>x.id===i.id);
   if(fi&&!fi.resolvedAt)mirror=nextFulfillment(fulfillment,{commandId:c.commandId,operationId:c.operationId,expectedRevision:fulfillment.revision,action:'RESOLVE_INCIDENT',data:{incidentId:i.id,resolution:i.resolution}},actor.uid,now);
  }
  s.revision++;
  const event={commandId:c.commandId,operationId:c.operationId,revision:s.revision,expectedRevision:c.expectedRevision,action:c.action,actor:actor.uid,at:now,product:{name:fulfillment.productName,referenceId:fulfillment.referenceId},data:d,transfer:completedTransfer||s.pending||current.pending};
  tx.set(ref,s);tx.create(receipt,{digest,revision:s.revision,actor:actor.uid,at:now});tx.create(ref.collection('events').doc(c.commandId),event);
  if(c.action==='ASSIGN'){
   const record={schemaVersion:'OPERATION_AFFILIATE_ASSIGNMENT_V2',budgetId:id,version:v,operationId:c.operationId,...s.assignment};
   tx.set(assignmentRef(db,id,v),record);
   if(current.assignment)tx.delete(affiliateIndex(db,current.assignment.uid).doc(c.operationId));
   tx.set(affiliateIndex(db,s.assignment!.uid).doc(c.operationId),record);
  }
  if(mirror){const f=fulfillmentRef(db,id,v);tx.set(f,mirror);tx.create(f.collection('events').doc(c.commandId),{...event,revision:mirror.revision,from:{provider:fulfillment.providerState,logistics:fulfillment.logisticsState},to:{provider:mirror.providerState,logistics:mirror.logisticsState},action:'CUSTODY_INCIDENT'});}
  return {revision:s.revision,replay:false};
 });
}

export async function authorizeCustody(db:Firestore,id:string,v:number,actor:CustodyActor) { return db.runTransaction(tx=>custodyLoad(db,tx,id,v,actor)); }

/** Minimal authenticated confirmation surface for an explicitly authorized driver/depot.
 * No access to the affiliate's operation list, customer data or contract dossier. */
export async function readTransferConfirmation(db:Firestore,id:string,v:number,actor:CustodyActor) {
 return db.runTransaction(async tx=>{
  const {state,fulfillment}=await custodyLoad(db,tx,id,v,{...actor,admin:false},true),p=state.pending;
  if(!p || ![p.from.uid,p.to.uid].includes(actor.uid))custodyFail('Transferencia no disponible.');
  return {operationId:state.operationId,revision:state.revision,transferId:p.id,product:fulfillment.productName,
   fromRole:p.from.role,toRole:p.to.role,occurredAt:p.occurredAt,location:p.location,
   canDeliver:p.from.uid===actor.uid&&!p.deliveredAt,canReceive:p.to.uid===actor.uid&&!p.receivedAt};
 });
}
