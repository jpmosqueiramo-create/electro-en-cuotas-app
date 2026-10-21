import { FieldValue,type Firestore,type Transaction } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { admin } from './firebaseAdmin';
import { exact,opaque,stable } from './contractV2';
import { custodyLoad,custodyRef,type CustodyActor } from './operationCustodyV2Server';
import { participant,sameParticipant,custodyTimestamp,custodyText,type CustodyParticipant,type CustodyTransfer } from './operationCustodyV2';
import { fulfillmentRef } from './operationFulfillmentV2Server';
import { nextFulfillment } from './operationFulfillmentV2';
import { deliveryDocumentKinds,deliveryEnabled,deliveryFail,deliveryKind,initialDelivery,deliveryCommandInput,requireDeliveryEmulator,type DeliveryV2,type DeliverySlot } from './operationDeliveryV2';
import { verifyEvidenceObject,assertVerifiedEvidence,type VerifiedEvidence,type EvidenceMetadata } from './operationEvidenceV2';
export const deliveryRef=(db:Firestore,id:string,v:number)=>custodyRef(db,id,v).parent.doc('delivery');
export async function deliveryPerson(db:Firestore,tx:Transaction,p:CustodyParticipant){
 const u=await admin.auth().getUser(p.uid).catch(()=>deliveryFail('Participante sin cuenta Auth.'));if(u.disabled)deliveryFail('Participante inactivo.');
 if(p.role==='AFFILIATE'){const found=await tx.get(db.collection('vendedores').where('authUid','==',p.uid).limit(2));if(found.size!==1||found.docs[0].id!==p.affiliateId||found.docs[0].data().activo!==true)deliveryFail('Vendedor afiliado no activo.');}
}
export async function deliveryLoad(db:Firestore,tx:Transaction,id:string,v:number,actor:CustodyActor){
 const base=await custodyLoad(db,tx,id,v,{...actor,admin:true}),saved=await tx.get(deliveryRef(db,id,v));
 const state=saved.exists?saved.data() as DeliveryV2:initialDelivery(base.source.identity.operationId);
 if(state.schemaVersion!=='OPERATION_DELIVERY_V2'||state.operationId!==base.source.identity.operationId||!Number.isSafeInteger(state.revision)||!['PREPARING','DELIVERED_EMULATOR'].includes(state.status))deliveryFail();
 if(!actor.admin){
  const people=[base.state.current,state.originals?.holder,state.originalsTransfer?.from,state.originalsTransfer?.to].filter((p):p is CustodyParticipant=>!!p&&p.uid===actor.uid);
  if(people.length){for(const p of people)await deliveryPerson(db,tx,p);}
  else deliveryFail('Sólo custodios físicos/documentales autorizados pueden consultar esta sección.');
 }
 return {...base,delivery:state};
}
export function deliveryChecklist(view:Awaited<ReturnType<typeof deliveryLoad>>){
 const d=view.delivery,c=view.state,f=view.fulfillment,missing:string[]=[];
 if(!d.responsible)missing.push('Responsable de entrega');
 if(!c.current||c.pending||!d.responsible||!sameParticipant(c.current,d.responsible))missing.push('Custodia física acreditada del responsable');
 if(f.logisticsState!=='ENTREGA_PROGRAMADA')missing.push('Entrega programada en logística');
 for(const k of deliveryDocumentKinds){if(!d.documents[k].prepared)missing.push(`${k}: documento preparado`);if(!d.documents[k].signature)missing.push(`${k}: firma física del cliente y foto legible verificadas`);}
 if(!d.originals||d.originalsTransfer)missing.push('Originales físicos recibidos y custodia documental confirmada');
 if(c.incidents.some(i=>!i.resolvedAt)||f.incidents.some(i=>!i.resolvedAt)||d.holds.some(h=>!h.clearedAt))missing.push('Incidencias o retenciones pendientes');
 return missing;
}
export async function readDelivery(db:Firestore,id:string,v:number,actor:CustodyActor){return db.runTransaction(async tx=>{
 const view=await deliveryLoad(db,tx,id,v,actor),d=view.delivery,photos=await tx.get(deliveryRef(db,id,v).collection('photos').limit(100));
 const canDocuments=actor.admin||view.state.current?.uid===actor.uid||d.originals?.holder.uid===actor.uid||d.originalsTransfer?.from.uid===actor.uid||d.originalsTransfer?.to.uid===actor.uid;
 const events=actor.admin?await tx.get(deliveryRef(db,id,v).collection('events').orderBy('revision','desc').limit(100)):null;
 return {state:d,product:view.fulfillment.productName,logistics:view.fulfillment.logisticsState,physicalCustodian:actor.admin?view.state.current?.uid||null:undefined,
  mutationEnabled:deliveryEnabled(),canDocuments,canAdmin:actor.admin,missing:deliveryChecklist(view),pendingPhotos:canDocuments?photos.docs.filter(p=>p.data().state==='PENDING'&&(actor.admin||p.data().actor===actor.uid)).map(p=>({id:p.id,slot:p.data().slot as DeliverySlot,relatedId:p.data().relatedId as string})):[],photos:canDocuments?photos.docs.filter(p=>p.data().state==='COMMITTED').map(p=>({id:p.id,slot:p.data().slot as DeliverySlot,relatedId:p.data().relatedId as string})):[],
  events:events?events.docs.map(e=>({commandId:e.id,action:e.data().action as string,actor:e.data().actor as string,at:e.data().at as string,revision:e.data().revision as number})):[],legalApproval:'PENDING',productiveClosure:'DISABLED'};
});}
async function evidence(db:Firestore,tx:Transaction,id:string,v:number,photoId:unknown,slot:DeliverySlot,relatedId:string){
 const pid=opaque(photoId);const p=(await tx.get(deliveryRef(db,id,v).collection('photos').doc(pid))).data();
 if(!p||p.state!=='COMMITTED'||p.slot!==slot||p.relatedId!==relatedId||! /^[a-f0-9]{64}$/.test(p.sha256))deliveryFail('Evidencia fotográfica no disponible o de otro documento.');return p;
}
export async function deliveryCommand(db:Firestore,id:string,v:number,input:unknown,actor:CustodyActor){
 requireDeliveryEmulator();const c=deliveryCommandInput(input),ref=deliveryRef(db,id,v),receipt=ref.collection('commands').doc(c.commandId),digest=createHash('sha256').update(stable({c,actor})).digest('hex');
 const verified=new Map<string,VerifiedEvidence>();
 if(['CONFIRM_DELIVERY','REGULARIZE_DELIVERY'].includes(c.action)){
  const files=await db.runTransaction(async tx=>{const view=await deliveryLoad(db,tx,id,v,actor),prior=await tx.get(receipt);if(prior.exists){if(prior.data()!.digest!==digest)deliveryFail('Conflicto de commandId.');return [];}
   if(view.delivery.revision!==c.expectedRevision||c.operationId!==view.delivery.operationId)deliveryFail('Conflicto de revisión.');
   const ids=deliveryDocumentKinds.flatMap(k=>[view.delivery.documents[k].prepared?.photoId,view.delivery.documents[k].signature?.photoId]).concat(view.delivery.holds.flatMap(h=>h.photoIds)).filter((p):p is string=>!!p);
   const files:EvidenceMetadata[]=[];for(const pid of new Set(ids)){const p=(await tx.get(ref.collection('photos').doc(pid))).data();if(!p||p.path!==`operation-delivery-v2/${id}/v${v}/${pid}`)deliveryFail('Archivo faltante.');const expected=deliveryDocumentKinds.flatMap(k=>[view.delivery.documents[k].prepared,view.delivery.documents[k].signature]).find(x=>x?.photoId===pid);if(expected&&expected.sha256!==p.sha256)deliveryFail('Hash documental diferente.');files.push(p as EvidenceMetadata);}return files;});
  if(files.length){const {getBudgetDocumentationBucket}=await import('./budgetDocumentationStorage');const bucket=await getBudgetDocumentationBucket();for(const p of files)verified.set(p.path,await verifyEvidenceObject(bucket,p));}
 }
 return db.runTransaction(async tx=>{
  const view=await deliveryLoad(db,tx,id,v,actor),prior=await tx.get(receipt);if(c.operationId!==view.delivery.operationId)deliveryFail('Operación incorrecta.');
  if(prior.exists){if(prior.data()!.digest!==digest)deliveryFail('Conflicto de commandId.');return {revision:prior.data()!.revision as number,replay:true};}
  const s=structuredClone(view.delivery),d=c.data,now=new Date().toISOString();if(s.revision!==c.expectedRevision)deliveryFail('Conflicto de revisión. Recargá la entrega.');
  if(s.status==='DELIVERED_EMULATOR'&&!['AUTHORIZE_ORIGINALS_TRANSFER','CONFIRM_ORIGINALS_DELIVERY','CONFIRM_ORIGINALS_RECEIPT','REGULARIZE_ORIGINALS_TRANSFER','CANCEL_ORIGINALS_TRANSFER'].includes(c.action))deliveryFail('Entrega ya cerrada. Sólo se admite custodia posterior de originales.');
  const administrator=()=>{if(!actor.admin)deliveryFail('Control exclusivamente administrativo.');};
  let transferEvent:CustodyTransfer|null=null,updateCustody=structuredClone(view.state),updateFulfillment=structuredClone(view.fulfillment),mirror=false;
  if(c.action==='PREPARE_DELIVERY'){
   administrator();exact(d,['responsible']);const p=participant(d.responsible);await deliveryPerson(db,tx,p);if(!view.state.current||!sameParticipant(p,view.state.current)||view.state.pending)deliveryFail('El responsable debe tener custodia confirmada.');s.responsible=p;
  }else if(c.action==='PREPARE_DOCUMENT'){
   administrator();exact(d,['kind','photoId','reference','templateVersion']);const k=deliveryKind(d.kind),p=await evidence(db,tx,id,v,d.photoId,`${k}_PREPARED`,'');
   if(s.originals||s.originalsTransfer)deliveryFail('No se sustituye un documento con originales ya recibidos.');
   s.documents[k]={prepared:{photoId:String(d.photoId),sha256:p.sha256,reference:custodyText(d.reference),templateVersion:custodyText(d.templateVersion),by:actor.uid,at:now},signature:null,invalidatedAt:now};
  }else if(c.action==='VERIFY_SIGNATURE'){
   administrator();exact(d,['kind','photoId','clientSigned','legible','identityChecked','loopSigned','signedAt']);const k=deliveryKind(d.kind),doc=s.documents[k];if(!doc.prepared||d.clientSigned!==true||d.legible!==true||d.identityChecked!==true||typeof d.loopSigned!=='boolean')deliveryFail('Se exige firma física del cliente, foto legible e identidad verificada. READY no es firma.');
   const p=await evidence(db,tx,id,v,d.photoId,`${k}_SIGNED`,doc.prepared.photoId);if(doc.invalidatedAt&&p.createdAt<=doc.invalidatedAt)deliveryFail('Se requiere una fotografía posterior a la preparación o invalidación.');
   const signedAt=custodyTimestamp(d.signedAt,now);
   s.documents[k].signature={photoId:String(d.photoId),sha256:p.sha256,clientSigned:true,legible:true,identityChecked:true,loopSigned:d.loopSigned,signedAt,verifiedBy:actor.uid,verifiedAt:now};
  }else if(c.action==='RECEIVE_ORIGINALS'){
   administrator();exact(d,['holder','location','receivedAt','reference','alternativeEvidence']);if(s.originals)deliveryFail('Ya hay originales bajo custodia. Usá transferencia documental.');
   if(deliveryDocumentKinds.some(k=>!s.documents[k].signature))deliveryFail('Faltan tres firmas verificadas.');
   const holder=participant(d.holder);await deliveryPerson(db,tx,holder);if(holder.uid!==actor.uid)custodyText(d.alternativeEvidence);
   const receivedAt=custodyTimestamp(d.receivedAt,now);if(deliveryDocumentKinds.some(k=>s.documents[k].signature!.signedAt>receivedAt))deliveryFail('Originales recibidos antes de las firmas.');
   s.originals={holder,location:custodyText(d.location),receivedAt,reference:custodyText(d.reference),documentHashes:Object.fromEntries(deliveryDocumentKinds.map(k=>[k,s.documents[k].prepared!.sha256])) as Record<typeof deliveryDocumentKinds[number],string>};
  }else if(c.action==='AUTHORIZE_ORIGINALS_TRANSFER'){
   administrator();exact(d,['to','occurredAt','location','reason']);if(!s.originals||s.originalsTransfer)deliveryFail('Originales no recibidos o transferencia pendiente.');
   const to=participant(d.to);await deliveryPerson(db,tx,to);if(sameParticipant(s.originals.holder,to))deliveryFail();const occurredAt=custodyTimestamp(d.occurredAt,now);if(occurredAt<s.originals.receivedAt)deliveryFail('Transferencia anterior a la recepción de originales.');custodyText(d.reason);
   s.originalsTransfer={id:c.commandId,from:s.originals.holder,to,occurredAt,location:custodyText(d.location),deliveredAt:null,receivedAt:null,completedAt:null,regularization:null};
  }else if(['CONFIRM_ORIGINALS_DELIVERY','CONFIRM_ORIGINALS_RECEIPT','REGULARIZE_ORIGINALS_TRANSFER','CANCEL_ORIGINALS_TRANSFER'].includes(c.action)){
   const t=s.originalsTransfer;if(!t||!s.originals)deliveryFail('Transferencia documental no disponible.');
   if(c.action==='REGULARIZE_ORIGINALS_TRANSFER'){administrator();exact(d,['transferId','reason','evidence']);t.regularization={actor:actor.uid,at:now,reason:custodyText(d.reason),evidence:custodyText(d.evidence)};t.deliveredAt=t.deliveredAt||now;t.receivedAt=t.receivedAt||now;}
   else if(c.action==='CANCEL_ORIGINALS_TRANSFER'){administrator();exact(d,['transferId','reason']);custodyText(d.reason);if(t.deliveredAt||t.receivedAt)deliveryFail('No se cancela una transferencia parcialmente confirmada.');}
   else {exact(d,['transferId']);const delivering=c.action==='CONFIRM_ORIGINALS_DELIVERY',person=delivering?t.from:t.to;if(person.uid!==actor.uid)deliveryFail('Confirmación de otro participante.');await deliveryPerson(db,tx,person);if(delivering){if(t.deliveredAt)deliveryFail();t.deliveredAt=now;}else{if(t.receivedAt)deliveryFail();t.receivedAt=now;}}
   if(d.transferId!==t.id)deliveryFail();
   if(c.action==='CANCEL_ORIGINALS_TRANSFER'){transferEvent=t;s.originalsTransfer=null;}
   else if(t.deliveredAt&&t.receivedAt){t.completedAt=now;transferEvent=t;s.originals={...s.originals,holder:t.to,location:t.location,receivedAt:t.occurredAt};s.originalsTransfer=null;}
  }else if(['REPORT_MISSING_SIGNATURE','REPORT_DAMAGE'].includes(c.action)){
   exact(d,c.action==='REPORT_DAMAGE'?['reason','occurredAt','location','alternativeEvidence']:['reason','occurredAt','location','missingKinds','alternativeEvidence']);
   if(!view.state.current||view.state.pending||!actor.admin&&view.state.current.uid!==actor.uid)deliveryFail('Se requiere custodio físico confirmado.');
   if(s.holds.length>=100||updateCustody.incidents.length>=100)deliveryFail('Límite de incidencias alcanzado.');const at=custodyTimestamp(d.occurredAt,now);if(view.state.lastTransferAt&&at<view.state.lastTransferAt)deliveryFail('Incidencia anterior a la custodia.');
   if(c.action==='REPORT_MISSING_SIGNATURE') {if(!Array.isArray(d.missingKinds)||!d.missingKinds.length||new Set(d.missingKinds).size!==d.missingKinds.length)deliveryFail();for(const k of d.missingKinds.map(deliveryKind)){s.documents[k].signature=null;s.documents[k].invalidatedAt=now;}}
   const reason=custodyText(d.reason),location=custodyText(d.location);if(typeof d.alternativeEvidence!=='string'||d.alternativeEvidence.length>500)deliveryFail();
   s.holds.push({id:c.commandId,type:c.action==='REPORT_DAMAGE'?'DAMAGE':'MISSING_SIGNATURE',at:now,clearedAt:null,clearedBy:null,reason:null,photoIds:[]});
   updateCustody.incidents.push({id:c.commandId,reason,damage:c.action==='REPORT_DAMAGE',rejection:c.action==='REPORT_DAMAGE',at,custodian:view.state.current,location,decision:null,resolution:null,resolvedAt:null});updateCustody.location=location;updateCustody.revision++;
   updateFulfillment=nextFulfillment(view.fulfillment,{commandId:c.commandId,operationId:c.operationId,expectedRevision:view.fulfillment.revision,action:'REPORT_INCIDENT',data:{description:`Entrega retenida: ${reason}`}},actor.uid,now);mirror=true;
  }else if(c.action==='CLEAR_HOLD'){
   administrator();exact(d,['incidentId','reason']);const h=s.holds.find(h=>h.id===d.incidentId),i=view.state.incidents.find(i=>i.id===d.incidentId);if(!h||h.clearedAt||!i?.resolvedAt)deliveryFail('Primero debe resolver Administración la incidencia de custodia.');
   if(h.type==='MISSING_SIGNATURE'&&deliveryDocumentKinds.some(k=>!s.documents[k].signature))deliveryFail('Todavía faltan firmas verificadas.');
   if(h.type==='DAMAGE'){const ps=await tx.get(ref.collection('photos').where('relatedId','==',h.id));const files=ps.docs.filter(p=>p.data().state==='COMMITTED');for(const slot of ['DAMAGE','PACKAGING'])if(!files.some(p=>p.data().slot===slot))deliveryFail('Faltan fotos privadas de daños y embalaje.');h.photoIds=files.map(p=>p.id);}
   h.clearedAt=now;h.clearedBy=actor.uid;h.reason=custodyText(d.reason);
  }else if(['CONFIRM_DELIVERY','REGULARIZE_DELIVERY'].includes(c.action)){
   exact(d,c.action==='REGULARIZE_DELIVERY'?['occurredAt','alternativeEvidence','reason']:['occurredAt']);
   const missing=deliveryChecklist({...view,delivery:s});if(missing.length)deliveryFail(missing.join('; '));
   const responsible=s.responsible!;if(c.action==='REGULARIZE_DELIVERY'){administrator();custodyText(d.reason);custodyText(d.alternativeEvidence);}else if(responsible.uid!==actor.uid)deliveryFail('Sólo el responsable puede confirmar. Usá regularización administrativa explícita si hubo falta de conectividad.');
   const occurredAt=custodyTimestamp(d.occurredAt,now);if(view.state.lastTransferAt&&occurredAt<view.state.lastTransferAt||s.originals!.receivedAt>occurredAt||deliveryDocumentKinds.some(k=>s.documents[k].signature!.signedAt>occurredAt)||view.fulfillment.actualReceiptDate&&occurredAt.slice(0,10)<view.fulfillment.actualReceiptDate)deliveryFail('Fecha real de entrega incompatible.');
   // Storage objects are immutable through this module; re-read bytes before committing a closure.
   const ids=deliveryDocumentKinds.flatMap(k=>[s.documents[k].prepared!.photoId,s.documents[k].signature!.photoId]).concat(s.holds.flatMap(h=>h.photoIds));
   for(const photoId of new Set(ids)){const p=(await tx.get(ref.collection('photos').doc(photoId))).data();if(!p||p.state!=='COMMITTED'||p.path!==`operation-delivery-v2/${id}/v${v}/${photoId}`)deliveryFail('Archivo faltante.');const expected=deliveryDocumentKinds.flatMap(k=>[s.documents[k].prepared!,s.documents[k].signature!]).find(x=>x.photoId===photoId);if(expected&&expected.sha256!==p.sha256)deliveryFail('Hash documental diferente.');assertVerifiedEvidence(p as EvidenceMetadata,verified.get(p.path));}
   if(deliveryDocumentKinds.some(k=>s.originals!.documentHashes[k]!==s.documents[k].prepared!.sha256))deliveryFail('Originales de otra versión.');
   s.status='DELIVERED_EMULATOR';s.event={schemaVersion:'DELIVERY_CONFIRMED_V2',executionMode:'EMULATOR_ONLY',operationId:c.operationId,commandId:c.commandId,occurredAt,recordedAt:now,recordedBy:actor.uid,responsible,product:{name:view.fulfillment.productName,referenceId:view.fulfillment.referenceId},documents:s.documents,originals:s.originals!,identity:view.source.identity,alternativeEvidence:c.action==='REGULARIZE_DELIVERY'?String(d.alternativeEvidence):null,legalApproval:'PENDING'};
   updateCustody={...updateCustody,current:null,location:'',revision:updateCustody.revision+1,deliveryClosure:'DELIVERED_EMULATOR'};
   updateFulfillment={...updateFulfillment,revision:updateFulfillment.revision+1,logisticsState:'DELIVERED_EMULATOR',deliveryClosure:'DELIVERED_EMULATOR',updatedAt:now,updatedBy:actor.uid};mirror=true;
  }
  s.revision++;tx.set(ref,s);tx.create(receipt,{digest,revision:s.revision,at:now,actor:actor.uid});
  const event={commandId:c.commandId,operationId:c.operationId,action:c.action,actor:actor.uid,at:now,revision:s.revision,expectedRevision:c.expectedRevision,data:d,evidenceGenerations:Object.fromEntries([...verified].map(([path,p])=>[path,p.generation])),transfer:transferEvent||s.originalsTransfer,delivery:s.event};tx.create(ref.collection('events').doc(c.commandId),event);
  if(mirror){tx.set(custodyRef(db,id,v),updateCustody);tx.set(fulfillmentRef(db,id,v),updateFulfillment);tx.create(custodyRef(db,id,v).collection('events').doc(c.commandId),{...event,revision:updateCustody.revision});tx.create(fulfillmentRef(db,id,v).collection('events').doc(c.commandId),{...event,revision:updateFulfillment.revision,from:{provider:view.fulfillment.providerState,logistics:view.fulfillment.logisticsState},to:{provider:updateFulfillment.providerState,logistics:updateFulfillment.logisticsState}});}
  if(c.action.startsWith('REPORT_'))tx.create(db.collection('alertas_admin').doc('delivery_'+createHash('sha256').update(c.operationId+c.commandId).digest('hex')),{tipo:'ENTREGA_V2_RETENIDA',mensaje:`Entrega V2 retenida. Presupuesto ${id} versión ${v}: ${custodyText(d.reason)}`,fechaCreacion:FieldValue.serverTimestamp(),leida:false});
  return {revision:s.revision,replay:false};
 });
}
