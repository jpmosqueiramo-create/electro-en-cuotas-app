import {requestWorkflows} from './adminWorkflowServer';
import {readFollowUpSummaries} from './adminSolicitudFollowUpServer';
import {administrativeStatuses} from './adminRecordRemovalServer';
import {FieldPath,type Firestore} from 'firebase-admin/firestore';
import {isAdminSolicitudSource,mapSolicitudCuentaToAdminReadModel,mapSolicitudToAdminReadModel,toAdminSolicitudHttpPayload,type AdminSolicitudListItem} from './adminSolicitudesReadModel';
export const ADMIN_REQUEST_PAGE_SIZE=100;
/** Explicit projection, bounded reads and no index/migration requirements. */
export async function readAdminRequestPage(db:Firestore,source:string,cursor:string|null){
 if(!isAdminSolicitudSource(source)||cursor!==null&&(!cursor||cursor.includes('/')||Buffer.byteLength(cursor)>1500))throw Error('INVALID_REQUEST_PAGE');
 let query=db.collection(source).orderBy(FieldPath.documentId()).limit(ADMIN_REQUEST_PAGE_SIZE+1);
 if(cursor)query=query.startAfter(cursor);
 const result=await query.get(),docs=result.docs.slice(0,ADMIN_REQUEST_PAGE_SIZE),map=source==='solicitudes'?mapSolicitudToAdminReadModel:mapSolicitudCuentaToAdminReadModel;
 const states=await administrativeStatuses(db,docs.map(doc=>({kind:'REQUEST',source,id:doc.id})));
 const workflows=await requestWorkflows(db,source,docs.map(d=>d.id));
 const followUps=await readFollowUpSummaries(db,source,docs.map(d=>d.id));
 const items:AdminSolicitudListItem[]=docs.map(doc=>{
  const item=toAdminSolicitudHttpPayload(map(doc.id,doc.data()));
  // Only the wire projection uses ISO dates; persisted Timestamps remain untouched.
  return {...item,followUp:followUps[doc.id],workflow:workflows[doc.id]??[],tipoPresentacion:workflows[doc.id]?.length?'Solicitud':item.tipoPresentacion,administrativeState:states[doc.id]??null};
 });
 return {items,nextCursor:result.size>ADMIN_REQUEST_PAGE_SIZE?docs.at(-1)!.id:null};
}
