// Public codes/messages are fixed. Never return exception text or persisted values.
export type DocumentPreviewCode = 'DOCUMENT_DATA_PENDING' | 'DOCUMENT_IDENTITY_REVIEW_REQUIRED' | 'DOCUMENT_CONFORMITY_PENDING' | 'DOCUMENT_ORIGIN_INCONSISTENT' | 'DOCUMENT_RENDER_FAILED' | 'DOCUMENT_SERVER_ERROR';
export const documentPreviewMessages: Record<DocumentPreviewCode,string> = {
 DOCUMENT_DATA_PENDING:'El borrador está disponible. Los datos faltantes se muestran como pendientes.',
 DOCUMENT_IDENTITY_REVIEW_REQUIRED:'Revisá y verificá la identidad del cliente antes de generar los documentos.',
 DOCUMENT_CONFORMITY_PENDING:'Falta registrar la nueva conformidad del cliente sobre las condiciones guardadas.',
 DOCUMENT_ORIGIN_INCONSISTENT:'Los datos guardados no son consistentes con el origen de la operación. Requieren revisión administrativa.',
 DOCUMENT_RENDER_FAILED:'No se pudo generar el PDF. Los datos guardados no fueron modificados. Solicitá una revisión técnica.',
 DOCUMENT_SERVER_ERROR:'No se pudo consultar la vista previa. Volvé a intentar más tarde.',
};
export type PreviewStage = 'READ' | 'PROJECTION' | 'RENDER';
export type PreviewReason = 'INVALID_VERSION' | 'MISSING_SOURCE' | 'SOURCE_MISMATCH' | 'INVALID_PERSONAL_DATA' | 'ECONOMIC_MISMATCH' | 'SCHEDULE_MISMATCH' | 'IDENTITY_BLOCK' | 'CONFORMITY_BLOCK' | 'UNSUPPORTED_TEXT' | 'PDF_GENERATION_FAILED' | 'UNEXPECTED_READ_ERROR';
export class DocumentPreviewError extends Error {
 constructor(public readonly code:DocumentPreviewCode,public readonly stage:PreviewStage,public readonly reason:PreviewReason){super(code);this.name='DocumentPreviewError';}
}
export function previewFailure(error:unknown){
 const known=error instanceof DocumentPreviewError?error:new DocumentPreviewError('DOCUMENT_SERVER_ERROR','READ','UNEXPECTED_READ_ERROR');
 return {status:known.code==='DOCUMENT_ORIGIN_INCONSISTENT'?409:known.code==='DOCUMENT_IDENTITY_REVIEW_REQUIRED'||known.code==='DOCUMENT_CONFORMITY_PENDING'?409:500,body:{code:known.code,error:documentPreviewMessages[known.code]},diagnostic:{code:known.code,stage:known.stage,reason:known.reason}};
}
