import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {budgetFixture} from './helpers/budgetV2Fixtures';
import {toClientBudgetV2} from '../src/lib/budgetV2';
import {budgetPdfFilename,budgetWhatsappMessage,budgetWhatsappPhone,budgetWhatsappUrl} from '../src/lib/budgetSharingV2';
import {issuedPdfFilename} from '../src/lib/documentFilenames';
import {renderBudgetPdfV2} from '../src/lib/budgetV2Pdf';
const original=budgetFixture('094e2bbf-f4c6-4ddd-908d-03c01f5230fa');original.estado='EMITIDO';original.issuedAt='2026-10-30T02:00:00.000Z';original.clienteSnapshot={nombre:'María Pérez',dni:'12345678',cuil:'20123456789',whatsapp:'1169747983',localidad:'Localidad privada'};
const before=JSON.stringify(original),dto={...toClientBudgetV2(original),documentNumber:'P-000123'},message=budgetWhatsappMessage(dto),filename=budgetPdfFilename(dto);
assert.equal(filename,'Presupuesto-P-000123-Maria-Perez-Referencia-1-y-1-alternativas-v1.pdf');
assert.ok(filename.length<200);assert.ok(!/[\\/:*?"<>|]/.test(filename));
for(const option of dto.options){assert.ok(message.includes(option.nombre));assert.ok(message.includes(option.descripcion));for(const plan of option.planesOfrecidos)assert.ok(message.includes(`${plan.cuotas} cuotas estimadas de`));}
assert.equal((message.match(/Total estimado del plan:/g)??[]).length,4);assert.ok(message.includes('29/10/2026'));assert.ok(!message.includes('2026-10-30T'));
for(const secret of ['SECRET_PROVIDER','SECRET_SKU','SECRET_EAN','12345678','20123456789','1169747983','Localidad privada','factoresSnapshot','costoProveedorSnapshot'])assert.ok(!message.includes(secret),secret);
for(const raw of ['1169747983','(11) 6974-7983','01169747983','541169747983','+54 11 6974 7983','5491169747983','+54 9 11 6974 7983','005491169747983'])assert.equal(budgetWhatsappPhone(raw),'5491169747983',raw);
for(const raw of ['', '12345','1169747983?x=1','11/69747983','5491169747983999'])assert.equal(budgetWhatsappPhone(raw),null);
const link=new URL(budgetWhatsappUrl(dto.cliente.whatsapp,message)!);assert.equal(link.pathname,'/5491169747983');assert.equal(link.searchParams.get('text'),message);assert.equal(budgetWhatsappUrl('',message),null);
const unsafe={...dto,cliente:{...dto.cliente,nombre:'../../Cliente <demo> / inválido'},options:[{...dto.options[0],nombre:'Horno / cocina : 20"?'}]};assert.ok(!/[\\/:*?"<>|]/.test(budgetPdfFilename(unsafe)));
assert.notEqual(budgetPdfFilename({...dto,version:2}),filename);assert.notEqual(budgetPdfFilename({...dto,documentNumber:'P-000124'}),filename);assert.equal(JSON.stringify(original),before);
writeFileSync('/tmp/budget-sharing-synthetic.pdf',Buffer.from(renderBudgetPdfV2({...dto,options:[dto.options[0]]}).output('arraybuffer')));
console.log('BUDGET_SHARING_FILENAMES_FULL_COMMERCIAL_MESSAGE_PHONE_TARGET_PRIVACY_SNAPSHOTS=PASS');

assert.equal(issuedPdfFilename('MANDATE','CH-000123','María Pérez','Horno / microondas'),'Contrato-CH-000123-Maria-Perez-Horno-microondas.pdf');
assert.equal(issuedPdfFilename('PAGARE','CH-000123','María Pérez','Horno',2),'Pagare-CH-000123-Maria-Perez-Horno-r2.pdf');
assert.throws(()=>issuedPdfFilename('MANDATE','../bad','Cliente','Producto'));
assert.throws(()=>budgetPdfFilename(toClientBudgetV2(original)));
