import { exact, opaque } from './contractV2';
export class ClientPortalError extends Error {}
export function portalFail(message='No se pudo validar el acceso al servicio.'):never {throw new ClientPortalError(message);}
export function invitationsEnabled(env:Record<string,string|undefined>=process.env) {
 return env.NODE_ENV!=='production' && !env.K_SERVICE && !env.GAE_ENV && env.GCLOUD_PROJECT==='demo-cuenta-hogar' && env.NEXT_PUBLIC_FIREBASE_PROJECT_ID==='demo-cuenta-hogar' &&
  (!env.GOOGLE_CLOUD_PROJECT||env.GOOGLE_CLOUD_PROJECT==='demo-cuenta-hogar') &&
  env.FIRESTORE_EMULATOR_HOST==='127.0.0.1:8080' && env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099' &&
  !env.FIREBASE_CLIENT_EMAIL&&!env.FIREBASE_PRIVATE_KEY&&!env.GOOGLE_APPLICATION_CREDENTIALS&&!env.FIREBASE_SERVICE_ACCOUNT_KEY&&!env.FIREBASE_SERVICE_ACCOUNT_JSON;
}
export function requireInvitationEmulator(){if(!invitationsEnabled())portalFail('Invitaciones V2 productivas deshabilitadas. Falta cierre de entrega y control de firmas.');}
export interface ClientBindingV2 {
 schemaVersion:'OPERATION_CLIENT_V2';operationId:string;revision:number;uid:string|null;
 state:'PREPARED'|'ACTIVE'|'REVOKED';activeInvitationId:string|null;activatedAt:string|null;
}
export interface ClientInvitationV2 {
 schemaVersion:'CLIENT_INVITATION_V2';invitationId:string;operationId:string;budgetId:string;version:number;
 tokenHash:string;email:string;targetUid:string|null;state:'PENDING'|'REVOKED'|'REDEEMED';
 createdBy:string;createdAt:string;expiresAt:string;redeemedBy:string|null;redeemedAt:string|null;revokedAt:string|null;
}
export function portalEmail(value:unknown){if(typeof value!=='string'||value.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(value))portalFail('Email inválido.');return value.trim().toLowerCase();}
export function portalToken(value:unknown):string {if(typeof value!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(value))portalFail();return value;}
export function parseClientCommand(value:unknown){
 const c=exact(value,['commandId','operationId','expectedRevision','action','data']);opaque(c.commandId);
 if(!/^op_[a-f0-9]{64}$/.test(String(c.operationId))||!Number.isSafeInteger(c.expectedRevision)||Number(c.expectedRevision)<0||!['LINK','INVITE','REVOKE','REVOKE_ACCESS'].includes(String(c.action))||!c.data||typeof c.data!=='object'||Array.isArray(c.data))portalFail();
 return c as unknown as {commandId:string;operationId:string;expectedRevision:number;action:'LINK'|'INVITE'|'REVOKE'|'REVOKE_ACCESS';data:Record<string,unknown>};
}
