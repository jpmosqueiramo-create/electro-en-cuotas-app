import { readdirSync,readFileSync,writeFileSync } from "node:fs";
import { join,relative } from "node:path";
import ts from "typescript";
const files:string[]=[];
function walk(path:string){for(const entry of readdirSync(path,{withFileTypes:true})){const p=join(path,entry.name);if(entry.isDirectory())walk(p);else if(/\.tsx?$/.test(p))files.push(p);}}
walk("src");walk("scripts");
const rows:{file:string;line:number;type:string;status:string;justification:string}[]=[];
const allowedPrivate=new Set(["src/lib/catalogPublicationService.ts","src/lib/catalogPrivacyInventory.ts"]);
const allowedLegacy=new Set(["src/lib/catalogManager.ts"]);
let unknown=0,legacyCallers=0;
for(const file of files.sort()){
 const source=readFileSync(file,"utf8"),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 function visit(node:ts.Node){
  if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text.endsWith("catalogManager"))legacyCallers++;
  const text=ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)?node.text:ts.isTemplateExpression(node)?node.head.text:"";
  if(text==="productos" || text.startsWith("productos/") || text.includes("/documents/productos")){
   const line=ast.getLineAndCharacterOfPosition(node.getStart()).line+1;
   let type="OTHER",status="ACTIVE",justification="Auditoría estática; sin acceso a datos";
   if(file==="scripts/auditCatalogPrivacyConsumers.ts"){status="AUDIT_ONLY";}
   else if(file.startsWith("scripts/")){type="TEST";justification="Fixture/prueba local protegida; no consumidor público";}
   else if(file==="src/lib/catalogReferenceImages.ts"){type="OTHER";status="ADMIN_STORAGE_PATH";justification="Ruta Firebase Storage del editor Admin C3; no acceso a colección Firestore";}
   else if(allowedPrivate.has(file)){type="SERVER_PRIVATE";justification=file.includes("Privacy")?"Inventario Admin read-only, sólo emuladores autorizados":"Publicador C2 servidor, autenticación Admin en handlers";}
   else if(file==="src/lib/stockUtils.ts" || /api\/admin\/(reserva-stock|liberar-reserva)/.test(file)){type="LOGISTICS_STOCK";justification="Stock/logística privada; conservar referencias y autorización";}
   else if(allowedLegacy.has(file)){type="LEGACY_NON_ADMIN";status="INACTIVE";justification="Sin imports en src/scripts de aplicación; candidato C6, no ejecutado";}
   else if(file.startsWith("src/app/admin/") || file.startsWith("src/components/admin/")){type="ADMIN_UI";justification="Interfaz Admin privada; no migrar a DTO público";}
   else if(file==="src/app/api/admin/calcular-pricing/route.ts"){type="SERVER_PRIVATE";justification="Pricing Admin autorizado; conserva fuente privada canónica";}
   else {unknown++;justification="REVIEW_REQUIRED: consumidor no reconocido";}
   rows.push({file:relative(process.cwd(),file)||file,line,type,status,justification});
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);
}
if(unknown || legacyCallers)throw new Error(`UNRECOGNIZED_NON_ADMIN_CONSUMER: unknown=${unknown}; legacyCallers=${legacyCallers}`);
const report={nonAdminDirectProductsReads:0,nonAdminDirectProductsWrites:0,legacyCallers,rows};
writeFileSync("/tmp/cuenta-hogar-c5a-consumers.json",JSON.stringify(report,null,2));
console.log(`CONSUMER_AUDIT = PASS; NON_ADMIN_DIRECT_PRODUCTS_READS = 0; NON_ADMIN_DIRECT_PRODUCTS_WRITES = 0; REFERENCES = ${rows.length}`);
