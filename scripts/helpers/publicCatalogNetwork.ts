import assert from "node:assert/strict";
import { publicSensitivePaths } from "./catalogC4Fixtures";

export async function observePublicCatalogNetwork() {
  const targets=await(await fetch("http://127.0.0.1:9227/json/list")).json() as {type:string;webSocketDebuggerUrl:string}[];
  const socket=new WebSocket(targets.find(target=>target.type==="page")!.webSocketDebuggerUrl);
  await new Promise<void>((resolve,reject)=>{socket.addEventListener("open",()=>resolve(),{once:true});socket.addEventListener("error",()=>reject(new Error("NETWORK_AUDIT_CONNECT")),{once:true});});
  let sequence=0,productsRequests=0,firestoreQueries=0;const pending=new Map<number,{resolve:(value:Record<string,unknown>)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  const bodies:unknown[]=[];const errors:unknown[]=[];const tasks:Promise<void>[]=[];
  const command=(method:string,params:Record<string,unknown>={})=>new Promise<Record<string,unknown>>((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`NETWORK_AUDIT_TIMEOUT ${method}`));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  function inspectRequest(text:string){let decoded=text;try{decoded=decodeURIComponent(text);}catch{} if(/collectionId|structuredQuery|documents\//.test(decoded))firestoreQueries++;if(/(?:["/])productos(?:["/])/.test(decoded))productsRequests++;}
  socket.addEventListener("message",event=>{
    const message=JSON.parse(String(event.data));
    if(message.id){const request=pending.get(message.id);if(request){clearTimeout(request.timer);pending.delete(message.id);if(message.error)request.reject(new Error(message.error.message));else request.resolve(message.result??{});}return;}
    const params=message.params??{};
    if(message.method==="Network.requestWillBeSent"){
      const request=params.request;

      if(request&&/firestore|127.0.0.1:8080/.test(request.url)) {
        inspectRequest(request.url+" "+(request.postData??""));
        if(request.hasPostData&&!request.postData)tasks.push(command("Network.getRequestPostData",{requestId:params.requestId}).then(result=>{inspectRequest(String(result.postData));}).catch(error=>{errors.push(error);}));
      }
    }
    if(message.method==="Fetch.requestPaused")tasks.push((async()=>{
      try {
        if(!params.responseErrorReason){
          const result=await command("Fetch.getResponseBody",{requestId:params.requestId});
          const text=result.base64Encoded?Buffer.from(String(result.body),"base64").toString():String(result.body);
          const body:unknown=JSON.parse(text);assert.deepEqual(publicSensitivePaths(body),[]);bodies.push(body);
        }
      }catch(error){errors.push(error);}
      finally{await command("Fetch.continueRequest",{requestId:params.requestId});}
    })().catch(error=>{errors.push(error);}));
  });
  await command("Network.enable",{maxTotalBufferSize:50000000,maxResourceBufferSize:5000000,maxPostDataSize:5000000,enableDurableMessages:true});
  // La respuesta queda retenida por CDP hasta auditar su body: no puede
  // perderse por navegación ni entregarse al consumidor sin inspección.
  await command("Fetch.enable",{patterns:[{urlPattern:"http://localhost:3000/api/catalogo*",requestStage:"Response"}]});
  async function flush(){await Promise.all(tasks);assert.deepEqual(errors,[]);}

  return {
    flush,
    async verify(){await flush();assert.ok(bodies.length>=8,"Respuestas HTTP públicas reales auditadas");assert.ok(firestoreQueries>0,"Auditoría también observa tráfico Firestore de roles");assert.equal(productsRequests,0);for(const body of bodies)assert.deepEqual(publicSensitivePaths(body),[]);console.log(`NETWORK_SENSITIVE_FIELD_LEAKS = 0; BROWSER_PRODUCTS_REQUESTS = 0; PUBLIC_API_RESPONSES_AUDITED = ${bodies.length}`);},
    close(){for(const request of pending.values()){clearTimeout(request.timer);request.reject(new Error("AUDIT_CLOSED"));}pending.clear();socket.close();}
  };
}
