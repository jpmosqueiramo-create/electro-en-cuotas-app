import type {Firestore} from 'firebase-admin/firestore';
import {validateLoopTariffs,type LoopTariffConfiguration} from './loopServiceTariffs';
export const loopTariffsPath='configuracion_general/loop_tarifas_servicios';
export function parseLoopTariffConfiguration(data:FirebaseFirestore.DocumentData|undefined):LoopTariffConfiguration {
 if(!data)return {revision:0,tariffs:null};
 if(data.schemaVersion!=='LOOP_SERVICE_TARIFFS_V1'||!Number.isSafeInteger(data.revision)||data.revision<1)throw Error('Configuración de tarifas inválida.');
 return {revision:data.revision,tariffs:validateLoopTariffs(data.tariffs)};
}
export async function readLoopTariffs(db:Firestore){return parseLoopTariffConfiguration((await db.doc(loopTariffsPath).get()).data());}
export async function saveLoopTariffs(db:Firestore,tariffs:unknown,expectedRevision:number,actor:string){
 const valid=validateLoopTariffs(tariffs);
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('Revisión inválida.');
 return db.runTransaction(async tx=>{
  const ref=db.doc(loopTariffsPath),current=parseLoopTariffConfiguration((await tx.get(ref)).data());
  if(current.revision!==expectedRevision)throw Error('Las tarifas cambiaron en otra sesión. Recargá antes de guardar.');
  const next={revision:current.revision+1,tariffs:valid},at=new Date().toISOString();
  tx.set(ref,{schemaVersion:'LOOP_SERVICE_TARIFFS_V1',...next,updatedBy:actor,updatedAt:at});
  tx.create(ref.collection('revisions').doc(String(next.revision)),{schemaVersion:'LOOP_SERVICE_TARIFFS_V1',...next,updatedBy:actor,updatedAt:at});
  return next;
 });
}
