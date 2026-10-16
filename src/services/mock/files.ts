/**
 * Locally generated files for export, template and report downloads.
 *
 * The backend produced .xlsx workbooks; the prototype produces CSV, which every
 * spreadsheet application opens, so download buttons still hand the tester a real
 * file containing the rows they are looking at.
 */

type Cell = string | number | boolean | null | undefined;

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds a CSV blob. A UTF-8 BOM keeps Khmer text intact when opened in Excel. */
export function csvBlob(headers: readonly string[], rows: readonly (readonly Cell[])[]): Blob {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
}

/** Turns an array of flat objects into a CSV blob using `columns` as the header order. */
export function csvFromRecords<T extends Record<string, unknown>>(
  records: readonly T[],
  columns: readonly { key: keyof T & string; label: string }[]
): Blob {
  return csvBlob(
    columns.map((c) => c.label),
    records.map((record) => columns.map((c) => record[c.key] as Cell))
  );
}

/** Today's date as `YYYYMMDD`, for file names. */
export function fileStamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

/** A small placeholder PDF so document "downloads" open in a viewer. */
export function pdfBlob(title: string, lines: readonly string[] = []): Blob {
  const text = [title, ...lines]
    .map((line, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 56 ${760 - i * 22} Td (${line.replace(/[()\\]/g, '')}) Tj ET`)
    .join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([body], { type: 'application/pdf' });
}
