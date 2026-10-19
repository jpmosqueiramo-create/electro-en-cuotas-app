import { reject } from './contractV2';
export const contractHeaders={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive'};
export async function contractJson(req:Request) {
  if(!req.headers.get('content-type')?.startsWith('application/json')||req.headers.has('content-encoding'))reject();
  const reader=req.body?.getReader();if(!reader)reject();const chunks:Uint8Array[]=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16384){await reader.cancel();reject('Solicitud demasiado grande.');}chunks.push(value);}}finally{reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}catch{reject();}
}
