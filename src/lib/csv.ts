/**
 * CSV export.
 *
 * Everything in the studio can be pulled out as a spreadsheet — the dashboard
 * is for running the business day to day, but accounts, reporting and anything
 * she wants to hand to someone else belong in Excel or Google Sheets.
 */

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  // Excel treats a leading =, +, - or @ as a formula. Prefix with a quote so a
  // value like "-5" or an address starting with "=" can never be executed.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv<T>(rows: readonly T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows.map((row) =>
    columns.map((c) => escapeCell(c.value(row))).join(',')
  );
  // A BOM so Excel opens UTF-8 correctly — otherwise accented names break.
  return `﻿${[header, ...body].join('\r\n')}`;
}

export function downloadCsv<T>(
  filename: string,
  rows: readonly T[],
  columns: CsvColumn<T>[]
): void {
  const blob = new Blob([toCsv(rows, columns)], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
