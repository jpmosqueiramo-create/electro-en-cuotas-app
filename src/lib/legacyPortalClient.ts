import { Timestamp } from 'firebase/firestore';
/** Reconstruct only the explicitly serialized creation timestamp used by historical UI. */
export function restoreLegacyDates<T extends {fechaCreacion:string|null}>(items:T[]){return items.map(item=>({...item,fechaCreacion:item.fechaCreacion?Timestamp.fromDate(new Date(item.fechaCreacion)):null}));}
export const legacyBlockedMessage='Acción del circuito anterior deshabilitada. Solicitá la gestión a Administración; no se modificarán cuotas, entregas ni documentación desde este control.';
