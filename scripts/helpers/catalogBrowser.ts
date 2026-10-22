import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveChrome } from './resolveChrome';

export class CatalogBrowser {
  private socket!: WebSocket;
  private chrome!: ChildProcess;
  private profile='';
  private sequence=0;
  private pending=new Map<number,{resolve:(value:Record<string,unknown>)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  readonly externalFirebase:string[]=[];
  readonly publishBodies:unknown[]=[];
  storageWrites=0;
  static async open() {
    const browser=new CatalogBrowser();
    browser.profile=mkdtempSync(join(tmpdir(),'catalog-c3-browser-'));
    browser.chrome=spawn(resolveChrome(),['--headless=new',`--user-data-dir=${browser.profile}`,'--remote-debugging-port=9227','--disable-gpu','--no-first-run','--no-default-browser-check',...(process.platform==='linux'&&process.getuid?.()===0?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
    try {
    let target:{webSocketDebuggerUrl:string}|undefined;
    for(let i=0;i<300&&!target;i++) {
      try { const list=await(await fetch('http://127.0.0.1:9227/json/list')).json() as {type:string;webSocketDebuggerUrl:string}[]; target=list.find(item=>item.type==='page'); } catch { await browser.delay(200); }
    }
    assert.ok(target,'Chrome CDP target');
    browser.socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise<void>((resolve,reject)=>{browser.socket.addEventListener('open',()=>resolve(),{once:true});browser.socket.addEventListener('error',()=>reject(new Error('CDP_CONNECT_FAILED')),{once:true});});
    browser.socket.addEventListener('message',event=>{
      const message=JSON.parse(String(event.data)) as {id?:number;result?:Record<string,unknown>;error?:{message:string};method?:string;params?:{request?:{url:string;method:string;postData?:string}}};
      if(message.id) {const entry=browser.pending.get(message.id);if(entry){clearTimeout(entry.timer);browser.pending.delete(message.id);if(message.error)entry.reject(new Error(message.error.message));else entry.resolve(message.result??{});}}
      const request=message.params?.request;
      if(message.method==='Network.requestWillBeSent'&&request){
        const url=new URL(request.url);
        if(/googleapis\.com$/.test(url.hostname)&&/firestore|identitytoolkit|securetoken|storage/.test(url.hostname))browser.externalFirebase.push(url.hostname);
        if(/storage/.test(url.hostname)&&['POST','PUT','PATCH','DELETE'].includes(request.method))browser.storageWrites++;
        if(url.pathname.endsWith('/publicar')&&request.postData)browser.publishBodies.push(JSON.parse(request.postData));
      }
    });
    await browser.command('Page.enable');await browser.command('Network.enable');
    return browser;
    } catch (error) { await browser.close(); throw error; }
  }
  delay(ms:number){return new Promise(resolve=>setTimeout(resolve,ms));}
  command(method:string,params:Record<string,unknown>={}):Promise<Record<string,unknown>> {
    const id=++this.sequence;
    const promise=new Promise<Record<string,unknown>>((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout ${method}`));},45000);this.pending.set(id,{resolve,reject,timer});});
    this.socket.send(JSON.stringify({id,method,params}));return promise;
  }
  async evaluate<T=unknown>(expression:string):Promise<T>{
    const deadline=Date.now()+45000;
    while(Date.now()<deadline){
      const response=await this.command('Runtime.evaluate',{expression:`(async()=>{if(document.readyState==='loading'||!document.body||!document.body.innerText.trim())return {ready:false};return {ready:true,value:await (${expression})};})()`,awaitPromise:true,returnByValue:true});
      if(response.exceptionDetails)throw new Error(`Evaluation failed ${JSON.stringify(response.exceptionDetails)}`);
      const result=(response.result as {value:{ready:boolean;value:T}}).value;
      if(result.ready)return result.value;
      await this.delay(100);
    }
    throw new Error('DOM_NOT_READY');
  }
  async until(expression:string,label:string){const deadline=Date.now()+45000;while(Date.now()<deadline){if(await this.evaluate(expression))return;await this.delay(150);}throw new Error(`TIMEOUT ${label}`);}
  async navigate(path:string){const result=await this.command('Page.navigate',{url:`http://localhost:3000${path}`});assert.ok(!result.errorText);await this.until("document.readyState!=='loading'&&!!document.body",`navigate ${path}`);}
  async click(selector:string){assert.ok(await this.evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element||element.disabled)return false;element.scrollIntoView({block:'center'});element.click();return true;})()`),selector);}
  async clickText(text:string,scope='document'){assert.ok(await this.evaluate(`(()=>{const button=[...${scope}.querySelectorAll('button')].find(item=>item.textContent.trim()===${JSON.stringify(text)}&&item.getClientRects().length>0);if(!button||button.disabled)return false;button.scrollIntoView({block:'center'});button.click();return true;})()`),text);}
  async change(selector:string,value:string){await this.evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)throw Error('Missing input');const proto=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event('input',{bubbles:true}));})()`);}
  async field(label:string,value:string){await this.evaluate(`(()=>{const item=[...document.querySelectorAll('label')].find(element=>element.querySelector(':scope > span')?.textContent===${JSON.stringify(label)});const element=item?.querySelector('input,textarea');if(!element)throw Error('Missing field '+${JSON.stringify(label)});const proto=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event('input',{bubbles:true}));})()`);}
  async overflow(label:string){assert.ok(await this.evaluate('Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)<=innerWidth+2'),`Overflow: ${label}`);}
  async screenshot(name:string){mkdirSync('/tmp/cuenta-hogar-catalogo-c3',{recursive:true});await this.evaluate('document.fonts.ready.then(()=>true)');const result=await this.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join('/tmp/cuenta-hogar-catalogo-c3',name),Buffer.from(result.data as string,'base64'));}
  async close(){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('CDP_CLOSED'));}this.pending.clear();this.socket?.close();this.chrome?.kill('SIGTERM');if(this.chrome&&this.chrome.exitCode===null&&this.chrome.signalCode===null)await new Promise<void>(resolve=>this.chrome.once('close',()=>resolve()));if(this.profile)rmSync(this.profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
}
