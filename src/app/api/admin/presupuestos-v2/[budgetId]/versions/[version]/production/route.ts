import {reopenBeforeSignature} from '@/lib/productionV2/documentRevision';
import { NextResponse } from 'next/server';
import { admin } from '@/lib/firebaseAdmin';
import { isAdminEmail } from '@/lib/adminIdentity';
import { contractHeaders, contractJson } from '@/lib/contractV2Http';
import { exact, opaque } from '@/lib/contractV2';
import { custodyParams } from '@/lib/operationCustodyV2Http';
import { runtimeForDatabase } from '@/lib/productionV2/runtime';
import { productionOverview, productionHistoryKeys, type ProductionHistoryPage } from '@/lib/productionV2/overview';
import { authorizeIssuanceRecovery, revokeIssuanceRecovery } from '@/lib/productionV2/issuanceRecovery';
import { recordFinalPackageApproval, authorizeOperation, revokeAuthorization } from '@/lib/productionV2/authorization';
import { freezeOperation } from '@/lib/productionV2/freeze';
import { issueDocuments, readIssuedDocument } from '@/lib/productionV2/documents';
import { getBudgetDocumentationBucket } from '@/lib/budgetDocumentationStorage';
import type { FinalDocumentKind } from '@/lib/productionV2/catalog';
export const runtime = 'nodejs';
async function handler(req: Request, { params }: {
    params: Promise<{
        budgetId: string;
        version: string;
    }>;
}) {
    let uid: string;
    try {
        const header = req.headers.get('authorization');
        if (!header?.startsWith('Bearer '))
            throw Error();
        const token = await admin.auth().verifyIdToken(header.slice(7), true), user = await admin.auth().getUser(token.uid);
        if (user.disabled || !user.emailVerified || !isAdminEmail(user.email))
            throw Error();
        uid = user.uid;
    }
    catch {
        return NextResponse.json({ error: 'Se requiere una sesión administrativa vigente y correo verificado.' }, { status: 403, headers: contractHeaders });
    }
    try {
        const p = await params, v = custodyParams(p.budgetId, p.version), db = admin.firestore(), context = runtimeForDatabase(db, admin.auth()), url = new URL(req.url);
        if (req.method === 'GET') {
            if (url.searchParams.has('document')) {
                if (url.searchParams.size !== 1 || !url.searchParams.has('document'))
                    throw Error('INVALID_REQUEST');
                const bytes = await readIssuedDocument(context, await getBudgetDocumentationBucket(), p.budgetId, v, url.searchParams.get('document') as FinalDocumentKind, uid);
                return new NextResponse(new Uint8Array(bytes), { headers: { ...contractHeaders, 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' } });
            }
            const page: ProductionHistoryPage = {};
            for (const [key, value] of url.searchParams) {
                if (!productionHistoryKeys.includes(key as typeof productionHistoryKeys[number]) || url.searchParams.getAll(key).length !== 1) throw Error('INVALID_HISTORY_PAGE');
                page[key as typeof productionHistoryKeys[number]] = value;
            }
            return NextResponse.json(await productionOverview(context, p.budgetId, v, uid, page), { headers: contractHeaders });
        }
        if (url.search)
            throw Error('INVALID_REQUEST');
        const c = exact(await contractJson(req), ['action', 'data']);
        let result: unknown;
        if (c.action === 'REGISTER_PACKAGE_APPROVAL')
            result = await recordFinalPackageApproval(context, c.data, uid);
        else if (c.action === 'AUTHORIZE')
            result = await authorizeOperation(context, p.budgetId, v, c.data, uid);
        else if(c.action==='REOPEN_BEFORE_SIGNATURE')result=await reopenBeforeSignature(context,p.budgetId,v,c.data,uid);
        else if (c.action === 'FREEZE')
            result = await freezeOperation(context, p.budgetId, v, c.data, uid);
        else if (c.action === 'AUTHORIZE_ISSUANCE_RECOVERY')
            result = await authorizeIssuanceRecovery(context, p.budgetId, v, c.data, uid);
        else if (c.action === 'REVOKE_ISSUANCE_RECOVERY')
            result = await revokeIssuanceRecovery(context, p.budgetId, v, c.data, uid);
        else if (c.action === 'ISSUE_DOCUMENTS' || c.action === 'RECOVER_DOCUMENTS') {
            const d = exact(c.data, c.action === 'RECOVER_DOCUMENTS' ? ['confirmed', 'recoveryId'] : ['confirmed']);
            if (d.confirmed !== true)
                throw Error('EXPLICIT_CONFIRMATION_REQUIRED');
            result = await issueDocuments(context, await getBudgetDocumentationBucket(), p.budgetId, v, uid, c.action === 'RECOVER_DOCUMENTS' ? opaque(d.recoveryId) : undefined);
        }
        else if (c.action === 'REVOKE_AUTHORIZATION')
            result = await revokeAuthorization(context, p.budgetId, v, c.data, uid);
        else
            throw Error('INVALID_REQUEST');
        return NextResponse.json(result, { headers: contractHeaders });
    }
    catch {
        return NextResponse.json({ error: 'No se confirmó la operación. Revisá los requisitos, la autorización y la revisión vigente. No cambies los identificadores al reintentar una solicitud sin respuesta.' }, { status: 409, headers: contractHeaders });
    }
}
export const GET = handler;
export const POST = handler;
