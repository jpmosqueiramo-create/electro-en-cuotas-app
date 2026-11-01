import assert from 'node:assert/strict';
import readXlsxFile from 'read-excel-file/node';
import { BULK_TEMPLATE, parseBulk, prepareBulkRow } from '../src/lib/catalogBulk';
import { catalogSheetText } from '../src/lib/catalogSpreadsheet';

async function main(){
 const sheets=await readXlsxFile('public/plantilla-catalogo.xlsx');
 assert.equal(sheets.length,1);
 const parsed=parseBulk(catalogSheetText(sheets[0]));
 assert.deepEqual(Object.keys(parsed[0].cells),Object.keys(parseBulk(BULK_TEMPLATE)[0].cells));
 assert.deepEqual(prepareBulkRow(parsed[0]).patch,prepareBulkRow(parseBulk(BULK_TEMPLATE)[0]).patch);
 const data=[['sku','nombre','costo','proveedor','cuotas','factor_12','codigo_barras'],['001','Nombre; con "comillas"',400000.5,'Proveedor','12',3,'001234'],['002','Otro',200000,'Proveedor','12',3],[]];
 const rows=parseBulk(catalogSheetText({sheet:'Productos',data}));
 assert.equal(rows.length,2);assert.equal(rows[0].cells.sku,'001');assert.equal(rows[0].cells.codigo_barras,'001234');assert.equal(rows[0].cells.nombre,'Nombre; con "comillas"');assert.equal(prepareBulkRow(rows[0]).patch.costoProveedor,400000.5);assert.equal(rows[1].cells.codigo_barras,'');
 for(const value of [true,new Date(),NaN,Infinity,{}])assert.throws(()=>catalogSheetText({sheet:'P',data:[['sku','costo'],['X',value]]}),/texto o números/);
 assert.throws(()=>catalogSheetText({sheet:'P',data:[['sku','costo','nuevo_campo'],['X',1,'x']]}),/Columna desconocida/);
 assert.throws(()=>catalogSheetText({sheet:'P',data:[['sku','costo'],...Array.from({length:101},(_,i)=>[String(i),1])]}),/100/);
 assert.throws(()=>prepareBulkRow(parseBulk(catalogSheetText({sheet:'P',data:[['sku','costo'],['X','=1+1']]}))[0]));
 console.log('XLSX_TEMPLATE_REAL_READ_SAME_FIELDS_TYPED_DECIMALS_IDENTIFIERS_QUOTES_PADDING_LIMITS_INVALID_TYPES=PASS');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
