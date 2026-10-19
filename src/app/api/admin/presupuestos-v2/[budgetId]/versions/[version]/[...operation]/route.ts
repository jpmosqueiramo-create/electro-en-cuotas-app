import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/adminAuth';
import { admin } from '@/lib/firebaseAdmin';
import { budgetV2SafeErrorMessage } from '@/lib/budgetV2';
import { documentType, fail, identity, MAX_ATTACHMENT_SIZE_BYTES } from '@/lib/budgetAcceptanceV2';
import { acceptBudgetV2, caseRefs, loadDocumentation } from '@/lib/budgetAcceptanceV2Server';
import { deleteBudgetDocument, downloadBudgetDocument, getBudgetDocumentationBucket, observeBudgetDocument, uploadBudgetDocument } from '@/lib/budgetDocumentationStorage';

export const runtime = 'nodejs';
type Context = { params: Promise<{ budgetId: string; version: string; operation: string[] }> };
async function boundedBody(req: NextRequest, max: number) {
  if (Number(req.headers.get('content-length')) > max) fail('La solicitud supera el tamaño permitido.');
  const reader = req.body?.getReader(); if (!reader) fail();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); fail('La solicitud supera el tamaño permitido.'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
async function handle(req: NextRequest, ctx: Context) {
  const auth = await verifyAdminAuth(req);
  if (!auth.authorized) return NextResponse.json({ error: 'Acceso Admin requerido.' }, { status: auth.errorResponse?.status === 403 ? 403 : 401 });
  try {
    if ([...req.nextUrl.searchParams.keys()].length) fail();
    if (req.method === 'GET' && req.body !== null) await boundedBody(req, 0);
    const { budgetId, version: raw, operation } = await ctx.params;
    if (!/^[1-9]\d*$/.test(raw)) fail();
    const version = Number(raw); identity(budgetId, version);
    const db = admin.firestore();
    const json = async () => JSON.parse((await boundedBody(req, 8192)).toString('utf8')) as unknown;
    const result = (data: unknown) => NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
    if (operation.length === 1 && operation[0] === 'acceptance') {
      if (req.method === 'GET') {
        const snap = await caseRefs(db, budgetId, version).acceptance.get();
        return result({ acceptance: snap.exists ? snap.data() : null });
      }
      if (req.method === 'POST') {
        const input = await json();
        if (!input || typeof input !== 'object' || !('budgetId' in input) || !('version' in input) || input.budgetId !== budgetId || input.version !== version) fail();
        return result({ acceptance: await acceptBudgetV2(db, input, auth.uid!) });
      }
    }
    if (operation[0] !== 'documentation') fail();
    await loadDocumentation(db, budgetId, version);
    if (operation.length === 1 && req.method === 'GET') return result(await loadDocumentation(db, budgetId, version));
    const type = documentType(operation[1]);
    if (operation.length === 2 && req.method === 'PATCH') return result({ documentation: await observeBudgetDocument(db, budgetId, version, type, await json(), auth.uid!) });
    if (operation[2] !== 'attachments') fail();
    if (operation.length === 3 && req.method === 'POST') {
      const contentType = req.headers.get('content-type') ?? '';
      if (!contentType.startsWith('multipart/form-data;')) fail();
      const body = await boundedBody(req, MAX_ATTACHMENT_SIZE_BYTES + 65536);
      const form = await new Response(body, { headers: { 'Content-Type': contentType } }).formData();
      const keys = [...form.keys()]; if (keys.length !== 2 || !keys.includes('file') || !keys.includes('commandId')) fail();
      const file = form.get('file'); if (!(file instanceof File)) fail();
      const attachment = await uploadBudgetDocument(db, await getBudgetDocumentationBucket(), budgetId, version, type,
        { commandId: form.get('commandId'), originalName: file.name, mimeType: file.type }, Buffer.from(await file.arrayBuffer()), auth.uid!);
      return result({ attachment });
    }
    if (operation.length === 4) {
      const id = operation[3];
      if (req.method === 'DELETE') return result({ deletion: await deleteBudgetDocument(db, await getBudgetDocumentationBucket(), budgetId, version, type, id, await json(), auth.uid!) });
      if (req.method === 'GET') {
        const { attachment, bytes } = await downloadBudgetDocument(db, await getBudgetDocumentationBucket(), budgetId, version, type, id);
        return new Response(new Uint8Array(bytes), { headers: {
          'Content-Type': attachment.mimeType, 'Content-Length': String(bytes.length),
          'Content-Disposition': `attachment; filename="documento"; filename*=UTF-8''${encodeURIComponent(attachment.originalName).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}`,
          'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
        } });
      }
    }
    fail();
  } catch (error) { return NextResponse.json({ error: budgetV2SafeErrorMessage(error) }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } }); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
