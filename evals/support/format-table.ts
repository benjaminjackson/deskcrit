// The plain text table that the agreement harness (EV-4, EV-5) and the compare agreement script
// (EV-9) print. It is string padding only and imports nothing, so both scripts share it.

/** Format rows as a plain text table with columns padded to the widest cell, for the EV-4, EV-5, and EV-9 tables. */
export function formatTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const widths: number[] = [];
  for (const header of headers) {
    widths.push(header.length);
  }
  for (const row of rows) {
    for (let column = 0; column < row.length; column += 1) {
      const cellLength = (row[column] ?? "").length;
      if (cellLength > (widths[column] ?? 0)) {
        widths[column] = cellLength;
      }
    }
  }
  const lines: string[] = [];
  lines.push(formatTableRow(headers, widths));
  for (const row of rows) {
    lines.push(formatTableRow(row, widths));
  }
  return lines.join("\n");
}

/** Pad each cell of one table row to its column width and join the cells with two spaces (EV-4, EV-5, EV-9). */
function formatTableRow(
  cells: readonly string[],
  widths: readonly number[],
): string {
  const padded: string[] = [];
  for (let column = 0; column < cells.length; column += 1) {
    padded.push((cells[column] ?? "").padEnd(widths[column] ?? 0));
  }
  return padded.join("  ").trimEnd();
}
