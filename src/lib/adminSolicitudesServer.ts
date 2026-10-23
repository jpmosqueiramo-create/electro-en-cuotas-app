import {FieldPath,type Firestore} from 'firebase-admin/firestore';
import {isAdminSolicitudSource,mapSolicitudCuentaToAdminReadModel,mapSolicitudToAdminReadModel,storedDateMillis,type AdminSolicitudListItem} from './adminSolicitudesReadModel';
export const ADMIN_REQUEST_PAGE_SIZE=100;
/** Explicit projection, bounded reads and no index/migration requirements. */
export async function readAdminRequestPage(db:Firestore,source:string,cursor:string|null){
 if(!isAdminSolicitudSource(source)||cursor!==null&&(!cursor||cursor.includes('/')||Buffer.byteLength(cursor)>1500))throw Error('INVALID_REQUEST_PAGE');
 let query=db.collection(source).orderBy(FieldPath.documentId()).limit(ADMIN_REQUEST_PAGE_SIZE+1);
 if(cursor)query=query.startAfter(cursor);
 const result=await query.get(),docs=result.docs.slice(0,ADMIN_REQUEST_PAGE_SIZE),map=source==='solicitudes'?mapSolicitudToAdminReadModel:mapSolicitudCuentaToAdminReadModel;
 const date=(value:unknown)=>{const millis=storedDateMillis(value);return millis===null?null:new Date(millis).toISOString();};
 const items:AdminSolicitudListItem[]=docs.map(doc=>{
  const item=map(doc.id,doc.data());
  // Only the wire projection uses ISO dates; persisted Timestamps remain untouched.
  return {...item,fechaCreacion:date(item.fechaCreacion),propuestas:item.propuestas.map(p=>({...p,fecha:date(p.fecha)})),actividad:item.actividad.map(a=>({...a,fecha:date(a.fecha)!}))};
 });
 return {items,nextCursor:result.size>ADMIN_REQUEST_PAGE_SIZE?docs.at(-1)!.id:null};
}
