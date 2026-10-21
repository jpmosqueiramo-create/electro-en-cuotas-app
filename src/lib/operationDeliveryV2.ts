import { exact,opaque } from './contractV2';
import { invitationsEnabled } from './operationClientV2';
import type { CustodyParticipant,CustodyTransfer } from './operationCustodyV2';
export const deliveryDocumentKinds=['MANDATE','PAGARE','REMITO'] as const;
export type DeliveryDocumentKind=typeof deliveryDocumentKinds[number];
export const deliverySlots=['MANDATE_PREPARED','PAGARE_PREPARED','REMITO_PREPARED','MANDATE_SIGNED','PAGARE_SIGNED','REMITO_SIGNED','DAMAGE','PACKAGING'] as const;
export type DeliverySlot=typeof deliverySlots[number];
export class DeliveryError extends Error {}
export function deliveryFail(message='No se pudo verificar la entrega documental V2.'):never{throw new DeliveryError(message);}
export function deliveryEnabled(env:Record<string,string|undefined>=process.env){return invitationsEnabled(env)&&env.NODE_ENV!=='production'&&!env.K_SERVICE&&!env.GAE_ENV&&env.FIREBASE_STORAGE_EMULATOR_HOST==='127.0.0.1:9199';}
export function requireDeliveryEmulator(){if(!deliveryEnabled())deliveryFail('Entrega V2 productiva bloqueada: revisión jurídica pendiente.');}
export interface DeliveryDocument {
 prepared:{photoId:string;sha256:string;reference:string;templateVersion:string;by:string;at:string}|null;
 signature:{photoId:string;sha256:string;clientSigned:true;legible:true;identityChecked:true;loopSigned:boolean;signedAt:string;verifiedBy:string;verifiedAt:string}|null;
 invalidatedAt:string|null;
}
export interface DeliveryV2 {
 schemaVersion:'OPERATION_DELIVERY_V2';operationId:string;revision:number;status:'PREPARING'|'DELIVERED_EMULATOR';
 responsible:CustodyParticipant|null;documents:Record<DeliveryDocumentKind,DeliveryDocument>;
 originals:{holder:CustodyParticipant;location:string;receivedAt:string;reference:string;documentHashes:Record<DeliveryDocumentKind,string>}|null;
 originalsTransfer:CustodyTransfer|null;
 holds:{id:string;type:'MISSING_SIGNATURE'|'DAMAGE';at:string;clearedAt:string|null;clearedBy:string|null;reason:string|null;photoIds:string[]}[];
 event:null|{schemaVersion:'DELIVERY_CONFIRMED_V2';executionMode:'EMULATOR_ONLY';operationId:string;commandId:string;occurredAt:string;recordedAt:string;recordedBy:string;responsible:CustodyParticipant;product:{name:string;referenceId:string|null};documents:Record<DeliveryDocumentKind,DeliveryDocument>;originals:NonNullable<DeliveryV2['originals']>;identity:{budgetId:string;budgetVersion:number;sourceCollection:string;solicitudId:string;acceptedOptionId:string;contractDraftId:string};alternativeEvidence:string|null;legalApproval:'PENDING'};
}
export function initialDelivery(operationId:string):DeliveryV2{return {schemaVersion:'OPERATION_DELIVERY_V2',operationId,revision:0,status:'PREPARING',responsible:null,documents:Object.fromEntries(deliveryDocumentKinds.map(k=>[k,{prepared:null,signature:null,invalidatedAt:null}])) as DeliveryV2['documents'],originals:null,originalsTransfer:null,holds:[],event:null};}
export function deliveryKind(value:unknown):DeliveryDocumentKind{if(!deliveryDocumentKinds.includes(value as DeliveryDocumentKind))deliveryFail();return value as DeliveryDocumentKind;}
export function deliveryCommandInput(value:unknown){const c=exact(value,['operationId','commandId','expectedRevision','action','data']);opaque(c.commandId);if(!/^op_[a-f0-9]{64}$/.test(String(c.operationId))||!Number.isSafeInteger(c.expectedRevision)||Number(c.expectedRevision)<0||!['PREPARE_DELIVERY','PREPARE_DOCUMENT','VERIFY_SIGNATURE','RECEIVE_ORIGINALS','AUTHORIZE_ORIGINALS_TRANSFER','CONFIRM_ORIGINALS_DELIVERY','CONFIRM_ORIGINALS_RECEIPT','REGULARIZE_ORIGINALS_TRANSFER','CANCEL_ORIGINALS_TRANSFER','REPORT_MISSING_SIGNATURE','REPORT_DAMAGE','CLEAR_HOLD','CONFIRM_DELIVERY','REGULARIZE_DELIVERY'].includes(String(c.action))||!c.data||typeof c.data!=='object'||Array.isArray(c.data))deliveryFail();return c as unknown as {operationId:string;commandId:string;expectedRevision:number;action:string;data:Record<string,unknown>};}
