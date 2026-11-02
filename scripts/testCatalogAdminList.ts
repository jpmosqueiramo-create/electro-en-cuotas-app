import assert from 'node:assert/strict';
import { catalogFilterOptions,catalogListRows,filterSortCatalog } from '../src/lib/catalogAdminList';
import { buildCatalogReferencePrivatePatch,createCatalogReferenceDraft } from '../src/lib/catalogReferenceEditor';
import { parseBulk,prepareBulkRow,exportBulk } from '../src/lib/catalogBulk';
import { prepareCatalogPublication } from '../src/lib/catalogPublicationContent';
const products=[
 {id:'a',nombre:'Álpha 10',marca:'Kanji',tipoProducto:'Lavarropas',costoProveedor:400000,factoresPlanes:{12:1},planesActivos:{12:true}},
 {id:'b',nombre:'Beta',marca:'wanke',tipoProducto:'Secarropas',costoProveedor:100000,factoresPlanes:{12:12},planesActivos:{12:true}},
 {id:'c',nombre:'Alpha 2',cuota12:1,costoProveedor:200000,planesActivos:{12:false}},
 {id:'d',nombre:'Zeta',marca:'KANJI',tipoProducto:'Lavarropas',costoProveedor:0,planesActivos:{12:true}}
];
const before=structuredClone(products),rows=catalogListRows(products),options={search:'',brand:'',kind:'',sort:'name' as const,descending:false};
const ids=(patch:Partial<Parameters<typeof filterSortCatalog>[1]>)=>filterSortCatalog(rows,{...options,...patch}).map(r=>r.product.id);
assert.deepEqual(ids({}),['c','a','b','d']);assert.deepEqual(ids({sort:'cost'}),['b','c','a','d']);assert.deepEqual(ids({sort:'cost',descending:true}),['a','c','b','d']);assert.deepEqual(ids({sort:'installment12'}),['a','b','c','d']);assert.deepEqual(ids({sort:'installment12',descending:true}),['b','a','c','d']);
assert.deepEqual(ids({brand:JSON.stringify('kanji'),kind:JSON.stringify('LAVARROPAS')}),['a','d']);assert.deepEqual(ids({brand:'missing'}),['c']);assert.deepEqual(ids({search:'ALPHA kanji'}),['a']);assert.deepEqual(catalogFilterOptions(rows,'brand'),['Kanji','wanke']);assert.deepEqual(products,before);assert.equal(rows[2].installment12,null);
const draft=createCatalogReferenceDraft({...products[0],descripcion:'Descripción',proveedor:'Proveedor sintético',imagenUrls:['/logo-cuenta-hogar-oficial.png']});draft.marca=' Kanji ';draft.tipoProducto=' Lavarropas ';
const patch=buildCatalogReferencePrivatePatch(draft);assert.equal(patch.marca,'Kanji');assert.equal(patch.tipoProducto,'Lavarropas');assert.equal(createCatalogReferenceDraft(patch).marca,'Kanji');
assert.throws(()=>buildCatalogReferencePrivatePatch({...draft,marca:'x'.repeat(81)}));assert.throws(()=>buildCatalogReferencePrivatePatch({...draft,tipoProducto:'x'.repeat(101)}));
assert.equal(buildCatalogReferencePrivatePatch({...draft,marca:'',tipoProducto:''}).marca,null);
const original={...patch,id:'metadata',stock:[{id:'preserve'}]};const imported=prepareBulkRow(parseBulk('id;costo;marca;tipo_producto\nmetadata;450000;;')[0],original).patch;assert.equal(imported.marca,'Kanji');assert.equal(imported.tipoProducto,'Lavarropas');assert(!('stock' in imported));
const exported=exportBulk([original]);const roundTrip=prepareBulkRow(parseBulk(exported)[0],original).patch;assert.equal(roundTrip.marca,'Kanji');assert.equal(roundTrip.tipoProducto,'Lavarropas');
const dto=JSON.stringify(prepareCatalogPublication('metadata',{...original,marca:'PRIVATE_BRAND',tipoProducto:'PRIVATE_TYPE'}).dto);assert(!dto.includes('PRIVATE_BRAND'));assert(!dto.includes('PRIVATE_TYPE'));
console.log('CATALOG_LIST_SORT_SEARCH_FILTER_MISSING_LAST_METADATA_PRESERVATION_BULK_ROUNDTRIP_PUBLIC_ALLOWLIST=PASS');
