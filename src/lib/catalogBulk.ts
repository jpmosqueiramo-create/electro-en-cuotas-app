import { buildCatalogReferencePrivatePatch, createCatalogReferenceDraft } from './catalogReferenceEditor';
import { generarPlanesPublicablesCatalogo } from './catalogReference';
import { isLoopCategory, type LoopCategory } from './loopServiceTariffs';
export class BulkInputError extends Error {}
export const BULK_LIMIT = 100;
export const BULK_TEMPLATE = 'id;sku;nombre;costo;proveedor;categoria_logistica;cuotas;factor_8;factor_12;descripcion;codigo_barras\n;EJEMPLO-01;Producto de ejemplo;400000;Proveedor de ejemplo;B;8|12;2,31;3;Descripción opcional;\n';
export interface BulkRecord { row: number; cells: Record<string, string> }
export interface BulkProduct { id: string; data: Record<string, unknown>; version: string }
export interface BulkRow { row: number; id: string; action: 'CREATE' | 'UPDATE'; name: string; previousCost: number | null; cost: number; supplier: string; categoriaLogistica: LoopCategory | null; plans: { cuotas: number; cuotaEstimada: number; factor: number }[]; errors: string[] }
export const normalizeSku = (sku: string) => sku.trim().normalize('NFKC').toLocaleUpperCase('es-AR');
const header = (s: string) => s.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[ _-]/g, '');
const aliases: Record<string,string> = { id:'id', sku:'sku', skuinterno:'sku', nombre:'nombre', costo:'costo', costoproveedor:'costo', proveedor:'proveedor', cuotas:'cuotas', cuotasdisponibles:'cuotas', categoria:'categoria_logistica', categorialogistica:'categoria_logistica', categoriaservicios:'categoria_logistica', categoriadeservicios:'categoria_logistica', descripcion:'descripcion', codigobarras:'codigo_barras' };
/** CSV quoted cells/newlines or clipboard TSV; never evaluates spreadsheet formulas. */
export function parseBulk(text: string): BulkRecord[] {
  if (typeof text !== 'string' || text.length > 200000 || !text.trim()) throw new BulkInputError('Pegá una planilla de hasta 100 productos (200 KB de texto).');
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const first = text.split('\n')[0]; const delimiter = first.includes('\t') ? '\t' : first.includes(';') ? ';' : ',';
  const rows:string[][]=[],rowNumbers:number[]=[]; let sourceRow=1,row:string[]=[],cell='',quoted=false,closed=false;
  for(let i=0;i<=text.length;i++) {
    const c=text[i]??'\n';
    if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else if(i===text.length)throw new BulkInputError('Hay comillas sin cerrar en la planilla.');else cell+=c;continue;}
    if(c==='"'&&!cell&&!closed){quoted=true;continue;}
    if(c===delimiter||c==='\n'){row.push(cell.trim());cell='';closed=false;if(c==='\n'){if(row.some(Boolean)){rows.push(row);rowNumbers.push(sourceRow);}sourceRow++;row=[];}continue;}
    if(closed&&c.trim())throw new BulkInputError('Texto inesperado después de una celda entre comillas.');
    if(!closed)cell+=c;
  }
  if(rows.length<2||rows.length>BULK_LIMIT+1)throw new BulkInputError('Incluí encabezados y entre 1 y 100 productos.');
  const columns=rows.shift()!.map(raw=>{const key=header(raw),factor=/^factor(1[0-8]|[1-9])$/.exec(key);const name=(Object.hasOwn(aliases,key)?aliases[key]:undefined)??(factor?`factor_${factor[1]}`:null);if(!name)throw new BulkInputError(`Columna desconocida: ${raw}. Usá la plantilla.`);return name;});
  if(new Set(columns).size!==columns.length)throw new BulkInputError('Hay columnas repetidas.');
  if(!columns.includes('costo')||!columns.some(c=>c==='id'||c==='sku'))throw new BulkInputError('Incluí costo y al menos una columna id o sku.');
  rowNumbers.shift();
  return rows.map((values,i)=>{if(values.length!==columns.length)throw new BulkInputError(`Fila ${rowNumbers[i]}: cantidad de columnas incorrecta.`);return{row:rowNumbers[i],cells:Object.fromEntries(columns.map((c,j)=>[c,values[j]]))};});
}
function numberCell(raw:string, cost=false) {
  let s=raw.trim();
  if(cost&&/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s))s=s.replace(/\./g,'');
  if(!/^\d+(?:[.,]\d+)?$/.test(s))throw Error('Usá números positivos sin símbolo $, porcentajes ni fórmulas.');
  if(cost&&/[.,]\d{3,}$/.test(s))throw Error('El costo admite hasta dos decimales.');
  const n=Number(s.replace(',','.'));if(!Number.isFinite(n)||n<=0||!Number.isSafeInteger(Math.round(n*100)))throw Error('Número fuera del rango permitido.');return n;
}
export function prepareBulkRow(record:BulkRecord, original?:Record<string,unknown>) {
  const c=record.cells,draft=createCatalogReferenceDraft(original);
  if(c.nombre)draft.nombre=c.nombre;
  if(c.sku)draft.skuInterno=c.sku;
  if(c.proveedor)draft.proveedor=c.proveedor;
  if(c.descripcion)draft.descripcion=c.descripcion;
  if(c.codigo_barras)draft.codigoBarras=c.codigo_barras;
  if(c.categoria_logistica){
    const category=c.categoria_logistica.trim().toUpperCase();
    if(!isLoopCategory(category))throw Error('Categoría de servicios: usá A, B, C o D.');
    draft.categoriaLogistica=category;
  }
  draft.costoProveedor=String(numberCell(c.costo,true));
  if(!draft.proveedor.trim())throw Error('Completá el proveedor.');
  if(!original&&!c.sku)throw Error('Una referencia nueva necesita SKU.');
  if(c.cuotas){const terms=c.cuotas.split(/[|, ]+/).filter(Boolean);if(!terms.length||terms.some(n=>!/^\d+$/.test(n)||Number(n)<1||Number(n)>18)||new Set(terms.map(Number)).size!==terms.length)throw Error('Cuotas: indicá plazos entre 1 y 18 separados por |, sin repetir.');for(let n=1;n<=18;n++)draft.planesActivos[n]=terms.map(Number).includes(n);}
  for(let n=1;n<=18;n++){const raw=c[`factor_${n}`];if(raw)draft.factoresPlanes[n]=numberCell(raw);else if(draft.planesActivos[n]&&(!original||!original.factoresPlanes||!(String(n) in Object(original.factoresPlanes))))throw Error(`Completá factor_${n}; no se asumirá un factor para ese plan.`);}
  const patch=buildCatalogReferencePrivatePatch(draft,original);
  const plans=generarPlanesPublicablesCatalogo({costoProveedor:Number(draft.costoProveedor),factoresPlanes:draft.factoresPlanes,planesActivos:draft.planesActivos}).map(p=>({cuotas:p.cuotas,cuotaEstimada:p.cuotaExhibidaCatalogo,factor:p.factorInterno}));
  if(!plans.length)throw Error('Seleccioná al menos un plazo en cuotas.');
  return {patch,plans};
}
const escapeCsv=(s:unknown)=>{const value=String(s??'');const safe=/^(?:\s*[=+@-]|[\t\r\n])/.test(value)?`'${value}`:value;return `"${safe.replace(/"/g,'""')}"`;};
export function exportBulk(products: readonly {id:string;[key:string]:unknown}[]) {
  const terms=Array.from({length:18},(_,i)=>i+1).filter(n=>products.some(p=>Object(p.planesActivos)[n]===true));
  const columns=['id','sku','nombre','costo','proveedor','categoria_logistica','cuotas',...terms.map(n=>`factor_${n}`),'descripcion','codigo_barras'];
  return '\uFEFF'+[columns,...products.map(p=>{const d=createCatalogReferenceDraft(p);return [p.id,d.skuInterno,d.nombre,d.costoProveedor,d.proveedor,d.categoriaLogistica,Object.entries(d.planesActivos).filter(([,active])=>active).map(([n])=>n).join('|'),...terms.map(n=>d.factoresPlanes[n]),d.descripcion,d.codigoBarras];})].map(row=>row.map(escapeCsv).join(';')).join('\r\n');
}
