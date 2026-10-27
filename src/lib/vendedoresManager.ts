import { auth } from './firebase';
export interface Vendedor {
 id?:string; nombre:string; email:string; localidad:string; porcentajeComision:number|null;
 efectivoPendienteRendicionCentavos?:number|null; saldoDisponibleLiquidacionCentavos?:number|null;
 portalInvitationState?:string; telefono?:string; activo?:boolean; authUid?:string; revision?:number;
}
const pending=new Map<string,string>();
async function headers(){const user=auth.currentUser;if(!user)throw Error('Sesión administrativa requerida.');return {Authorization:`Bearer ${await user.getIdToken()}`,'Content-Type':'application/json'};}
export async function obtenerVendedores():Promise<Vendedor[]>{const response=await fetch('/api/admin/vendedores',{headers:await headers(),cache:'no-store'});if(!response.ok)throw Error('No se pudo consultar vendedores afiliados.');return (await response.json()).vendedores;}
async function save(v:Vendedor,id:string,reason:string){
 const payload={id,expectedRevision:v.revision??0,nombre:v.nombre,email:v.email,localidad:v.localidad,telefono:v.telefono??'',authUid:v.authUid??'',activo:v.activo!==false,porcentajeComision:v.porcentajeComision,reason};
 const key=JSON.stringify(payload);if(!pending.has(key))pending.set(key,crypto.randomUUID());
 const response=await fetch('/api/admin/vendedores/registro',{method:'POST',headers:await headers(),body:JSON.stringify({...payload,commandId:pending.get(key)})});
 if(!response.ok)throw Error('No se confirmó el cambio. Actualizá y verificá la revisión y el UID.');const result=await response.json();pending.delete(key);return {...v,id,revision:result.revision};
}
export async function crearVendedor(v:Omit<Vendedor,'id'>):Promise<Vendedor>{const key=JSON.stringify(v);if(!pending.has('create:'+key))pending.set('create:'+key,crypto.randomUUID());const result=await save(v,pending.get('create:'+key)!,'Alta administrativa');pending.delete('create:'+key);return result;}
export async function actualizarVendedor(id:string,updates:Partial<Vendedor>):Promise<void>{const v=(await obtenerVendedores()).find(v=>v.id===id);if(!v)throw Error('Vendedor afiliado no disponible.');await save({...v,...updates},id,'Actualización administrativa');}
/** Historical profiles are never physically deleted. */
export async function eliminarVendedor(id:string):Promise<void>{await actualizarVendedor(id,{activo:false});}
