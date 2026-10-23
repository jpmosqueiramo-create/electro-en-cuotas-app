import type {User} from 'firebase/auth';
import {ADMIN_SOLICITUD_SOURCES,type AdminSolicitudSource,type AdminSolicitudListItem} from './adminSolicitudesReadModel';
import type {AdminSolicitudesLoadResult} from './adminSolicitudesReader';
export type RequestPageCursors=Partial<Record<AdminSolicitudSource,string|null>>;
export type AuthorizedRequestPage=AdminSolicitudesLoadResult&{cursors:RequestPageCursors};
export class AdministrativeRequestAccessError extends Error {}
/** The browser never reads private Firestore directly; each source fails independently. */
export async function loadAuthorizedRequestPage(user:Pick<User,'getIdToken'>,cursors:RequestPageCursors={},signal?:AbortSignal):Promise<AuthorizedRequestPage>{
 const token=await user.getIdToken();
 const sources=ADMIN_SOLICITUD_SOURCES.filter(source=>cursors[source]!==null);
 const settled=await Promise.allSettled(sources.map(async source=>{
  const query=new URLSearchParams({source});if(cursors[source])query.set('cursor',cursors[source]!);
  const r=await fetch('/api/admin/solicitudes?'+query,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal});
  if(r.status===401||r.status===403)throw new AdministrativeRequestAccessError('ADMIN_ACCESS_EXPIRED');
  if(!r.ok)throw Error('REQUEST_PAGE_FAILED');
  const data=await r.json() as {items:AdminSolicitudListItem[];nextCursor:string|null};
  if(!Array.isArray(data.items)||data.items.some(i=>i.sourceCollection!==source)||data.nextCursor!==null&&typeof data.nextCursor!=='string')throw Error('INVALID_PAGE');
  return data;
 }));
 if(settled.some(entry=>entry.status==='rejected'&&entry.reason instanceof AdministrativeRequestAccessError))throw new AdministrativeRequestAccessError('ADMIN_ACCESS_EXPIRED');
 const result:AuthorizedRequestPage={items:[],errors:{},loadedSources:[],cursors:{...cursors}};
 settled.forEach((entry,i)=>{const source=sources[i];if(entry.status==='fulfilled'){result.items.push(...entry.value.items);result.loadedSources.push(source);result.cursors[source]=entry.value.nextCursor;}else result.errors[source]='unavailable';});
 return result;
}
export function mergeAuthorizedRequestPages(previous:AuthorizedRequestPage,next:AuthorizedRequestPage):AuthorizedRequestPage{
 const errors={...previous.errors};for(const source of next.loadedSources)delete errors[source];Object.assign(errors,next.errors);
 return {items:[...new Map([...previous.items,...next.items].map(item=>[item.recordKey,item])).values()],errors,loadedSources:[...new Set([...previous.loadedSources,...next.loadedSources])],cursors:{...previous.cursors,...next.cursors}};
}
