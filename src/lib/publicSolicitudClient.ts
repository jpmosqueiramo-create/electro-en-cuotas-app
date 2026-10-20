import type { PublicSolicitudInput } from "./publicSolicitud";
type Pending={id:string;payload:PublicSolicitudInput};
/** sessionStorage stores only an opaque id and digest, never personal form values. */
export function createPublicSolicitudSender(channel: string, transport: typeof fetch = fetch) {
  let pending: Pending|null=null,busy=false;
  return async (payload: PublicSolicitudInput) => {
    if(busy)throw Error('Ya estamos registrando esta solicitud.');
    busy=true;
    try {
      const json=JSON.stringify(payload);
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(json)))).map(n=>n.toString(16).padStart(2,'0')).join('');
      const key=`public-solicitud:${channel}:${digest}`;
      let saved: string|null=null;
      try{saved=sessionStorage.getItem(key);}catch{/* In-memory retry still works. */}
      if(!pending||JSON.stringify(pending.payload)!==json)pending={id:saved||crypto.randomUUID(),payload};
      try{sessionStorage.setItem(key,pending.id);}catch{/* No personal data stored. */}
      const response=await transport('/api/public/solicitudes',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({submissionId:pending.id,payload:pending.payload})}).catch(()=>{throw Error('No pudimos confirmar el registro. Revisá tu conexión y reintentá.');});
      const result=await response.json().catch(()=>{throw Error('No pudimos confirmar el registro. Reintentá.');});
      if(!response.ok||result.persisted!==true||result.sourceCollection!=='solicitudes_cuenta'||result.id!==`web_${pending.id}`)throw Error(result.error||'No pudimos confirmar el registro. Reintentá.');
      return result as {id:string;persisted:true;notificationPending:boolean};
    } finally{busy=false;}
  };
}
