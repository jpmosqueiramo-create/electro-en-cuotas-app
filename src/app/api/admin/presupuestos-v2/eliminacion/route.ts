import { getBudgetDocumentationBucket } from '@/lib/budgetDocumentationStorage';
import { deleteTestDossier, previewTestDossierDeletion } from '@/lib/budgetTestDossierDeletion';
import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { deleteBudgetFamily, previewBudgetDeletion } from '@/lib/budgetV2Deletion';
export async function POST(req: Request) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return auth.errorResponse!;
  try {
    const body = await req.json();
    if (body.mode === 'PREVIEW' && Object.keys(body).sort().join(',') === 'budgetId,mode') return NextResponse.json({preview: await previewBudgetDeletion(admin.firestore(), body.budgetId)});
    if (body.mode === 'PREVIEW_TEST' && Object.keys(body).sort().join(',') === 'budgetId,mode') return NextResponse.json({preview:await previewTestDossierDeletion(admin.firestore(),await getBudgetDocumentationBucket(),body.budgetId)});
    if (body.mode === 'DELETE_TEST') { const {mode:_mode,...command}=body;void _mode;return NextResponse.json({result:await deleteTestDossier(admin.firestore(),await getBudgetDocumentationBucket(),command,auth.uid!)}); }
    if (body.mode !== 'DELETE') return NextResponse.json({error: 'Comando inválido.'}, {status: 400});
    const {mode: _mode, ...command} = body;
    void _mode;
    return NextResponse.json({result: await deleteBudgetFamily(admin.firestore(), command, auth.uid!)});
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const safe = ['El presupuesto', 'La familia', 'Confirmación', 'Identificador', 'Comando', 'Conflicto'].some(prefix => message.startsWith(prefix));
    return NextResponse.json({error: safe ? message : 'No se pudo verificar o eliminar el presupuesto. No confirmes hasta volver a verificar.'}, {status: 409});
  }
}
