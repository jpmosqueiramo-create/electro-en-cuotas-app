import assert from 'node:assert/strict';
import type { CatalogBrowser } from './catalogBrowser';
/** Follow the accepted-budget link and explicitly prepare a missing draft in DEMO UI. */
export async function openOperationSection(browser:CatalogBrowser,budgetId:string,section:string) {
  const path=`/admin/operaciones/${encodeURIComponent(budgetId)}/1`;
  const link=`document.querySelector('a[href='+${JSON.stringify(JSON.stringify(path))}+']')`;
  assert.equal(await browser.evaluate(`${link}?.textContent`),'Abrir ficha de operación');
  await browser.navigate(path);
  await browser.until("!!document.querySelector('[data-testid=operation-unified-workspace]')",'operation workspace');
  await browser.clickText('Contrato');
  await browser.until("!!document.querySelector('[data-testid=contract-composer]')||[...document.querySelectorAll('button')].some(b=>b.textContent==='Preparar borrador contractual')",'contract loaded');
  if(await browser.evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Preparar borrador contractual')"))await browser.clickText('Preparar borrador contractual');
  await browser.until("!!document.querySelector('[data-testid=contract-composer]')",'explicit draft');
  if(section!=='Contrato')await browser.clickText(section);
  if(section==='Cuotas y pagos')await browser.until("!!document.querySelector('[data-testid=financial-v2]')",'financial section');
}
