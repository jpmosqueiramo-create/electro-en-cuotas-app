import assert from 'node:assert/strict';
import { BULK_TEMPLATE, exportBulk, parseBulk, prepareBulkRow } from '../src/lib/catalogBulk';
import { buildCatalogReferencePrivatePatch, createCatalogReferenceDraft } from '../src/lib/catalogReferenceEditor';
const [row]=parseBulk(BULK_TEMPLATE),prepared=prepareBulkRow(row);
assert.equal(prepared.patch.categoriaLogistica,'B');assert.equal(prepared.patch.codigoBarras,null);assert.equal(prepared.patch.costoProveedor,400000);assert.equal(prepared.plans.length,2);assert.equal(prepared.plans[1].cuotaEstimada,100000);
const quoted=parseBulk('sku,nombre,costo,proveedor,cuotas,factor_12\nA,"Nombre, con ""comillas""",400000,Proveedor,12,3');assert.equal(quoted[0].cells.nombre,'Nombre, con "comillas"');
assert.equal(parseBulk('sku\tnombre\tcosto\tproveedor\tcuotas\tfactor_12\nA\tNombre\t400.000,50\tProveedor\t12\t3')[0].cells.costo,'400.000,50');
assert.equal(prepareBulkRow(parseBulk('sku;nombre;costo;proveedor;cuotas;factor_12\nA;Nombre;400.000,50;Proveedor;12;3')[0]).patch.costoProveedor,400000.5);
for(const text of ['', 'sku;costo;costo\nA;1;2','sku;costo;extra\nA;1;x','sku;costo\nA','sku;costo\n"A;1'])assert.throws(()=>parseBulk(text));
for(const value of ['=1+1','-2','1e5','$400000','0','NaN'])assert.throws(()=>prepareBulkRow({...row,cells:{...row.cells,costo:value}}));
assert.throws(()=>prepareBulkRow({...row,cells:{...row.cells,factor_12:''}}));
assert.throws(()=>prepareBulkRow({...row,cells:{...row.cells,cuotas:'12|12'}}));
const original={...prepared.patch,stock:[{id:'unit',fechaIngreso:'2026-01-01'}],imagenUrls:['/photo.jpg'],descripcion:'Preservar',custom:'untouched'};
const patch=prepareBulkRow(parseBulk('id;costo\nexisting;450000')[0],original).patch;
assert.equal(patch.nombre,original.nombre);assert.deepEqual(patch.imagenUrls,original.imagenUrls);assert.equal(patch.descripcion,'Preservar');assert(!('stock' in patch));assert.equal(original.costoProveedor,400000);
const exported=exportBulk([{...original,id:'existing'}]);assert.equal(parseBulk(exported)[0].cells.id,'existing');assert.equal(prepareBulkRow(parseBulk(exported)[0],original).patch.costoProveedor,400000);
assert.match(exportBulk([{...original,id:'existing',nombre:'=FORMULA()'}]),/'=FORMULA/);
assert.throws(()=>parseBulk('sku;costo\n'+Array.from({length:101},(_,i)=>`SKU-${i};100`).join('\n')));
console.log('BULK_CSV_TSV_QUOTES_DECIMALS_VALIDATION_PRESERVATION_EXPORT_FORMULA_GUARD=PASS');

assert.throws(()=>parseBulk('sku;costo;constructor\nA;100;x'));
assert.equal(parseBulk('sku;costo\n\nA;100')[0].row,3);

// The existing individual editor defines the persisted fields; bulk only supplies its category.
assert.deepEqual(Object.keys(prepared.patch).sort(),Object.keys(buildCatalogReferencePrivatePatch(createCatalogReferenceDraft(original))).sort());
assert.equal(patch.categoriaLogistica,'B');
for(const alias of ['categoria_logistica','categoriaLogistica','Categoría de servicios','categoriaServicios','categoria']) {
 for(const category of ['A','b','C','d']) {
  const imported=prepareBulkRow(parseBulk(`id;costo;${alias}\nexisting;400000;${category}`)[0],original);
  assert.equal(imported.patch.categoriaLogistica,category.toUpperCase());
  assert.deepEqual(imported.plans,prepared.plans);
  const roundTrip=exportBulk([{...original,...imported.patch,id:'existing'}]);
  assert.equal(parseBulk(roundTrip)[0].cells.categoria_logistica,category.toUpperCase());
  assert.deepEqual(prepareBulkRow(parseBulk(roundTrip)[0],original).patch,imported.patch);
 }
}
assert.equal(prepareBulkRow(parseBulk('id;costo;categoria_logistica\nexisting;400000;')[0],original).patch.categoriaLogistica,'B');
const legacy={...original};delete (legacy as Partial<typeof original>).categoriaLogistica;
assert.equal(prepareBulkRow(parseBulk('id;costo\nexisting;400000')[0],legacy).patch.categoriaLogistica,null);
assert.equal(prepareBulkRow({...row,cells:{...row.cells,categoria_logistica:''}}).patch.categoriaLogistica,null);
for(const value of ['E','Mediano','A|B','=B','0'])assert.throws(()=>prepareBulkRow({...row,cells:{...row.cells,categoria_logistica:value}}),/Categoría de servicios/);
assert.throws(()=>parseBulk('id;costo;categoria;categoriaLogistica\nexisting;400000;A;B'),/repetidas/);
for(const column of ['honorarios','gestion','entrega','asistencia','cft','tarifa_categoria'])assert.throws(()=>parseBulk(`id;costo;${column}\nexisting;400000;10`),/Columna desconocida/);
console.log('BULK_EXISTING_SERVICE_CATEGORY_TEMPLATE_ALIASES_VALIDATION_PRESERVATION_ROUNDTRIP_SAME_PRODUCT_SCHEMA=PASS');
