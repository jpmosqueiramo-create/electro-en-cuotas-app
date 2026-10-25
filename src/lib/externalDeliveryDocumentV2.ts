import { contractValueHash } from './contractIntegrityV2';
import type { DeliveryV2, DeliveryDocumentKind } from './operationDeliveryV2';
export const externalDeliveryPolicy = 'EXTERNAL_TRANSFER_AND_RECEIPT_V1' as const;
export interface ExternalTransferDocument {
    photoId:string; sha256:string; number:string; date:string; issuer:string;
    documentType:'REMITO'|'GUIA'|'EQUIVALENT_TRANSFER_DOCUMENT'; applicabilityReference:string;
    operationId:string; snapshotHash:string; customerHash:string; productHash:string;
    checkedBy:string; checkedAt:string;
}
export interface ExternalDeliveryReceipt {
    photoId:string; sha256:string; externalDocumentHash:string;
    receivedAt:string; observations:string; clientSigned:true; identityChecked:true;
    productChecked:true; legible:true; checkedBy:string; checkedAt:string;
}
export function requiredDeliveryKinds(d:DeliveryV2):readonly DeliveryDocumentKind[]{
    if(d.documentPolicy!==undefined&&d.documentPolicy!==externalDeliveryPolicy)throw Error('DELIVERY_POLICY_INVALID');
    return d.documentPolicy===externalDeliveryPolicy?['MANDATE','PAGARE']:['MANDATE','PAGARE','REMITO'];
}
export function externalDeliveryMissing(d:DeliveryV2):string[]{
    if(d.documentPolicy!==externalDeliveryPolicy)return [];
    const x=d.externalTransfer, r=d.externalReceipt, missing:string[]=[];
    if(!x||x.operationId!==d.operationId||!x.number||!x.issuer||!x.applicabilityReference||!x.snapshotHash||!x.customerHash||!x.productHash||!x.photoId||!x.sha256)missing.push('Documento externo de traslado vinculado y verificado');
    if(!x||!r||r.externalDocumentHash!==contractValueHash(x)||!r.clientSigned||!r.identityChecked||!r.productChecked||!r.legible||!r.photoId||!r.sha256)missing.push('Constancia firmada de recepción del producto verificada');
    return missing;
}
export function externalEvidence(d:DeliveryV2){return d.documentPolicy===externalDeliveryPolicy?[d.externalTransfer,d.externalReceipt].filter((x):x is ExternalTransferDocument|ExternalDeliveryReceipt=>!!x):[];}
