/**
 * One CSV cell. A leading = + - @ tab or CR makes spreadsheets run the cell as
 * a formula (CSV injection), so those get a single-quote prefix; cells with a
 * comma, quote or line break are wrapped in quotes with embedded quotes doubled.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const csvRow = (cells: (string | number)[]) => cells.map(csvCell).join(",");
