/**
 * EXPORTADOR MAESTRO DE PLANILLAS FINANCIERAS (EXCEL & GOOGLE SHEETS)
 * Razón Social: LOOP GESTIÓN INTEGRAL S.R.L. (Marca: Cuenta Hogar)
 */

export interface ExportColumn {
  header: string;
  key: string;
  formatter?: (val: any, row: any) => string;
}

/**
 * Descarga una lista de objetos en formato CSV optimizado para Microsoft Excel (UTF-8 con BOM)
 */
export const descargarCsvExcel = (
  filename: string,
  columns: ExportColumn[],
  data: any[]
) => {
  if (!data || data.length === 0) {
    alert("⚠️ No hay registros disponibles para exportar.");
    return;
  }

  // Header row
  const headersStr = columns.map(c => `"${c.header.replace(/"/g, '""')}"`).join(";");

  // Data rows
  const rowsStr = data.map(row => {
    return columns.map(col => {
      let val = row[col.key];
      if (col.formatter) {
        val = col.formatter(val, row);
      } else if (val === undefined || val === null) {
        val = "";
      }
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(";");
  });

  // UTF-8 BOM byte order mark to ensure Excel reads Spanish characters & accents properly
  const bom = "\uFEFF";
  const csvContent = bom + [headersStr, ...rowsStr].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Copia la tabla al portapapeles en formato tabulado (TSV) para pegar directo en Google Sheets
 */
export const copiarParaGoogleSheets = async (
  columns: ExportColumn[],
  data: any[]
): Promise<boolean> => {
  if (!data || data.length === 0) {
    alert("⚠️ No hay registros disponibles para copiar.");
    return false;
  }

  const headersStr = columns.map(c => c.header).join("\t");
  const rowsStr = data.map(row => {
    return columns.map(col => {
      let val = row[col.key];
      if (col.formatter) {
        val = col.formatter(val, row);
      } else if (val === undefined || val === null) {
        val = "";
      }
      return String(val).replace(/[\r\n\t]/g, " ");
    }).join("\t");
  });

  const tabbedContent = [headersStr, ...rowsStr].join("\n");

  try {
    await navigator.clipboard.writeText(tabbedContent);
    return true;
  } catch (err) {
    console.error("Error al copiar a portapapeles:", err);
    return false;
  }
};
