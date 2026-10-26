/** Administrative visibility only. Canonical documents and financial balances stay intact. */
export type AdminRecordSubject = {kind:'REQUEST';source:'solicitudes'|'solicitudes_cuenta';id:string}|{kind:'BUDGET';id:string}|{kind:'CONTRACT';id:string;version:number};
export type AdminRecordState = 'ACTIVE'|'DELETED'|'ARCHIVED';
export interface AdminRecordStatus {state:AdminRecordState;revision:number;at:string;reason:string}
export interface AdminRemovalPreview {subject:AdminRecordSubject;state:AdminRecordState;resultState:AdminRecordState;fingerprint:string;preservedPaths:string[];description:string}
