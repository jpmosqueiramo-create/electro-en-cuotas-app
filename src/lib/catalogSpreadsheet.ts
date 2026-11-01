import { BULK_LIMIT, parseBulk } from './catalogBulk';

export interface CatalogSheet { sheet: string; data: unknown[][] }

/** Normalize Excel cells into the existing CSV protocol; persistence stays unchanged. */
export function catalogSheetText(sheet: CatalogSheet): string {
  const rows = [...sheet.data];
  while (rows.length && !rows.at(-1)!.some(cell => cell !== null && cell !== undefined && cell !== '')) rows.pop();
  const width = rows[0]?.length ?? 0;
  if (rows.length > BULK_LIMIT + 1) throw Error(`Máximo ${BULK_LIMIT} productos por carga.`);
  const text = rows.map((row, index) => Array.from({length: Math.max(width, row.length)}, (_, column) => {
    const cell = row[column];
    if (cell === null || cell === undefined) return '';
    if (typeof cell !== 'string' && !(typeof cell === 'number' && Number.isFinite(cell))) {
      throw Error(`Hoja ${sheet.sheet}, fila ${index + 1}, columna ${column + 1}: usá texto o números, sin fechas ni valores lógicos.`);
    }
    return '"' + String(cell).replace(/"/g, '""') + '"';
  }).join(';')).join('\n');
  // Reuse the header, row width, size and column allowlist validation.
  parseBulk(text);
  return text;
}

export async function readCatalogExcel(file: File): Promise<CatalogSheet[]> {
  try {
    const { default: readXlsxFile } = await import('read-excel-file/browser');
    const sheets = await readXlsxFile(await file.arrayBuffer());
    if (!sheets.length) throw Error('empty');
    return sheets;
  } catch {
    throw Error('No se pudo leer el Excel. Guardalo como .xlsx y volvé a cargarlo, o usá CSV.');
  }
}
