import {createHash} from 'node:crypto';
import type {Firestore,Transaction} from 'firebase-admin/firestore';
import {admin} from './firebaseAdmin';
import {financialFail,type CashCustodian,type FinancialPayment} from './operationFinancialV2';
import type {CustodyActor} from './operationCustodyV2Server';
import {obtenerLedgerCustodiaEfectivo} from './settlementsEngine';
type Assignment={affiliateId:string;uid:string}|null;
const movementId=(operationId:string,paymentId:string)=>'cash_v2_'+createHash('sha256').update(JSON.stringify([operationId,paymentId])).digest('hex');
export async function cashCustodyOptions(db:Firestore,tx:Transaction,assignment:Assignment){
 if(!assignment)return {affiliate:null};
 const v=(await tx.get(db.collection('vendedores').doc(assignment.affiliateId))).data();
 return {affiliate:v?.activo===true&&v.authUid===assignment.uid?{name:String(v.nombre||'Vendedor afiliado').slice(0,200)}:null};
}
export async function resolveCashCustodian(db:Firestore,tx:Transaction,actor:CustodyActor,assignment:Assignment,data:Record<string,unknown>):Promise<CashCustodian|undefined>{
 if(data.method!=='EFECTIVO'){if(Object.hasOwn(data,'cashCustody'))financialFail('La custodia sólo corresponde a cobros en efectivo.');return;}
 const selected=Object.hasOwn(data,'cashCustody')?data.cashCustody:(actor.admin?'ADMIN':null);
 if(selected==='ADMIN'&&actor.admin){const user=await admin.auth().getUser(actor.uid);if(user.disabled||!user.emailVerified)financialFail('Administrador no disponible.');return {role:'ADMIN',uid:actor.uid,name:String(user.displayName||'Administración').slice(0,200)};}
 if(selected!=='AFFILIATE'||!assignment||!actor.admin&&assignment.uid!==actor.uid)financialFail('Seleccioná Administración o el vendedor afiliado asignado.');
 const v=(await tx.get(db.collection('vendedores').doc(assignment.affiliateId))).data(),matches=await tx.get(db.collection('vendedores').where('authUid','==',assignment.uid).limit(2));
 const user=await admin.auth().getUser(assignment.uid).catch(()=>financialFail('Vendedor afiliado no disponible.'));
 if(!v||v.activo!==true||v.authUid!==assignment.uid||matches.size!==1||matches.docs[0].id!==assignment.affiliateId||user.disabled||!user.emailVerified)financialFail('Vendedor afiliado inactivo o sin cuenta verificada.');
 return {role:'AFFILIATE',uid:assignment.uid,affiliateId:assignment.affiliateId,name:String(v.nombre||'Vendedor afiliado').slice(0,200)};
}
/** The payment, receipt and custody movement commit together. Old unidentified cash is never guessed. */
export async function prepareCashCustody(db:Firestore,tx:Transaction,p:{created:FinancialPayment|null;reversed:FinancialPayment|null;operationId:string;budgetId:string;version:number;actor:string;at:string}){
 const payment=p.created||p.reversed;if(!payment?.cashCustody)return ()=>{};
 if(payment.method!=='EFECTIVO')financialFail('Custodia incompatible con el medio de pago.');
 const holder=payment.cashCustody,isSeller=holder.role==='AFFILIATE',id=movementId(p.operationId,payment.id),collection=db.collection(isSeller?'ledger_custodia_efectivo':'ledger_custodia_efectivo_admin'),ref=collection.doc(p.reversed?id+'_reverse':id);
 if((await tx.get(ref)).exists)financialFail('Movimiento de efectivo ya registrado.');
 if(p.reversed){
  const original=(await tx.get(collection.doc(id))).data();
  if(!original||original.montoCentavos!==payment.amountCents||original.ledgerMovimientoRelacionadoId!==payment.id||original.operationId!==p.operationId)financialFail('Origen de custodia inconsistente.');
  if(isSeller){const balance=await obtenerLedgerCustodiaEfectivo(db,holder.affiliateId,tx);if(balance.efectivoPendienteRendicionCentavos<payment.amountCents)financialFail('El efectivo ya fue rendido o compensado. Conciliá su devolución antes de revertir el cobro.');}
 }
 const row={id:ref.id,...(isSeller?{vendedorAfiliadoId:holder.affiliateId}:{administradorUid:holder.uid}),custodianUid:holder.uid,custodianName:holder.name,tipo:p.reversed?'AJUSTE_CUSTODIA_EFECTIVO':isSeller?'COBRO_EFECTIVO_VENDEDOR':'COBRO_EFECTIVO_ADMIN',montoCentavos:payment.amountCents*(p.reversed?-1:1),moneda:'ARS',ledgerMovimientoRelacionadoId:payment.id,solicitudId:p.operationId,operationId:p.operationId,budgetId:p.budgetId,budgetVersion:p.version,operationSchemaVersion:'OPERATION_CASH_V2',motivo:p.reversed?payment.reversalReason:'Cobro de cuota en efectivo',registradoPorUid:p.actor,idempotencyKey:ref.id,createdAt:p.at};
 return ()=>tx.create(ref,row);
}
