/** Downloads a CSV file built from a header row and a list of string cell rows. */
export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const csv_rows = [headers, ...rows];
  const csv_content = csv_rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv_content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
