import {NextResponse} from 'next/server';
import {contractHeaders} from '@/lib/contractV2Http';
/** Retired email-based writer. Current promises require an assigned V2 operation. */
export async function POST(req:Request){void req;return NextResponse.json({error:'Registrá la promesa desde la operación asignada. El circuito anterior está deshabilitado.'},{status:403,headers:contractHeaders});}
