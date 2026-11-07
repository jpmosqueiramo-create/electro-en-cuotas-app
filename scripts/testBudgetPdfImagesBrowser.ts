import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {CatalogBrowser} from './helpers/catalogBrowser';
import {budgetFixture} from './helpers/budgetV2Fixtures';
import {toClientBudgetV2} from '../src/lib/budgetV2';
async function main(){
 const image=readFileSync('public/entrega1.jpg'),source=budgetFixture('synthetic-image-budget',6);source.estado='EMITIDO';source.issuedAt='2026-11-07T15:00:00Z';
 const urls=['data:image/jpeg;base64,'+image.toString('base64'),'http://127.0.0.1:9931/photo.jpg','','http://127.0.0.1:9931/missing.jpg','http://127.0.0.1:9931/blocked.jpg','data:image/svg+xml;base64,PHN2Zy8+'];
 const dto={...toClientBudgetV2(source),documentNumber:'P-000789'};
 dto.options=dto.options.map((o,i)=>({...o,imagenUrls:urls[i]?[urls[i]]:[]}));
 const bundle=await build({stdin:{contents:"import {downloadBudgetPdfV2} from './src/lib/budgetV2Pdf'; window.downloadOffer=downloadBudgetPdfV2;",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'});
 const images=createServer((req,res)=>{if(req.url==='/photo.jpg'||req.url==='/blocked.jpg'){if(req.url==='/photo.jpg')res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type','image/jpeg');res.end(image);}else{res.statusCode=404;res.end();}});
 const page=createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);}else{res.setHeader('Content-Type','text/html');res.end('<html><body><button id="download">Descargar presupuesto</button><p id="status"></p><script src="/bundle.js"></script><script>document.querySelector("button").onclick=async()=>{await window.downloadOffer('+JSON.stringify(dto).replace(/</g,'\\u003c')+');document.querySelector("#status").textContent="PDF listo";}</script></body></html>');}});
 await new Promise<void>(r=>images.listen(9931,'127.0.0.1',r));await new Promise<void>(r=>page.listen(3000,'127.0.0.1',r));
 const browser=await CatalogBrowser.open(),dir='/tmp/budget-pdf-images-'+Date.now();mkdirSync(dir,{recursive:true});
 try{
  await browser.command('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dir});await browser.navigate('/');await browser.click('#download');await browser.until('document.querySelector("#status").textContent==="PDF listo"','actual download');
  for(let i=0;i<40&&!readdirSync(dir).some(f=>f.endsWith('.pdf'));i++)await browser.delay(100);
  const files=readdirSync(dir).filter(f=>f.endsWith('.pdf'));assert.equal(files.length,1);
  const bytes=readFileSync(dir+'/'+files[0]),pdf=bytes.toString('latin1');
  assert.equal(bytes.subarray(0,4).toString(),'%PDF');
  const images160=[...pdf.matchAll(/(\d+) 0 obj\n([\s\S]*?)endobj/g)].filter(m=>/\/Subtype \/Image/.test(m[2])&&/\/Width 160\b/.test(m[2])).map(m=>m[1]);
  assert(images160.length>0,'real downloads must embed resized photos');
  const photoNames=[...pdf.matchAll(/\/(I\d+) (\d+) 0 R/g)].filter(m=>images160.includes(m[2])).map(m=>m[1]);
  const draws=[...pdf.matchAll(/\/(I\d+) Do/g)].map(m=>m[1]);
  assert.equal(draws.filter(n=>photoNames.includes(n)).length,2,'embedded and HTTP photos both displayed');
  const pages=(pdf.match(/\/Type \/Page\b/g)||[]).length;
  assert.equal(draws.filter(n=>!photoNames.includes(n)).length,4+pages,'four unavailable photos use brand plus page headers');
  assert(!pdf.includes('SECRET_PROVIDER'));assert(!pdf.includes('factoresSnapshot'));
  console.log('BUDGET_PDF_BROWSER_DATA_HTTP_IMAGES_CORS_BROKEN_MISSING_FALLBACK_DOWNLOAD=PASS file='+dir+'/'+files[0]);
 }finally{await browser.close();await Promise.all([new Promise<void>(r=>images.close(()=>r())),new Promise<void>(r=>page.close(()=>r()))]);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
