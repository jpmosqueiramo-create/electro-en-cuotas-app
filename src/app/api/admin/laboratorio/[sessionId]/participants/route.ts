import {NextResponse} from 'next/server';
import {admin} from '@/lib/firebaseAdmin';
import {requireLabAdministrator} from '@/lib/operationsLabAuth';
import {resolveLabExecutionContext} from '@/lib/operationsLabContext';
import {labParticipantCommand} from '@/lib/operationsLabParticipants';
import {LabError} from '@/lib/operationsLabPolicy';
import {contractHeaders,contractJson} from '@/lib/contractV2Http';
export const runtime='nodejs';
export async function POST(req:Request,{params}:{params:Promise<{sessionId:string}>}){try{const uid=await requireLabAdministrator(req),{sessionId}=await params;const context=await resolveLabExecutionContext(admin.firestore(),uid,sessionId,process.env);return NextResponse.json(await labParticipantCommand(context,await contractJson(req)),{headers:contractHeaders});}catch(e){return NextResponse.json({error:e instanceof LabError?e.code:'LAB_PARTICIPANT_UNAVAILABLE'},{status:e instanceof LabError?e.status:503,headers:contractHeaders});}}
