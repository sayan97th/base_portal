export type SpreadsheetCell = string | number | null;

export interface SpreadsheetSheet {
  /** Excel limits sheet names to 31 characters, longer names are cut. */
  name: string;
  rows: SpreadsheetCell[][];
  /** Column widths in characters, one entry per column. */
  column_widths?: number[];
}

/**
 * Downloads an Excel (.xlsx) workbook. The xlsx library is loaded on demand
 * so it only weighs on the pages where someone actually exports.
 */
export async function downloadXlsx(filename: string, sheets: SpreadsheetSheet[]): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows.map((row) => row.map((cell) => cell ?? "")));
    if (sheet.column_widths) {
      worksheet["!cols"] = sheet.column_widths.map((width) => ({ wch: width }));
    }
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  });

  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
