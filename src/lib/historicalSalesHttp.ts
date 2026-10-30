import {historicalFail} from './historicalSales';
/** Bounded JSON body supports up to 120 imported installments with UTF-8 notes. */
export async function historicalJson(req:Request){
 if(!req.headers.get('content-type')?.startsWith('application/json')||req.headers.has('content-encoding'))historicalFail('Formato de envío inválido.');
 const reader=req.body?.getReader();if(!reader)historicalFail();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();historicalFail('La carga supera el tamaño permitido.');}chunks.push(value);}}finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;}catch{historicalFail('No se pudo leer la carga.');}
}
