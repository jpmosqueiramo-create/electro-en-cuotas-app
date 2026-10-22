/** Canonical navigation only: no reads, writes or identity inference. */
export const adminPaths={requests:'/admin/solicitudes',budgets:'/admin/presupuestos',documents:'/admin/documentacion',collections:'/admin/cobranzas',logistics:'/admin/logistica'} as const;
export type LegacyAdminQuery=Record<string,string|string[]|undefined>;
export function legacyAdminDestination(kind:'validation'|'collections'|'logistics',query:LegacyAdminQuery){
  const source=query.sourceCollection,id=query.solicitudId;
  const validId=typeof id==='string'&&id.length>0&&!id.includes('/')&&id!=='.'&&id!=='..';
  if((source==='solicitudes'||source==='solicitudes_cuenta')&&validId)return `${adminPaths.requests}/${source}/${encodeURIComponent(id)}`;
  if(kind==='collections')return adminPaths.collections;
  if(kind==='logistics')return adminPaths.logistics;
  // A legacy ID without its collection is ambiguous. Keep it as an explicit
  // reference filter; never resolve an identity by names, DNI or email.
  if(validId)return `${adminPaths.requests}?view=all&reference=${encodeURIComponent(id)}`;
  if(query.tab==='documentacion')return adminPaths.documents;
  if(query.tab==='logistica'||query.tab==='entregas')return adminPaths.logistics;
  return adminPaths.requests;
}
